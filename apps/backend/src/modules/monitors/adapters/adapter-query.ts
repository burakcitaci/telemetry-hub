import type { ClickHouseSettings } from '@clickhouse/client';
import type { ClickhouseService } from '../../telemetry/services/clickhouse.service';
import { AGGREGATIONS, NoDataError, type SignalMeasurement, type SignalQuery, type Aggregation } from '../signal-adapter';
import type { QueryWarning } from '../query-parser';
import { compileFilters } from './query-filters';

export const ADAPTER_BUDGET: ClickHouseSettings = { max_execution_time: 10, max_rows_to_read: '500000',
  read_overflow_mode: 'throw', max_memory_usage: String(128 * 1024 * 1024),
  max_result_rows: '10000', result_overflow_mode: 'throw' };
export interface AdapterOptions { warn?: (warning: QueryWarning) => void; settings?: ClickHouseSettings; }
export interface ScalarRow { value: string | number | null; samples: string | number; invalid?: string | number; }

export function prepareQuery(clickhouse: ClickhouseService, monitor: SignalQuery, since: Date, until: Date,
  options: AdapterOptions, time: string, baseline = false) {
  if (!monitor.scope?.tenantSlug || !AGGREGATIONS.includes(monitor.aggregation)) throw new Error('Invalid signal query configuration.');
  if (!Number.isFinite(since.getTime()) || !Number.isFinite(until.getTime()) || since >= until)
    throw new Error('Signal window must have finite, increasing bounds.');
  if (monitor.aggregation !== 'COUNT' && !monitor.field) throw new Error('Numeric aggregation requires a field.');
  const params: Record<string, unknown> = { since: since.getTime(), until: until.getTime() };
  const filters = compileFilters(monitor.query, monitor.signal_type, params, options.warn);
  const lower = baseline ? '' : `${time} >= fromUnixTimestamp64Milli({since:Int64}) AND `;
  const isolation = clickhouse.buildTenantFilter(monitor.scope,
    [`${lower}${time} < fromUnixTimestamp64Milli({until:Int64})`, ...filters.predicates],
    monitor.signal_type === 'LOG' ? 'logs' : monitor.signal_type === 'TRACE' ? 'traces' : undefined);
  return { params: { ...params, ...isolation.params }, where: isolation.where, warnings: filters.warnings, filters: filters.filters };
}

export function scalarAggregation(aggregation: Aggregation, value = 'value'): string {
  if (aggregation === 'COUNT') return 'count()';
  if (aggregation === 'P95' || aggregation === 'P99') {
    const ratio = aggregation === 'P95' ? 0.95 : 0.99;
    return `arrayElement(arraySort(groupArray(${value})), toUInt64(greatest(1, ceil(count() * ${ratio}))))`;
  }
  return `${aggregation.toLowerCase()}(${value})`;
}

export function scalarMeasurement(row: ScalarRow | undefined, monitor: SignalQuery, unit: string,
  warnings: QueryWarning[], estimated = false): SignalMeasurement {
  if (Number(row?.invalid ?? 0)) throw new NoDataError('Stored samples cannot establish this window aggregate.', estimated, warnings);
  if (!row || !Number(row.samples)) {
    if (monitor.aggregation === 'COUNT') return { value: 0, unit, estimated, warnings };
    throw new NoDataError('No numeric samples in the signal window.', estimated, warnings);
  }
  if (row.value === null || !Number.isFinite(Number(row.value))) throw new NoDataError('Non-finite signal aggregate.', estimated, warnings);
  return { value: Number(row.value), unit, estimated, warnings };
}

export async function queryScalar(clickhouse: ClickhouseService, monitor: SignalQuery, source: string,
  params: Record<string, unknown>, options: AdapterOptions, unit: string, warnings: QueryWarning[]) {
  const sql = `SELECT count() AS samples, ${scalarAggregation(monitor.aggregation, 'signal_rows.value')} AS value
    FROM (${source}) AS signal_rows ${monitor.aggregation === 'COUNT' ? '' : 'WHERE isFinite(signal_rows.value)'}`;
  const rows = await clickhouse.executeTenantQuery<ScalarRow>(monitor.scope, sql, params, options.settings ?? ADAPTER_BUDGET);
  return scalarMeasurement(rows[0], monitor, unit, warnings);
}
