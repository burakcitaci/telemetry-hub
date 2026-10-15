import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { ClickhouseService } from '../../src/modules/telemetry/services/clickhouse.service';

export const tables = ['otel_logs', 'otel_traces', 'otel_metrics_gauge', 'otel_metrics_sum', 'otel_metrics_histogram'];
export const since = new Date('2026-01-01T00:00:00Z');
export const until = new Date('2026-01-01T00:01:00Z');
export const timestamp = (seconds: number) => new Date(since.getTime() + seconds * 1000).toISOString().replace('T', ' ').replace('Z', '');

export function clickhouseRows(database: string, sql: string, params: Record<string, unknown> = {}, input?: string, settings: Record<string, unknown> = {}) {
  const args = ['--context', 'kind-observability', 'exec', '-i', '-n', 'telemetry-hub', 'deployment/clickhouse', '--',
    'clickhouse-client', '--database', database, '--query', sql, '--format', 'JSONEachRow',
    ...Object.entries(settings).map(([key, value]) => `--${key}=${value}`),
    ...Object.entries(params).map(([key, value]) => `--param_${key}=${Array.isArray(value) ? JSON.stringify(value) : value}`)];
  const result = spawnSync('kubectl', args, { input, encoding: 'utf8', timeout: 30000 });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
}

export function createAdapterFixture() {
  const database = `monitor_adapter_test_${randomUUID().replaceAll('-', '')}`;
  clickhouseRows('default', `CREATE DATABASE ${database}`);
  const clickhouse = new ClickhouseService({ error() {} } as any, new ConfigService());
  Object.assign(clickhouse, { tenantSchemaReady: Promise.resolve(), client: {
    query: async ({ query, query_params, clickhouse_settings }) => ({
      json: async () => clickhouseRows(database, query, query_params, undefined, clickhouse_settings),
    }),
  } });
  return { clickhouse, database,
    initialize: () => tables.forEach(table => clickhouseRows(database,
      `CREATE TABLE ${table} ENGINE = Memory AS SELECT * EXCEPT(org_slug, team_id), org_slug, team_id FROM default.${table} LIMIT 0`)),
    insert: (table: string, rows: Record<string, unknown>[]) => {
      assert.ok(tables.includes(table));
      clickhouseRows(database, `INSERT INTO ${table} FORMAT JSONEachRow`, {}, rows.map(row => JSON.stringify(row)).join('\n'));
    },
    close: () => {
      assert.match(database, /^monitor_adapter_test_[a-f0-9]{32}$/);
      clickhouseRows('default', `DROP DATABASE ${database} SYNC`);
    } };
}

export const resource = { 'service.name': 'api', 'service.namespace': 'shop', 'service.version': '1',
  'deployment.environment.name': 'production', 'org.slug': 'demo', 'team.id': 'platform' };
export const common = { org_slug: 'demo', team_id: 'platform', ServiceName: 'api', ResourceAttributes: resource, ScopeName: 'test' };

export function metricPoint(name: string, seconds: number, extra: Record<string, unknown> = {}) {
  return { ...common, MetricName: name, TimeUnix: timestamp(seconds), StartTimeUnix: timestamp(0),
    MetricUnit: 'ms', ScopeVersion: '1', Attributes: { 'db.system': 'postgres' }, ...extra };
}
