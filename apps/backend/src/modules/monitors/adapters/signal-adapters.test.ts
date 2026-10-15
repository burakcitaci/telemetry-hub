import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ConfigService } from '@nestjs/config';
import { ClickhouseService } from '../../telemetry/services/clickhouse.service';
import { LogAdapter } from './log.adapter';
import { TraceAdapter } from './trace.adapter';
import { MetricAdapter } from './metric.adapter';
import { SignalRegistry } from '../signal-registry';
import { NoDataError, type SignalQuery } from '../signal-adapter';

const since = new Date('2026-01-01T00:00:00Z'), until = new Date('2026-01-01T00:01:00Z');
const base: SignalQuery = { signal_type: 'LOG', query: 'service.name:api', aggregation: 'COUNT',
  scope: { tenantSlug: 'demo', role: 'admin', teamFilter: 'platform' } };

function fixture(rows: any[] = [{ samples: 2, value: 3 }]) {
  const clickhouse = new ClickhouseService({ error() {} } as any, new ConfigService());
  const captured: Array<{ sql: string; params: Record<string, unknown>; settings: any }> = [];
  clickhouse.executeTenantQuery = async (_scope, sql, params = {}, settings) => {
    captured.push({ sql, params, settings }); return rows as any;
  };
  return { clickhouse, captured };
}

test('adapters use mandatory tenant filters, half-open bounds and fail-closed query budgets', async () => {
  for (const [signal, Adapter] of [['LOG', LogAdapter], ['TRACE', TraceAdapter]] as const) {
    const { clickhouse, captured } = fixture();
    assert.equal(await new Adapter(clickhouse).aggregate({ ...base, signal_type: signal }, since, until), 3);
    assert.match(captured[0].sql, /org_slug = \{tenant:String\}/);
    assert.match(captured[0].sql, /team_id = \{teamId:String\}/);
    assert.match(captured[0].sql, />= fromUnixTimestamp64Milli\(\{since:Int64\}\)/);
    assert.match(captured[0].sql, /< fromUnixTimestamp64Milli\(\{until:Int64\}\)/);
    assert.equal(captured[0].params.since, since.getTime());
    assert.equal(captured[0].settings.read_overflow_mode, 'throw');
    assert.equal(captured[0].settings.result_overflow_mode, 'throw');
  }
});

test('unknown keys produce metadata and warnings; foreign signal keys fail validation', async () => {
  const { clickhouse } = fixture();
  const warnings: unknown[] = [];
  const adapter = new LogAdapter(clickhouse, { warn: item => warnings.push(item) });
  const result = await adapter.measure({ ...base, query: 'unknown.key:secret service.name:api' }, since, until);
  assert.deepEqual(result.warnings, [{ code: 'UNKNOWN_QUERY_KEY', key: 'unknown.key' }]);
  assert.deepEqual(result.warnings, warnings);
  await assert.rejects(adapter.aggregate({ ...base, query: 'status.code:ERROR' }, since, until), /not valid/);
});

test('log numeric fields and filter values are parameterized rather than interpolated', async () => {
  const { clickhouse, captured } = fixture();
  const value = "api'; DROP TABLE otel_logs; --";
  const field = "value']; DROP TABLE otel_logs; --";
  await new LogAdapter(clickhouse).measure({ ...base, query: `service.name:${JSON.stringify(value)}`,
    aggregation: 'SUM', field }, since, until);
  assert.doesNotMatch(captured[0].sql, /DROP TABLE/);
  assert.ok(Object.values(captured[0].params).includes(value));
  assert.ok(Object.values(captured[0].params).includes(field));
});

test('no matches count as zero but numeric NoData and database failures remain distinct', async () => {
  const { clickhouse } = fixture([{ samples: 0, value: 0 }]);
  const adapter = new LogAdapter(clickhouse);
  assert.equal(await adapter.aggregate(base, since, until), 0);
  await assert.rejects(adapter.aggregate({ ...base, aggregation: 'AVG', field: 'value' }, since, until), NoDataError);
  clickhouse.executeTenantQuery = async () => { throw new Error('query budget exceeded'); };
  await assert.rejects(adapter.aggregate(base, since, until), /query budget exceeded/);
});

test('invalid windows, missing numeric fields, signal mismatch and metric-name conflicts fail before execution', async () => {
  const { clickhouse, captured } = fixture();
  const log = new LogAdapter(clickhouse), metric = new MetricAdapter(clickhouse);
  await assert.rejects(log.aggregate(base, until, since), /window/);
  await assert.rejects(log.aggregate(base, new Date('invalid'), until), /window/);
  await assert.rejects(log.aggregate({ ...base, aggregation: 'SUM' }, since, until), /field/);
  await assert.rejects(log.aggregate({ ...base, signal_type: 'TRACE' }, since, until), /requires LOG/);
  await assert.rejects(metric.aggregate({ ...base, signal_type: 'METRIC', metric_name: 'one', query: 'metric_name:two' }, since, until), /consistent/);
  assert.equal(captured.length, 0);
});

test('registry dispatches purely by signal type and fails for missing registrations', () => {
  const { clickhouse } = fixture();
  const adapter = new LogAdapter(clickhouse);
  const registry = new SignalRegistry(new Map([['LOG', adapter]]));
  assert.equal(registry.get('LOG'), adapter);
  assert.throws(() => registry.get('TRACE'), /No adapter/);
});

test('invalid stored metric windows are NoData and ambiguous metric types are rejected', async () => {
  const { clickhouse } = fixture([{ kind: 'sum', samples: 1, unit: 's', unitCount: 1 }]);
  let calls = 0;
  clickhouse.executeTenantQuery = async () => (++calls === 1 ? [{ kind: 'sum', samples: 1, unit: 's', unitCount: 1 }]
    : [{ samples: 1, value: 4, invalid: 1, unitCount: 1 }]) as any;
  const monitor: SignalQuery = { ...base, signal_type: 'METRIC', metric_name: 'counter', aggregation: 'SUM', field: 'value' };
  await assert.rejects(new MetricAdapter(clickhouse).measure(monitor, since, until), NoDataError);
  clickhouse.executeTenantQuery = async () => [{ kind: 'gauge', samples: 1, unitCount: 1 }, { kind: 'sum', samples: 1, unitCount: 1 }] as any;
  await assert.rejects(new MetricAdapter(clickhouse).measure(monitor, since, until), /ambiguous/);
});
