import assert from 'node:assert/strict';
import { test } from 'node:test';
import { summarizeDistribution, type MetricDetailRecord } from './metrics.service';

function record(bucketCounts: number[], explicitBounds: number[]): MetricDetailRecord {
  return { serviceName: 'api', metricName: 'latency', metricType: 'histogram',
    metricDescription: '', metricUnit: 'ms', attributes: {}, resourceAttributes: {},
    tableName: 'otel_metrics_histogram', timeUnix: '1', startTimeUnix: '0',
    count: bucketCounts.reduce((total, count) => total + count, 0), sum: 0,
    min: 0, max: 100, bucketCounts, explicitBounds };
}

test('histogram statistics operate on weighted buckets without expanding observations', () => {
  const result = summarizeDistribution([record([1_000_000, 2_000_000], [10, 20])], 15);
  assert.equal(result.p50, 20);
  assert.equal(result.p95, 20);
  assert.equal(result.distributionComplete, true);
  assert.ok(Number.isFinite(result.stdDev));
});

test('histogram overflow is reported as unknown instead of a fabricated zero', () => {
  const result = summarizeDistribution([record([1, 9], [10])], 50);
  assert.equal(result.p50, null);
  assert.equal(result.p95, null);
  assert.equal(result.stdDev, null);
  assert.equal(result.distributionComplete, false);
});
