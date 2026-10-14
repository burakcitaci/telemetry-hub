import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MetricsService, summarizeDistribution, type MetricDetailRecord } from './metrics.service';
import { ClickhouseService } from './clickhouse.service';

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

test('inventory discovers known installed tables in the configured database and preserves query failures', async () => {
  const clickhouse = new ClickhouseService({} as never, {} as never);
  clickhouse.executeSystemQuery = async (query: string) => {
    assert.match(query, /database = currentDatabase\(\)/);
    assert.doesNotMatch(query, /LIKE '%metric%'/);
    assert.match(query, /otel_metrics_summary/);
    return [{ table_name: 'otel_metrics_gauge' }, { table_name: 'otel_metrics_summary' }] as any;
  };
  let fail = false;
  clickhouse.executeTenantQuery = async (_scope, query) => {
    assert.match(query, /org_slug = \{tenant:String\}/);
    if (fail && query.includes('otel_metrics_summary')) throw new Error('query budget exceeded');
    return [{ ServiceName: 'api', MetricName: 'requests' }] as any;
  };
  const metrics = new MetricsService(clickhouse, { warn() {} } as any);
  const inventory = await metrics.getAllMetricsFlattened({ tenantSlug: 'demo', role: 'admin' });
  assert.equal(inventory.total, 2);
  fail = true;
  await assert.rejects(metrics.getAllMetricsFlattened({ tenantSlug: 'demo', role: 'admin' }), (error: any) =>
    error.getStatus() === 503 && error.getResponse().failedTables.includes('otel_metrics_summary'));
});
