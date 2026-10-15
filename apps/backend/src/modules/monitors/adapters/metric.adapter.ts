import type { ClickhouseService } from '../../telemetry/services/clickhouse.service';
import { NoDataError, type SignalAdapter, type SignalQuery, type SignalMeasurement } from '../signal-adapter';
import { ADAPTER_BUDGET, prepareQuery, scalarAggregation, type AdapterOptions, type ScalarRow } from './adapter-query';
import { checkedHistogram, metricSource, type MetricKind } from './metric-source';
import { histogramQuantile, histogramSql, metricScalar, type BucketRow } from './metric-histogram';

interface MetricInventory { kind: MetricKind; samples: string | number; unit: string; unitCount: string | number; }

export class MetricAdapter implements SignalAdapter {
  constructor(private readonly clickhouse: ClickhouseService, private readonly options: AdapterOptions = {}) {}

  async aggregate(monitor: SignalQuery, since: Date, until: Date): Promise<number> {
    return (await this.measure(monitor, since, until)).value;
  }

  async measure(monitor: SignalQuery, since: Date, until: Date): Promise<SignalMeasurement> {
    if (monitor.signal_type !== 'METRIC') throw new Error('MetricAdapter requires METRIC.');
    if (monitor.aggregation !== 'COUNT' && monitor.field !== 'value') throw new Error('Metric numeric field must be value.');
    const query = prepareQuery(this.clickhouse, monitor, since, until, this.options, 'TimeUnix', true);
    const name = monitor.metric_name ?? query.filters.metric_name;
    if (!name || monitor.metric_name && query.filters.metric_name && monitor.metric_name !== query.filters.metric_name)
      throw new Error('Select one consistent metric_name.');
    query.params['metricName'] = name;
    const where = `${query.where} AND MetricName = {metricName:String}`;
    const inventory = await this.inventory(monitor, where, query.params);
    if (!inventory) {
      if (monitor.aggregation !== 'COUNT') throw new NoDataError('Metric has no points in the selected window.', false, query.warnings);
      return { value: 0, unit: 'observations', estimated: false, warnings: query.warnings };
    }
    return this.measureKind(monitor, inventory, where, query.params, query.warnings);
  }

  private async inventory(monitor: SignalQuery, where: string, params: Record<string, unknown>) {
    const sql = (['gauge', 'sum', 'histogram'] as const).map(kind => `SELECT '${kind}' AS kind,
      count() AS samples, any(MetricUnit) AS unit, uniqExact(MetricUnit) AS unitCount
      FROM otel_metrics_${kind} ${where} AND TimeUnix >= fromUnixTimestamp64Milli({since:Int64})`).join(' UNION ALL ');
    const rows = await this.clickhouse.executeTenantQuery<MetricInventory>(monitor.scope, sql, params, this.options.settings ?? ADAPTER_BUDGET);
    const present = rows.filter(row => Number(row.samples) > 0);
    if (present.length > 1 || present.some(row => Number(row.unitCount) > 1)) throw new Error('Metric type or units are ambiguous.');
    return present[0];
  }

  private async measureKind(monitor: SignalQuery, inventory: MetricInventory, where: string,
    params: Record<string, unknown>, warnings: SignalMeasurement['warnings']): Promise<SignalMeasurement> {
    const source = metricSource(inventory.kind, where, monitor.aggregation === 'COUNT');
    const invalid = monitor.aggregation === 'COUNT' ? 'signal_rows.invalid' : 'signal_rows.invalid OR NOT isFinite(signal_rows.value)';
    const sql = inventory.kind === 'histogram' ? histogramSql(checkedHistogram(source), monitor)
      : `SELECT count() AS samples, ${scalarAggregation(monitor.aggregation, 'signal_rows.value')} AS value, uniqExact(unit) AS unitCount,
        sum(toUInt64(${invalid})) AS invalid FROM (${source}) AS signal_rows`;
    if (inventory.kind === 'histogram' && ['P95', 'P99'].includes(monitor.aggregation)) {
      const rows = await this.clickhouse.executeTenantQuery<BucketRow>(monitor.scope, sql, params, this.options.settings ?? ADAPTER_BUDGET);
      return histogramQuantile(rows, monitor, inventory.unit, warnings);
    }
    const rows = await this.clickhouse.executeTenantQuery<ScalarRow & { unitCount: number }>(monitor.scope, sql,
      params, this.options.settings ?? ADAPTER_BUDGET);
    return metricScalar(rows[0], monitor, inventory.unit, warnings);
  }
}
