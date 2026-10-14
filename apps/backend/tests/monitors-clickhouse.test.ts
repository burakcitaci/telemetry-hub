import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { ConfigService } from '@nestjs/config';
import { ClickhouseService } from '../src/modules/telemetry/services/clickhouse.service';
import { MonitorQueryService } from '../src/modules/monitors/monitor-query.service';

/** Explicit opt-in: read-only SQL verification against the project's local Kind ClickHouse. */
function rows(sql: string, params: Record<string, unknown> = {}) {
  const result = spawnSync('kubectl', ['--context', 'kind-observability', 'exec', '-n', 'telemetry-hub',
    'deployment/clickhouse', '--', 'clickhouse-client', '--max_execution_time=10', '--max_rows_to_read=500000',
    '--query', sql, '--format', 'JSONEachRow', ...Object.entries(params).map(([key, value]) => `--param_${key}=${value}`)],
  { encoding: 'utf8', timeout: 30_000 });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
}

test('generic numeric log attributes execute correctly for strings, zero, missing and invalid data', {
  skip: process.env.TEST_KIND_CLICKHOUSE !== '1', timeout: 120_000,
}, async () => {
  const clickhouse = new ClickhouseService({ error() {} } as any, new ConfigService());
  const fixture = `(SELECT now64(3) - INTERVAL 1 SECOND AS Timestamp, 'demo' AS org_slug,
    'backend' AS team_id, 'dotnet-api' AS ServiceName, map('org.slug', 'demo') AS ResourceAttributes,
    'Generated forecasts' AS Body, 9 AS SeverityNumber, 'Information' AS SeverityText,
    if(number = 4, map('RequestPath', '/WeatherForecast'),
      map('RequestPath', '/WeatherForecast', 'custom.value', multiIf(number = 0, '8', number = 1, '0', number = 2, 'bad', 'NaN'))) AS LogAttributes
    FROM numbers(5)) AS q`;
  clickhouse.executeTenantQuery = async (_scope, sql, params) => rows(sql.replace('otel_logs AS q', fixture), params) as any;
  const query = new MonitorQueryService(clickhouse);
  const rule = { name: 'Generic measure', type: 'log', query: '@RequestPath:/WeatherForecast',
    logAttribute: 'custom.value', comparator: 'above', threshold: 5, evaluationWindow: '5m' };
  for (const [aggregation, expected] of [['max', 8], ['min', 0], ['avg', 4], ['sum', 8]] as const) {
    const result = await query.evaluate('demo', { ...rule, aggregation });
    assert.equal(result.value, expected, aggregation);
  }
  const filtered = await query.evaluate('demo', { ...rule, query: '@custom.value:>5', aggregation: 'count', logAttribute: undefined });
  assert.equal(filtered.value, 1);
  const missing = await query.evaluate('demo', { ...rule, logAttribute: 'absent', aggregation: 'sum' });
  assert.equal(missing.value, null); assert.equal(missing.status, 'No Data');
  const shorthand = await query.evaluate('demo', { ...rule, query: 'max(custom.value)', logAttribute: undefined });
  assert.equal(shorthand.value, 8); assert.equal(shorthand.status, 'Alert');
  const end = new Date(Date.now() + 2000), start = new Date(end.getTime() - 30 * 60_000);
  const historical = await query.history('demo', { ...rule, aggregation: 'sum' }, start, end);
  assert.equal(historical.points.length, 6);
  assert.equal(historical.points.at(-1)?.v, 8);
  assert.ok(historical.points.slice(0, -1).every(point => point.v === null));
});

test('monitor aggregates execute as real tenant-scoped ClickHouse queries for all supported signals', {
  skip: process.env.TEST_KIND_CLICKHOUSE !== '1', timeout: 120_000,
}, async () => {
  const clickhouse = new ClickhouseService({ error() {} } as any, new ConfigService());
  Object.assign(clickhouse, { tenantSchemaReady: Promise.resolve(), client: {
    query: async ({ query, query_params }) => ({ json: async () => rows(query, query_params) }),
  } });
  const query = new MonitorQueryService(clickhouse);
  const base = { name: 'Verification', comparator: 'above', threshold: 100, evaluationWindow: '1h',
    service: 'backend-service', env: 'production', groupBy: ['service.name'] };
  for (const metricType of ['gauge', 'sum', 'histogram']) {
    const available = rows(`SELECT MetricName FROM otel_metrics_${metricType} WHERE org_slug = 'demo'
      AND ServiceName = 'backend-service' LIMIT 1`)[0]?.MetricName ?? 'missing.metric';
    for (const aggregation of ['avg', 'min', 'max', 'sum', 'count']) {
      const result = await query.evaluate('demo', { ...base, type: 'metric', query: available, metricType, aggregation });
      assert.ok(['OK', 'Alert', 'Warn', 'No Data'].includes(result.status));
      if (aggregation === 'avg') {
        const to = new Date();
        const history = await query.history('demo', { ...base, type: 'metric', query: available, metricType, aggregation }, new Date(to.getTime() - 30 * 60_000), to);
        assert.equal(history.points.length, 1);
      }
    }
  }
  for (const type of ['log', 'trace']) for (const aggregation of type === 'log' ? ['count'] : ['avg', 'min', 'max', 'count', 'p95']) {
    const result = await query.evaluate('demo', { ...base, type, query: '*', aggregation, signalStatus: 'ERROR' });
    assert.ok(['OK', 'Alert', 'Warn', 'No Data'].includes(result.status));
  }
});
