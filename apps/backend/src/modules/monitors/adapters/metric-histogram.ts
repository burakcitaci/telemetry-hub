import { NoDataError, type SignalMeasurement, type SignalQuery } from '../signal-adapter';
import type { QueryWarning } from '../query-parser';
import { scalarMeasurement, type ScalarRow } from './adapter-query';

export interface BucketRow { bound: number | string | null; weight: number | string; invalid: number | string; units: string[]; }

export function histogramSql(source: string, monitor: SignalQuery): string {
  if (monitor.aggregation === 'P95' || monitor.aggregation === 'P99') return `SELECT
    if(isFinite(bucket.1), toNullable(bucket.1), NULL) AS bound, sum(bucket.2) AS weight,
    sum(invalid) AS invalid, groupUniqArray(unit) AS units
    FROM (${source}) ARRAY JOIN arrayZip(arrayConcat(bounds, [toFloat64('inf')]), buckets) AS bucket
    GROUP BY bucket.1 ORDER BY bucket.1`;
  const value = { COUNT: 'sum(observations)', AVG: 'sum(total) / nullIf(sum(observations), 0)',
    SUM: 'sum(total)', MIN: 'minIf(minimum, observations > 0)', MAX: 'maxIf(maximum, observations > 0)' }[monitor.aggregation];
  const extrema = ['MIN', 'MAX'].includes(monitor.aggregation)
    ? ' OR extremaInvalid OR (observations > 0 AND (minimum IS NULL OR maximum IS NULL OR NOT isFinite(minimum) OR NOT isFinite(maximum) OR minimum > maximum))' : '';
  return `SELECT sum(observations) AS samples, ${value} AS value, uniqExact(unit) AS unitCount,
    sum(toUInt64(invalid${extrema})) AS invalid FROM (${source})`;
}

export function histogramQuantile(rows: BucketRow[], monitor: SignalQuery, unit: string,
  warnings: QueryWarning[]): SignalMeasurement {
  if (rows.some(row => Number(row.invalid))) throw new NoDataError('Invalid histogram window or bucket layout.', true, warnings);
  if (new Set(rows.flatMap(row => row.units)).size > 1) throw new Error('Metric units are inconsistent.');
  const total = rows.reduce((sum, row) => sum + Number(row.weight), 0);
  if (!Number.isSafeInteger(total) || total <= 0) throw new NoDataError('No histogram observations in the window.', true, warnings);
  const rank = Math.ceil(total * (monitor.aggregation === 'P95' ? 0.95 : 0.99));
  let cumulative = 0;
  for (const row of rows) {
    cumulative += Number(row.weight);
    if (cumulative < rank) continue;
    if (row.bound === null) throw new NoDataError('Histogram quantile lies in the unbounded overflow bucket.', true, warnings);
    return { value: Number(row.bound), unit, estimated: true, warnings };
  }
  throw new NoDataError('Incomplete histogram distribution.', true, warnings);
}

export function metricScalar(row: (ScalarRow & { unitCount: string | number }) | undefined,
  monitor: SignalQuery, unit: string, warnings: QueryWarning[]) {
  if (Number(row?.unitCount ?? 0) > 1) throw new Error('Metric units are inconsistent.');
  return scalarMeasurement(row, monitor, monitor.aggregation === 'COUNT' ? 'observations' : unit, warnings);
}
