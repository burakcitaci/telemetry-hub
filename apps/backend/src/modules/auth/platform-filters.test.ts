import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PlatformStore } from './platform-store.service';
import { TenantJwtGuard } from './tenant-jwt.guard';
import { ClickhouseService } from '../telemetry/services/clickhouse.service';
import { MetricsService } from '../telemetry/services/metrics.service';
import { FilterOptionsDto, FiltersController } from '../telemetry/controllers/filters.controller';
import { ValidationPipe } from '../../common/pipes/validation.pipe';
import { listFilteredMonitors } from './monitors.controller';

test('filter discovery DTO accepts source/time and rejects unsupported query parameters', async () => {
  const query = { source: 'metrics', from: '2026-10-14T12:00:00Z', to: '2026-10-14T13:00:00Z' };
  const pipe = new ValidationPipe();
  const metadata = { type: 'query' as const, metatype: FilterOptionsDto };
  assert.equal((await pipe.transform(query, metadata)).source, 'metrics');
  await assert.rejects(pipe.transform({ ...query, env: 'all' }, metadata), (error: any) => error.getStatus() === 400);
});

test('guard accepts JSON headers and repeated stream filters and rejects unbounded/malformed values', async () => {
  const store = new PlatformStore(new ConfigService({ AUTH_DB_PATH: ':memory:' }));
  const jwt = { verifyAsync: async () => ({ tenantSlug: 'demo', role: 'admin', sub: 'u', version: 1 }) } as unknown as JwtService;
  store.isSessionActive = () => true;
  const guard = new TenantJwtGuard(jwt, store, new ConfigService());
  const request = (headers: Record<string, string>, query: any = {}) => ({ method: 'GET', headers: { cookie: 'telemetry_session=test' }, query, header: (name: string) => headers[name] });
  const run = (req: any) => guard.canActivate({ switchToHttp: () => ({ getRequest: () => req }) } as any);
  try {
    const req: any = request({ 'x-team-filter': '["platform","backend"]', 'x-status-filter': '["ERROR","WARN"]' }, { globalEnv: ['dev', 'production'], globalService: ['api', 'web'] });
    await run(req);
    assert.deepEqual(req.teamFilter, ['platform', 'backend']);
    assert.deepEqual(req.envFilter, ['dev', 'production']);
    assert.deepEqual(req.statusFilter, ['ERROR', 'WARN']);
    await assert.rejects(run(request({ 'x-team-filter': '[invalid' })));
    await assert.rejects(run(request({ 'x-team-filter': JSON.stringify(Array(51).fill('team')) })));
    await assert.rejects(run(request({}, { globalStatus: ['ERROR', {}] })));
  } finally { store.onModuleDestroy(); }
});

test('multiple selections use OR within dimensions and AND across dimensions, including status and ownership', async () => {
  const store = new PlatformStore(new ConfigService({ AUTH_DB_PATH: ':memory:' }));
  const logger = { log() {}, warn() {}, error() {} } as any;
  const clickhouse = new ClickhouseService(logger, new ConfigService(), store);
  const queries: any[] = [];
  (clickhouse as any).tenantSchemaReady = Promise.resolve();
  (clickhouse as any).client = { query: async (query: any) => { queries.push(query); return { json: async () => [] }; } };
  const scope = { tenantSlug: 'demo', role: 'user' as const, teamFilter: ['backend', 'frontend'], serviceFilter: ['api', 'web'], envFilter: ['dev', 'production'], statusFilter: ['ERROR', 'WARN'] };
  const window = { from: '2026-10-11T12:00:00Z', to: '2026-10-11T13:00:00Z' };
  try {
    store.saveServiceMetadata('demo', 'api', { serviceName: 'api', team: 'backend' });
    store.saveServiceMetadata('demo', 'web', { serviceName: 'web', team: 'frontend' });
    await clickhouse.getLogs(scope, window); await clickhouse.getTraces(scope);
    await clickhouse.getRecentLogSignal(scope, { since: new Date(window.from), until: new Date(window.to) });
    await clickhouse.getRecentTraceSignal(scope, { since: new Date(window.from), until: new Date(window.to) });
    await new MetricsService(clickhouse, logger).getMetricDetail(scope, 'api', 'requests', 100, window);
    for (const query of queries) {
      assert.match(query.query, /org_slug = \{tenant:String\}/);
      assert.match(query.query, /team_id IN \{teamId:Array\(String\)\}/);
      assert.match(query.query, /ServiceName IN \{filterService:Array\(String\)\}/);
      assert.match(query.query, /deployment.environment.name.*IN \{filterEnv:Array\(String\)\}/);
      assert.deepEqual(query.query_params.ownedServices, ['api', 'web']);
      if (query.query.includes('FROM otel_metrics')) assert.doesNotMatch(query.query, /filterStatuses/);
      else { assert.match(query.query, /IN \{filterStatuses:Array\(String\)\}/); assert.deepEqual(query.query_params.filterStatuses, ['ERROR', 'WARN']); }
    }
    assert.ok(queries[0].query.includes('SeverityText'));
    assert.ok(queries[1].query.indexOf('filterStatuses') > queries[1].query.indexOf('GROUP BY TraceId'));
  } finally { store.onModuleDestroy(); }
});

test('status discovery uses the relevant table and exact date window, not a static list', async () => {
  const store = new PlatformStore(new ConfigService({ AUTH_DB_PATH: ':memory:' }));
  const clickhouse = new ClickhouseService({} as any, new ConfigService(), store);
  const queries: any[] = [];
  clickhouse.executeTenantQuery = async (_scope: any, sql: string, params: any) => {
    queries.push({ sql, params });
    return (sql.includes('AS status') ? [{ status: 'ERROR' }, { status: 'WARN' }] : [{ service: 'api', env: 'dev' }]) as any;
  };
  const controller = new FiltersController(clickhouse, store);
  const scope = { tenantSlug: 'demo', role: 'admin' as const, statusFilter: ['ERROR'] };
  const from = '2026-10-11T12:55:00Z', to = '2026-10-11T13:00:00Z';
  try {
    const options = await controller.options(scope, { source: 'logs', from, to });
    assert.deepEqual(options.statuses, ['ERROR', 'WARN']);
    for (const query of queries) {
      assert.match(query.sql, /FROM otel_logs/); assert.doesNotMatch(query.sql, /otel_traces|otel_metrics/);
      assert.equal(query.params.from, Date.parse(from)); assert.equal(query.params.to, Date.parse(to));
      assert.match(query.sql, /org_slug = \{tenant:String\}/);
      assert.doesNotMatch(query.sql, /filterStatuses/);
    }
    await assert.rejects(controller.options(scope, { source: 'logs', from: to, to: from }));
  } finally { store.onModuleDestroy(); }
});

test('monitor filtering supports multi-selection and discovery honors evaluation bounds', async () => {
  const store = new PlatformStore(new ConfigService({ AUTH_DB_PATH: ':memory:' }));
  const clickhouse = new ClickhouseService({} as any, new ConfigService(), store);
  clickhouse.executeTenantQuery = async () => [];
  try {
    store.saveMonitor('demo', { id: '1', teamId: 'backend', service: 'api', env: 'dev', status: 'Alert', lastEvaluatedAt: '2026-10-11T12:57:00Z' });
    store.saveMonitor('demo', { id: '2', teamId: 'frontend', service: 'web', env: 'prod', status: 'OK', lastEvaluatedAt: '2026-10-11T12:58:00Z' });
    store.saveMonitor('demo', { id: '3', teamId: 'backend', service: 'api', env: 'dev', status: 'Warn', lastEvaluatedAt: '2026-10-10T12:00:00Z' });
    store.saveMonitor('other', { id: '4', status: 'Foreign', lastEvaluatedAt: '2026-10-11T12:59:00Z' });
    const scope = { tenantSlug: 'demo', role: 'user' as const, teamFilter: ['backend', 'frontend'], serviceFilter: ['api', 'web'], envFilter: ['dev', 'prod'], statusFilter: ['Alert', 'OK'] };
    assert.equal(listFilteredMonitors(store, scope).length, 2);
    const result = await new FiltersController(clickhouse, store).options(scope,
      { source: 'monitors', from: '2026-10-11T12:55:00Z', to: '2026-10-11T13:00:00Z' });
    assert.deepEqual(result.statuses, ['Alert', 'OK']);
  } finally { store.onModuleDestroy(); }
});
