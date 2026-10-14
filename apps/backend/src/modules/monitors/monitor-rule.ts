import { BadRequestException } from '@nestjs/common';
import type { MonitorDto } from '../auth/dto/monitor.dto';
import { validateLogQuery } from './log-query';

export const MONITOR_WINDOWS: Record<string, number> = { '1m': 60_000, '5m': 300_000,
  '15m': 900_000, '30m': 1_800_000, '1h': 3_600_000 };
export type MonitorState = 'OK' | 'Warn' | 'Alert' | 'No Data' | 'Unknown';
export interface MonitorGroup { key: string; labels: string[]; value: number | null; status: MonitorState; samples: number; }
export interface MonitorEvaluation { status: MonitorState; value: number | null; unit: string;
  groups: MonitorGroup[]; evaluatedAt: string; from: string; to: string; error?: string; }

export function metricName(query: string): string {
  const name = query.replace(/^(avg|sum|min|max|count):/, '').trim();
  if (!/^[A-Za-z][A-Za-z0-9_.:/-]{0,254}$/.test(name))
    throw new BadRequestException('Enter an OTel metric name, not a Datadog expression.');
  return name;
}

export function validateMonitor(rule: MonitorDto): void {
  if (!['metric', 'log', 'trace'].includes(rule.type) || !MONITOR_WINDOWS[rule.evaluationWindow])
    throw new BadRequestException('Choose metric, log or trace and a supported evaluation window.');
  const aggregation = rule.aggregation ?? (rule.type === 'log' ? 'count' : 'avg');
  if (!['avg', 'sum', 'min', 'max', 'count', 'p95'].includes(aggregation)) throw new BadRequestException('Invalid aggregation.');
  if (rule.type === 'metric') metricName(rule.query);
  if (rule.type === 'metric' && rule.signalStatus) throw new BadRequestException('Signal status applies only to logs and traces.');
  if (rule.logAttribute && (rule.type !== 'log' || !/^[A-Za-z_][A-Za-z0-9_.-]{0,127}$/.test(rule.logAttribute)))
    throw new BadRequestException('Choose a valid log attribute name.');
  if (rule.type === 'log' && aggregation !== 'count' && !rule.logAttribute)
    throw new BadRequestException('Select a numeric log attribute for this aggregation.');
  if (rule.type === 'log' && aggregation === 'count' && rule.logAttribute)
    throw new BadRequestException('Count measures log records. Clear the numeric attribute or select a numeric aggregation.');
  if (rule.type === 'log') validateLogQuery(rule.query);
  if (rule.type === 'metric' && aggregation === 'p95') throw new BadRequestException('P95 is available for traces and numeric log attributes.');
  if (rule.type === 'trace' && rule.signalStatus && !['ERROR', 'OK', 'UNSET'].includes(rule.signalStatus))
    throw new BadRequestException('Trace status must be ERROR, OK or UNSET.');
  if (rule.type === 'log' && rule.signalStatus && !['ERROR', 'WARN', 'INFO', 'DEBUG'].includes(rule.signalStatus))
    throw new BadRequestException('Log severity must be ERROR, WARN, INFO or DEBUG.');
  if (rule.env && rule.env !== 'all' && !/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(rule.env))
    throw new BadRequestException('Invalid environment name.');
  if ((rule.groupBy?.length ?? 0) > 3 || rule.groupBy?.some(key => !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(key)))
    throw new BadRequestException('Use up to three resource attribute names for grouping.');
  validateThresholds(rule, aggregation);
}

function validateThresholds(rule: MonitorDto, aggregation: string): void {
  if (!['above', 'below', 'above_or_equal', 'below_or_equal'].includes(rule.comparator)
    || !Number.isFinite(rule.threshold) || rule.warnThreshold !== undefined && !Number.isFinite(rule.warnThreshold))
    throw new BadRequestException('Thresholds and comparator must be valid.');
  if (rule.warnThreshold !== undefined && (rule.comparator.startsWith('above')
    ? rule.warnThreshold > rule.threshold : rule.warnThreshold < rule.threshold))
    throw new BadRequestException('Warning threshold must be less severe than the alert threshold.');
  if (rule.noDataPolicy === 'zero' && aggregation !== 'count')
    throw new BadRequestException('Missing data may be zero only for count monitors.');
  if (rule.noDataPolicy === 'zero' && rule.groupBy?.length)
    throw new BadRequestException('Zero for missing data applies only to ungrouped counts.');
  if (rule.type !== 'metric' && /^(logs|traces)\(/.test(rule.query))
    throw new BadRequestException('Use plain search text or *; configure scope and status using the form.');
}

export function compare(value: number, threshold: number, comparator: string): boolean {
  if (comparator === 'above') return value > threshold;
  if (comparator === 'above_or_equal') return value >= threshold;
  if (comparator === 'below') return value < threshold;
  return value <= threshold;
}

export function thresholdState(value: number | null, rule: MonitorDto): MonitorState {
  if (value === null) return 'No Data';
  if (compare(value, rule.threshold, rule.comparator)) return 'Alert';
  return rule.warnThreshold !== undefined && compare(value, rule.warnThreshold, rule.comparator) ? 'Warn' : 'OK';
}

export function overallState(groups: MonitorGroup[]): MonitorState {
  for (const status of ['Unknown', 'Alert', 'Warn', 'No Data'] as const)
    if (groups.some(group => group.status === status)) return status;
  return groups.length ? 'OK' : 'No Data';
}
