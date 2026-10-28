import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ConfigService } from '@nestjs/config';
import { ClickhouseService } from '../telemetry/services/clickhouse.service';
import { PlatformStore } from '../auth/platform-store.service';
import { MonitorQueryService } from './monitor-query.service';
import { MonitorEvaluatorService } from './monitor-evaluator.service';
import { compare, validateMonitor } from './monitor-rule';
import { logSearch, normalizeLogRule } from './log-query';
import type { MonitorDto } from '../auth/dto/monitor.dto';

const rule: MonitorDto = { name: 'Errors', type: 'log', query: '*', aggregation: 'count',
  comparator: 'above', threshold: 10, warnThreshold: 5, evaluationWindow: '5m', service: 'api', env: 'staging' };
const row = (value: number | null, key = '[]') => ({ groupKey: key, sampleCount: 20,
  matchCount: value == null ? 0 : 20, value, unit: 'logs', unitCount: 1 });

test('generic structured log filters and shorthand are validated and parameterized', () => {
  for (const attribute of ['ForecastCount', 'duration_ms', 'order.total']) {
    const normalized = normalizeLogRule({ ...rule, query: `max(${attribute})` });
    assert.equal(normalized.logAttribute, attribute); assert.equal(normalized.aggregation, 'max');
    assert.equal(normalized.query, '*'); validateMonitor(normalized);
    const params: Record<string, unknown> = {};
    const sql = logSearch(`@${attribute}:>5 AND @RequestPath:"/WeatherForecast"`, params);
    assert.equal(params.logKey0, attribute); assert.equal(params.logValue0, 5);
    assert.equal(params.logValue1, '/WeatherForecast'); assert.doesNotMatch(sql, /WeatherForecast|ForecastCount/);
  }
  assert.throws(() => validateMonitor({ ...rule, aggregation: 'max' }));
  assert.throws(() => validateMonitor({ ...rule, logAttribute: 'x); DROP TABLE logs', aggregation: 'max' }));
  assert.throws(() => logSearch('@value:>5 OR 1=1', {}));
  assert.throws(() => logSearch('@value:>5 AND', {}));
  assert.throws(() => validateMonitor({ ...rule, query: 'max(bad name)' }));
});

test('mixed numeric and text log attributes use AND with case-sensitive parameter keys', () => {
  const params: Record<string, unknown> = {};
  const sql = logSearch('@input_tokens:>10 AND @Sku:"DSK-STD-01" AND @language:"en"', params);
  assert.match(sql, /toFloat64OrNull/); assert.match(sql, / AND /);
  assert.deepEqual(params, { logKey0: 'input_tokens', logValue0: 10,
    logKey1: 'Sku', logValue1: 'DSK-STD-01', logKey2: 'language', logValue2: 'en' });
  assert.doesNotMatch(sql, /DSK-STD-01|input_tokens/);
});

test('numeric log measures use finite parsed attributes and never fabricate missing values as zero', async () => {
  const measured = { ...rule, query: '@RequestPath:/WeatherForecast', logAttribute: 'order.total', aggregation: 'max', threshold: 5 };
  const fixture = queryFixture([{ ...row(8), unit: 'order.total' }]);
  const result = await fixture.query.evaluate('demo', measured);
  assert.equal(result.value, 8); assert.equal(result.status, 'Alert');
  assert.match(fixture.captured[0].sql, /maxIf\(toFloat64OrNull\(q.LogAttributes/);
  assert.match(fixture.captured[0].sql, /isFinite/); assert.equal(fixture.captured[0].params.logAttribute, 'order.total');
  const missing = queryFixture([{ ...row(0), matchCount: 0 }]);
  assert.equal((await missing.query.evaluate('demo', measured)).value, null);
  assert.equal((await missing.query.evaluate('demo', measured)).status, 'No Data');
  assert.equal((await queryFixture([row(0)]).query.evaluate('demo', measured)).value, 0);
  assert.throws(() => validateMonitor({ ...measured, noDataPolicy: 'zero' }));
});

function queryFixture(rows: ReturnType<typeof row>[]) {
  const clickhouse = new ClickhouseService({} as any, new ConfigService());
  const captured: Array<{ sql: string; params: any; settings: any }> = [];
  clickhouse.executeTenantQuery = async (_scope, sql, params, settings) => {
    captured.push({ sql, params, settings }); return rows as any;
  };
  return { clickhouse, query: new MonitorQueryService(clickhouse), captured };
}

test('history retains more than one hour of samples and expires data older than 24 hours', async () => {
  const store = new PlatformStore(new ConfigService({ AUTH_DB_PATH: ':memory:' }));
  const fixture = queryFixture([row(12)]);
  const evaluator = new MonitorEvaluatorService(store, fixture.query);
  const now = Date.now();
  const history = Array.from({ length: 150 }, (_, index) => ({ t: now - (150 - index) * 30_000, v: 1, status: 'OK' }));
  store.saveMonitor('demo', { ...rule, id: 'long-history', updatedAt: 'version', status: 'OK',
    history: [{ t: now - 90_000_000, v: 1, status: 'OK' }, ...history] });
  try {
    const result = await evaluator.evaluate('demo', 'long-history');
    assert.equal(result?.history.length, 151);
    assert.equal(result?.history[0].t, history[0].t);
  } finally { await evaluator.onModuleDestroy(); store.onModuleDestroy(); }
});

test('threshold direction, inclusivity and warning precedence are explicit', () => {
  assert.equal(compare(10, 10, 'above'), false); assert.equal(compare(10, 10, 'above_or_equal'), true);
  assert.equal(compare(10, 10, 'below'), false); assert.equal(compare(10, 10, 'below_or_equal'), true);
  assert.throws(() => validateMonitor({ ...rule, warnThreshold: 20 }));
  assert.throws(() => validateMonitor({ ...rule, evaluationWindow: 'forever' }));
  assert.throws(() => validateMonitor({ ...rule, type: 'other' }));
  assert.throws(() => validateMonitor({ ...rule, type: 'metric', query: 'avg(last_5m):avg:cpu{*}' }));
});

test('historical charts read persisted telemetry before monitor creation in one scoped query', async () => {
  const fixture = queryFixture([]);
  const to = new Date(), from = new Date(to.getTime() - 30 * 60_000);
  fixture.clickhouse.executeTenantQuery = async (scope, sql, params, settings) => {
    fixture.captured.push({ sql, params, settings });
    assert.equal(scope.tenantSlug, 'demo');
    return [{ ...row(8), bucket: from.getTime() + 300_000 }] as any;
  };
  const result = await fixture.query.history('demo', rule, from, to);
  assert.equal(result.points.length, 6); assert.equal(result.points[0].v, 8);
  assert.equal(result.points[1].v, null); assert.equal(fixture.captured.length, 1);
  assert.equal(fixture.captured[0].params.from, from.getTime());
  assert.match(fixture.captured[0].sql, /org_slug = \{tenant:String\}/);
  assert.match(fixture.captured[0].sql, /GROUP BY bucket, groupKey/);
  await assert.rejects(fixture.query.history('demo', rule, new Date(to.getTime() - 8 * 86_400_000), to));
});

test('log rules parameterize search and mandatory org/team/service/environment scope and budget', async () => {
  const fixture = queryFixture([row(12)]);
  const result = await fixture.query.evaluate('demo', { ...rule, teamId: 'platform', query: "timeout' OR 1=1", signalStatus: 'ERROR' });
  assert.equal(result.status, 'Alert');
  const { sql, params, settings } = fixture.captured[0];
  assert.match(sql, /FROM otel_logs/); assert.match(sql, /org_slug = \{tenant:String\}/);
  assert.match(sql, /team_id = \{teamId:String\}/); assert.match(sql, /filterService/); assert.match(sql, /filterEnv/);
  assert.doesNotMatch(sql, /timeout' OR/); assert.equal(params.search, "timeout' OR 1=1");
  assert.equal(params.tenant, 'demo'); assert.equal(params.signalStatus, 'ERROR');
  assert.equal(settings.read_overflow_mode, 'throw'); assert.equal(settings.max_execution_time, 10);
});

test('all three metric types and trace duration/count use bounded signal-specific SQL', async () => {
  for (const metricType of ['gauge', 'sum', 'histogram']) {
    const fixture = queryFixture([{ ...row(7), unit: 'ms' }]);
    await fixture.query.evaluate('demo', { ...rule, type: 'metric', query: 'http.duration', aggregation: 'avg', metricType });
    assert.match(fixture.captured[0].sql, new RegExp(`FROM otel_metrics_${metricType}`));
    assert.equal(fixture.captured[0].params.metric, 'http.duration');
    if (metricType !== 'gauge') assert.match(fixture.captured[0].sql, /argMax\(r\./);
    if (metricType === 'histogram') assert.match(fixture.captured[0].sql, /sum\(q.Sum\) \/ nullIf\(sum\(toFloat64\(q.Count\)\), 0\)/);
  }
  const fixture = queryFixture([{ ...row(7), unit: 'ms' }]);
  await fixture.query.evaluate('demo', { ...rule, type: 'trace', aggregation: 'p95' });
  assert.match(fixture.captured[0].sql, /quantileIf\(0.95\)\(q.Duration \/ 1000000.0/);
});

test('zero matches, absent data and query failures have different outcomes', async () => {
  assert.equal((await queryFixture([row(0)]).query.evaluate('demo', rule)).status, 'OK');
  assert.equal((await queryFixture([]).query.evaluate('demo', rule)).status, 'No Data');
  assert.equal((await queryFixture([]).query.evaluate('demo', { ...rule, noDataPolicy: 'zero' })).value, 0);
  const fixture = queryFixture([]);
  fixture.clickhouse.executeTenantQuery = async () => { throw new Error('Unavailable'); };
  await assert.rejects(fixture.query.evaluate('demo', { ...rule, noDataPolicy: 'zero' }));
});

test('an empty aggregate row is No Data, even when ClickHouse returns count=0', async () => {
  const fixture = queryFixture([{ ...row(0), sampleCount: 0, matchCount: 0 }]);
  assert.equal((await fixture.query.evaluate('demo', rule)).status, 'No Data');
  assert.equal((await fixture.query.evaluate('demo', { ...rule, noDataPolicy: 'zero' })).status, 'OK');
});

test('grouped rules choose the worst threshold state and reject inconsistent units', async () => {
  const fixture = queryFixture([row(1, '["web"]'), row(8, '["api"]')]);
  const result = await fixture.query.evaluate('demo', { ...rule, groupBy: ['service.name'] });
  assert.equal(result.status, 'Warn'); assert.equal(result.value, 8);
  assert.equal(result.groups.length, 2);
  await assert.rejects(queryFixture([{ ...row(1), unitCount: 2 }]).query.evaluate('demo', rule));
});

test('evaluations persist samples, transitions, recovery and mute suppression without editing rule time', async () => {
  const store = new PlatformStore(new ConfigService({ AUTH_DB_PATH: ':memory:' }));
  const fixture = queryFixture([row(12)]);
  const evaluator = new MonitorEvaluatorService(store, fixture.query);
  const saved = { ...rule, id: 'm1', updatedAt: 'config-time', status: 'No Data' };
  store.saveMonitor('demo', saved);
  try {
    const alert = await evaluator.evaluate('demo', 'm1');
    assert.equal(alert?.status, 'Alert'); assert.equal(alert?.events.length, 1); assert.equal(alert?.history.length, 1);
    assert.equal(alert?.updatedAt, 'config-time'); assert.ok(alert?.lastTriggeredAt);
    fixture.clickhouse.executeTenantQuery = async () => [row(0)] as any;
    const recovery = await evaluator.evaluate('demo', 'm1');
    assert.equal(recovery?.status, 'OK'); assert.equal(recovery?.events.length, 2);
    store.saveMonitor('demo', { ...recovery, isMuted: true });
    fixture.clickhouse.executeTenantQuery = async () => [row(20)] as any;
    const muted = await evaluator.evaluate('demo', 'm1');
    assert.equal(muted?.status, 'Alert'); assert.equal(muted?.events.length, 2);
    fixture.clickhouse.executeTenantQuery = async () => { throw new Error('private DB error'); };
    const failed = await evaluator.evaluate('demo', 'm1');
    assert.equal(failed?.status, 'Unknown'); assert.equal(failed?.value, null);
    assert.doesNotMatch(failed?.evaluationError, /private DB error/);
    assert.equal(await evaluator.evaluate('other', 'm1'), undefined);
  } finally { await evaluator.onModuleDestroy(); store.onModuleDestroy(); }
});

test('single-flight evaluation cannot resurrect deleted monitors or overwrite edited rules', async () => {
  const store = new PlatformStore(new ConfigService({ AUTH_DB_PATH: ':memory:' }));
  let release!: (value: any) => void;
  const query = { evaluate: () => new Promise(resolve => { release = resolve; }) } as unknown as MonitorQueryService;
  const evaluator = new MonitorEvaluatorService(store, query);
  store.saveMonitor('demo', { ...rule, id: 'm1', updatedAt: 'same', configurationVersion: 1, status: 'No Data' });
  try {
    const first = evaluator.evaluate('demo', 'm1');
    assert.equal(evaluator.evaluate('demo', 'm1'), first);
    store.saveMonitor('demo', { ...rule, id: 'm1', updatedAt: 'same', configurationVersion: 2, threshold: 99 });
    release({ status: 'Alert' }); await first;
    assert.equal(store.monitors('demo')[0].threshold, 99); assert.equal(store.monitors('demo')[0].lastEvaluatedAt, undefined);
    const next = evaluator.evaluate('demo', 'm1'); store.deleteMonitor('demo', 'm1');
    release({ status: 'Alert' }); await next;
    assert.equal(store.monitors('demo').length, 0);
  } finally { await evaluator.onModuleDestroy(); store.onModuleDestroy(); }
});
