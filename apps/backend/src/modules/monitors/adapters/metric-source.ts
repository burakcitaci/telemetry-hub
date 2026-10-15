export type MetricKind = 'gauge' | 'sum' | 'histogram';
const SERIES = 'ServiceName, MetricName, MetricUnit, ScopeName, ScopeVersion, toJSONString(mapSort(ResourceAttributes)), toJSONString(mapSort(Attributes))';
const WINDOW = `PARTITION BY ${SERIES} ORDER BY TimeUnix ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`;
const IN_WINDOW = 'TimeUnix >= fromUnixTimestamp64Milli({since:Int64})';
const INVALID_TIME = 'StartTimeUnix > TimeUnix';

export function metricSource(kind: MetricKind, where: string, countOnly = false): string {
  if (kind === 'gauge' || countOnly && kind === 'sum') return `SELECT Value AS value, MetricUnit AS unit, 0 AS invalid
    FROM otel_metrics_${kind} ${where} AND ${IN_WINDOW}`;
  return kind === 'sum' ? sumSource(where) : histogramSource(where);
}

function withPrevious(kind: MetricKind, where: string, fields: string): string {
  return `SELECT *, lagInFrame(tuple(${fields})) OVER (${WINDOW}) AS prev,
    count() OVER (PARTITION BY ${SERIES}, TimeUnix) AS duplicates
    FROM otel_metrics_${kind} ${where}`;
}

function sumSource(where: string): string {
  const source = withPrevious('sum', where, 'Value, StartTimeUnix, IsMonotonic, TimeUnix, toUInt8(1), AggregationTemporality');
  const reset = '(prev.5 = 0 OR StartTimeUnix != prev.2 OR (IsMonotonic AND Value < prev.1))';
  const invalid = `AggregationTemporality NOT IN (1, 2) OR ${INVALID_TIME} OR duplicates > 1
    OR (IsMonotonic AND Value < 0) OR NOT isFinite(Value)
    OR (AggregationTemporality = 2 AND prev.5 = 1 AND prev.6 != 2)
    OR (AggregationTemporality = 2 AND prev.5 = 0 AND StartTimeUnix < fromUnixTimestamp64Milli({since:Int64}))`;
  return `SELECT if(AggregationTemporality = 1 OR ${reset}, Value, Value - prev.1) AS value,
    MetricUnit AS unit, toUInt8(${invalid}) AS invalid FROM (${source}) WHERE ${IN_WINDOW}`;
}

function histogramSource(where: string): string {
  const source = withPrevious('histogram', where,
    'Sum, Count, BucketCounts, ExplicitBounds, StartTimeUnix, TimeUnix, toUInt8(1), AggregationTemporality');
  const reset = '(prev.7 = 0 OR StartTimeUnix != prev.5 OR Count < prev.2)';
  const delta = `(AggregationTemporality = 1 OR ${reset})`;
  const invalid = `AggregationTemporality NOT IN (1, 2) OR ${INVALID_TIME} OR duplicates > 1
    OR (AggregationTemporality = 2 AND prev.7 = 1 AND prev.8 != 2)
    OR (AggregationTemporality = 2 AND prev.7 = 0 AND StartTimeUnix < fromUnixTimestamp64Milli({since:Int64}))
    OR (NOT ${delta} AND ExplicitBounds != prev.4)`;
  return `SELECT MetricUnit AS unit, ExplicitBounds AS bounds,
    if(${delta}, toFloat64(Count), toFloat64(Count) - toFloat64(prev.2)) AS observations,
    if(${delta}, Sum, Sum - prev.1) AS total,
    Min AS minimum, Max AS maximum, toUInt8(NOT ${delta}) AS extremaInvalid,
    if(${delta}, arrayMap(x -> toFloat64(x), BucketCounts),
      arrayMap((x, y) -> toFloat64(x) - toFloat64(y), BucketCounts, arrayResize(prev.3, length(BucketCounts), toUInt64(0)))) AS buckets,
    toUInt8(${invalid}) AS invalid FROM (${source}) WHERE ${IN_WINDOW}`;
}

export function checkedHistogram(source: string): string {
  return `SELECT * EXCEPT(invalid), toUInt8(invalid OR length(buckets) != length(bounds) + 1
    OR observations < 0 OR observations > 9007199254740991
    OR arrayExists(x -> NOT isFinite(x) OR x < 0, buckets)
    OR arrayExists(x -> NOT isFinite(x), bounds) OR arraySort(bounds) != bounds OR arrayDistinct(bounds) != bounds
    OR arraySum(buckets) != observations OR NOT isFinite(total)) AS invalid FROM (${source})`;
}
