import { BadRequestException, Injectable } from '@nestjs/common';
import { ClickhouseService } from '../telemetry/services/clickhouse.service';
import type { TenantScope } from '../auth/auth.types';
import type { MonitorDto } from '../auth/dto/monitor.dto';
import { logSearch, normalizeLogRule, numericLogValue } from './log-query';
import { metricName, MONITOR_WINDOWS, overallState, thresholdState, validateMonitor,
  type MonitorEvaluation, type MonitorGroup } from './monitor-rule';

interface AggregateRow { groupKey: string; sampleCount: string | number; matchCount: string | number;
  value: string | number | null; unit: string; unitCount: string | number; }
const BUDGET = { max_execution_time: 10, max_rows_to_read: '500000', read_overflow_mode: 'throw' as const,
  max_memory_usage: String(128 * 1024 * 1024), max_result_rows: '101', result_overflow_mode: 'throw' as const };

@Injectable()
export class MonitorQueryService {
  constructor(private readonly clickhouse: ClickhouseService) {}

  async history(org: string, input: MonitorDto, from: Date, to: Date) {
    const rule = normalizeLogRule(input); validateMonitor(rule);
    const duration = to.getTime() - from.getTime();
    if (!Number.isFinite(duration) || duration <= 0 || duration > 7 * 86_400_000 || to.getTime() > Date.now() + 60_000)
      throw new BadRequestException('Select a valid historical range of up to seven days.');
    const bucketMs = Math.max(MONITOR_WINDOWS[rule.evaluationWindow], Math.ceil(duration / 120 / 30_000) * 30_000);
    const { scope, params, where } = this.scope(org, rule, to);
    Object.assign(params, { from: from.getTime(), chartFrom: from.getTime(), chartTo: to.getTime(), bucketMs });
    const timestamp = rule.type === 'metric' ? 'TimeUnix' : 'Timestamp';
    const bucket = (prefix: string) => `least({chartTo:Int64}, {chartFrom:Int64} + (intDiv(toUnixTimestamp64Milli(${prefix}.${timestamp}) - {chartFrom:Int64}, {bucketMs:Int64}) + 1) * {bucketMs:Int64})`;
    const aggregation = rule.aggregation ?? (rule.type === 'log' ? 'count' : 'avg');
    const source = this.source(rule, where, rule.type === 'metric' ? bucket('r') : undefined);
    const sql = this.sql(rule, source, aggregation, params).replace('SELECT ', `SELECT ${bucket('q')} AS bucket, `)
      .replace('GROUP BY groupKey ORDER BY groupKey LIMIT 101', 'GROUP BY bucket, groupKey ORDER BY bucket, groupKey LIMIT 12001');
    const rows = await this.clickhouse.executeTenantQuery<AggregateRow & { bucket: string | number }>(scope, sql, params,
      { ...BUDGET, max_result_rows: '12001' });
    if (rows.length > 12000 || rows.some(row => Number(row.unitCount) > 1) || new Set(rows.map(row => row.unit)).size > 1)
      throw new Error('Historical monitor units or group cardinality are inconsistent.');
    const points = [];
    for (let end = from.getTime() + bucketMs; end < to.getTime() + bucketMs; end += bucketMs) {
      const t = Math.min(end, to.getTime());
      const groups = rows.filter(row => Number(row.bucket) === t).map(row => this.group(row, rule, aggregation));
      if (groups.length > 100) throw new Error('Historical monitor group limit exceeded.');
      const values = groups.flatMap(group => group.value === null ? [] : [group.value]);
      const value = values.length ? rule.comparator.startsWith('above') ? Math.max(...values) : Math.min(...values)
        : !rule.groupBy?.length && aggregation === 'count' && rule.noDataPolicy === 'zero' ? 0 : null;
      points.push({ t, v: value, status: value === null ? 'No Data' : groups.length ? overallState(groups) : thresholdState(value, rule) });
      if (t === to.getTime()) break;
    }
    return { points, unit: rows[0]?.unit ?? this.unit(rule, aggregation), bucketMs, from: from.toISOString(), to: to.toISOString() };
  }

  async evaluate(org: string, rule: MonitorDto, now = new Date()): Promise<MonitorEvaluation> {
    rule = normalizeLogRule(rule);
    validateMonitor(rule);
    const { scope, params, where } = this.scope(org, rule, now);
    const source = this.source(rule, where);
    const aggregation = rule.aggregation ?? (rule.type === 'log' ? 'count' : 'avg');
    const sql = this.sql(rule, source, aggregation, params);
    const rows = await this.clickhouse.executeTenantQuery<AggregateRow>(scope, sql, params, BUDGET);
    if (rows.length > 100 || rows.some(row => Number(row.unitCount) > 1) || new Set(rows.map(row => row.unit)).size > 1)
      throw new Error('Monitor groups exceed limit or metric units are inconsistent.');
    const groups = rows.map(row => this.group(row, rule, aggregation));
    if (!groups.length && !rule.groupBy?.length && rule.noDataPolicy === 'zero' && aggregation === 'count')
      groups.push({ key: '[]', labels: [], value: 0, status: thresholdState(0, rule), samples: 0 });
    const values = groups.flatMap(group => group.value === null ? [] : [group.value]);
    return { status: overallState(groups), groups,
      value: values.length ? (rule.comparator.startsWith('above') ? Math.max(...values) : Math.min(...values)) : null,
      unit: rows[0]?.unit ?? this.unit(rule, aggregation), evaluatedAt: now.toISOString(),
      from: new Date(Number(params.from)).toISOString(), to: now.toISOString() };
  }

  private scope(org: string, rule: MonitorDto, now: Date) {
    const scope: TenantScope = { tenantSlug: org, role: 'admin', teamFilter: rule.teamId || undefined,
      serviceFilter: rule.service || undefined, envFilter: rule.env && rule.env !== 'all' ? rule.env : undefined };
    const time = rule.type === 'metric' ? 'TimeUnix' : 'Timestamp';
    const isolation = this.clickhouse.buildTenantFilter(scope, [
      `${time} >= fromUnixTimestamp64Milli({from:Int64}) AND ${time} < fromUnixTimestamp64Milli({to:Int64})`,
      ...(rule.type === 'metric' ? ['MetricName = {metric:String}'] : []),
    ]);
    const params: Record<string, unknown> = { ...isolation.params, from: now.getTime() - MONITOR_WINDOWS[rule.evaluationWindow],
      to: now.getTime(), search: rule.query.trim(), signalStatus: rule.signalStatus ?? '' };
    if (rule.type === 'metric') params.metric = metricName(rule.query);
    return { scope, params, where: isolation.where };
  }

  private source(rule: MonitorDto, where: string, bucket?: string): string {
    if (rule.type !== 'metric') return `${rule.type === 'log' ? 'otel_logs' : 'otel_traces'} AS q ${where}`;
    const kind = rule.metricType ?? 'gauge';
    if (!['gauge', 'sum', 'histogram'].includes(kind)) throw new Error('Unsupported metric type.');
    if (kind === 'gauge') return `otel_metrics_gauge AS q ${where}`;
    const fields = kind === 'sum' ? ['Value'] : ['Sum', 'Count', 'Min', 'Max'];
    return `(SELECT any(r.TimeUnix) AS TimeUnix, any(r.ResourceAttributes) AS ResourceAttributes, any(r.ServiceName) AS ServiceName,
      any(r.MetricUnit) AS MetricUnit, ${fields.map(field => `argMax(r.${field}, r.TimeUnix) AS ${field}`).join(', ')}
      FROM otel_metrics_${kind} AS r ${where.replace(/\b(org_slug|team_id|ServiceName|ResourceAttributes|TimeUnix|MetricName)\b/g, 'r.$1')}
      GROUP BY r.ServiceName, r.MetricName, r.MetricUnit, r.ScopeName, r.ScopeVersion,
        toJSONString(r.ResourceAttributes), toJSONString(r.Attributes)${bucket ? `, ${bucket}` : ''}) AS q`;
  }

  private sql(rule: MonitorDto, source: string, aggregation: string, params: Record<string, unknown>): string {
    const keys = (rule.groupBy ?? []).map((key, index) => {
      params[`group${index}`] = key;
      return key === 'service.name' ? 'q.ServiceName' : `q.ResourceAttributes[{group${index}:String}]`;
    });
    const group = keys.length ? `toJSONString(tuple(${keys.join(', ')}))` : "'[]'";
    if (rule.logAttribute) params.logAttribute = rule.logAttribute;
    const filter = this.matches(rule, params);
    const matches = rule.type === 'log' && rule.logAttribute ? `(${filter}) AND isFinite(${numericLogValue})` : filter;
    return `SELECT ${group} AS groupKey, count() AS sampleCount, countIf(${matches}) AS matchCount,
      ${this.aggregate(rule, aggregation, matches)} AS value,
      ${rule.type === 'metric' && aggregation !== 'count' ? 'any(q.MetricUnit)' : `'${this.unit(rule, aggregation)}'`} AS unit,
      ${rule.type === 'metric' ? 'uniqExact(q.MetricUnit)' : '1'} AS unitCount
      FROM ${source} GROUP BY groupKey ORDER BY groupKey LIMIT 101`;
  }

  private matches(rule: MonitorDto, params: Record<string, unknown>): string {
    if (rule.type === 'metric') return '1';
    const field = rule.type === 'log' ? 'q.Body' : 'q.SpanName';
    const search = rule.type === 'log' ? logSearch(rule.query, params)
      : rule.query.trim() === '*' ? '1' : `positionCaseInsensitiveUTF8(${field}, {search:String}) > 0`;
    const status = rule.type === 'log' ? `multiIf(q.SeverityNumber BETWEEN 17 AND 20, 'ERROR',
      q.SeverityNumber BETWEEN 13 AND 16, 'WARN', q.SeverityNumber BETWEEN 9 AND 12, 'INFO',
      q.SeverityNumber BETWEEN 5 AND 8, 'DEBUG', upperUTF8(q.SeverityText))`
      : "if(q.StatusCode = '', 'UNSET', upperUTF8(q.StatusCode))";
    return `(${search}) AND ({signalStatus:String} = '' OR ${status} = {signalStatus:String})`;
  }

  private aggregate(rule: MonitorDto, aggregation: string, matches: string): string {
    const histogram = rule.type === 'metric' && rule.metricType === 'histogram';
    if (aggregation === 'count') return histogram ? 'sum(toFloat64(q.Count))' : `countIf(${matches})`;
    if (histogram && aggregation === 'avg') return 'sum(q.Sum) / nullIf(sum(toFloat64(q.Count)), 0)';
    const value = rule.type === 'log' ? numericLogValue : rule.type === 'trace' ? 'q.Duration / 1000000.0' : histogram
      ? aggregation === 'min' ? 'q.Min' : aggregation === 'max' ? 'q.Max' : 'q.Sum' : 'q.Value';
    return aggregation === 'p95' ? `quantileIf(0.95)(${value}, ${matches})`
      : `${aggregation}If(${value}, ${matches})`;
  }

  private group(row: AggregateRow, rule: MonitorDto, aggregation: string): MonitorGroup {
    const absent = Number(row.sampleCount) === 0 && !(aggregation === 'count' && rule.noDataPolicy === 'zero' && !rule.groupBy?.length);
    const value = absent || aggregation !== 'count' && Number(row.matchCount) === 0 || row.value === null ? null : Number(row.value);
    if (value !== null && !Number.isFinite(value)) throw new Error('Invalid evaluated value.');
    return { key: row.groupKey, labels: JSON.parse(row.groupKey), value,
      status: thresholdState(value, rule), samples: Number(row.sampleCount) };
  }

  private unit(rule: MonitorDto, aggregation: string): string {
    return aggregation === 'count' ? rule.type === 'log' ? 'logs' : rule.type === 'trace' ? 'spans' : 'observations'
      : rule.type === 'trace' ? 'ms' : rule.type === 'log' ? rule.logAttribute ?? '' : '';
  }
}
