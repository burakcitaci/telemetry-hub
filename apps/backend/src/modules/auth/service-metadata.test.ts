import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ConfigService } from '@nestjs/config';
import { validateSync } from 'class-validator';
import { PlatformStore } from './platform-store.service';
import { ServiceMetadataController, ServiceMetadataDto } from './service-metadata.controller';
import { ClickhouseService } from '../telemetry/services/clickhouse.service';
import { MetricsService } from '../telemetry/services/metrics.service';
import { MonitorsController } from './monitors.controller';
import { AdminService } from './admin.service';

test('service metadata survives reopening SQLite and is isolated by organization', () => {
  const directory = mkdtempSync(join(tmpdir(), 'service-metadata-'));
  const config = new ConfigService({ AUTH_DB_PATH: join(directory, 'platform.sqlite') });
  let store = new PlatformStore(config);
  const data = { serviceName: 'api/gateway', type: 'Web', team: 'platform', onCall: '@alerts', contact: '#platform', repo: 'github.com/org/api', metadataSource: 'UI' };
  try {
    store.createTeam('demo', { id: 'platform', name: 'Platform' });
    store.createTeam('other', { id: 'other', name: 'Other' });
    const controller = new ServiceMetadataController(store);
    controller.save({ tenantSlug: 'demo', role: 'user' }, data as ServiceMetadataDto);
    controller.save({ tenantSlug: 'other', role: 'admin' }, { ...data, team: 'other' } as ServiceMetadataDto);
    store.onModuleDestroy();
    store = new PlatformStore(config);
    assert.deepEqual(store.serviceMetadata('demo'), [data]);
    assert.equal(store.serviceMetadata('other')[0].team, 'other');
    store.saveServiceMetadata('demo', data.serviceName, { ...data, type: 'DB' });
    assert.equal(store.serviceMetadata('demo').length, 1);
    assert.equal(store.serviceMetadata('demo')[0].type, 'DB');
    store.deleteServiceMetadata('demo', data.serviceName);
    assert.deepEqual(store.serviceMetadata('demo'), []);
    assert.equal(store.serviceMetadata('other').length, 1);
  } finally { store.onModuleDestroy(); rmSync(directory, { recursive: true, force: true }); }
});

test('service metadata validates types, sources and bounded input', () => {
  const dto = Object.assign(new ServiceMetadataDto(), { serviceName: '', type: 'invalid', team: 'x'.repeat(256), onCall: '', contact: '', repo: '', metadataSource: 'invalid' });
  const fields = validateSync(dto).map(error => error.property);
  for (const field of ['serviceName', 'type', 'team', 'metadataSource']) assert.ok(fields.includes(field));
});

test('ownership filters every telemetry query, overrides stale tags and remains organization scoped', async () => {
  const store = new PlatformStore(new ConfigService({ AUTH_DB_PATH: ':memory:' }));
  const logger = { log() {}, warn() {}, error() {} } as any;
  const clickhouse = new ClickhouseService(logger, new ConfigService(), store);
  const captured: any[] = [];
  (clickhouse as any).tenantSchemaReady = Promise.resolve();
  (clickhouse as any).client = { query: async (options: any) => {
    captured.push(options); return { json: async () => [] };
  } };
  const metadata = { serviceName: 'api', team: 'platform', type: 'Web', onCall: '', contact: '', repo: '', metadataSource: 'UI' };
  try {
    store.createTeam('demo', { id: 'platform', name: 'Platform' });
    store.saveServiceMetadata('demo', 'api', metadata);
    store.saveServiceMetadata('demo', 'foreign-api', { ...metadata, serviceName: 'foreign-api', team: 'backend' });
    store.saveServiceMetadata('other', 'not-in-demo', { ...metadata, serviceName: 'not-in-demo' });
    const controller = new ServiceMetadataController(store);
    assert.throws(() => controller.save({ tenantSlug: 'demo', role: 'user' }, { ...metadata, team: 'invalid' } as ServiceMetadataDto));
    assert.throws(() => store.deleteTeam('demo', 'platform'));
    const scope = { tenantSlug: 'demo', role: 'user' as const, teamFilter: 'platform', serviceFilter: 'api', envFilter: 'dev' };
    const window = { from: '2026-10-11T12:00:00Z', to: '2026-10-11T13:00:00Z', env: 'all' };
    await clickhouse.getLogs(scope, window); await clickhouse.getTraces(scope);
    await clickhouse.getTraceById(scope, 'trace'); await clickhouse.getServices(scope);
    await clickhouse.getServiceMetrics(scope, 'api', window);
    await clickhouse.getRecentTraceSignal(scope, { since: new Date(window.from), until: new Date(window.to) });
    await clickhouse.getRecentLogSignal(scope, { since: new Date(window.from), until: new Date(window.to) });
    await new MetricsService(clickhouse, logger).getMetricDetail(scope, 'api', 'http.requests', 100, window);
    assert.equal(captured.length, 10);
    for (const query of captured) {
      assert.match(query.query, /org_slug = \{tenant:String\}/);
      assert.match(query.query, /ServiceName IN \{ownedServices:Array\(String\)\}/);
      assert.match(query.query, /ServiceName NOT IN \{assignedServices:Array\(String\)\}/);
      assert.deepEqual(query.query_params.ownedServices, ['api']);
      assert.deepEqual(query.query_params.assignedServices, ['api', 'foreign-api']);
      assert.equal(query.query_params.tenant, 'demo');
    }
    store.saveMonitor('demo', { id: 'owned', service: 'api', teamId: 'backend' });
    const monitors = new MonitorsController(store, new AdminService(store));
    assert.equal(monitors.list({ tenantSlug: 'demo', role: 'admin', teamFilter: 'platform' }).length, 1);
    assert.equal(monitors.list({ tenantSlug: 'demo', role: 'admin', teamFilter: 'backend' }).length, 0);
    store.saveServiceMetadata('demo', 'api', { ...metadata, team: 'backend' });
    assert.deepEqual(store.serviceOwnership('demo', 'platform').owned, []);
    assert.equal(monitors.list({ tenantSlug: 'demo', role: 'user', teamFilter: 'platform' }).length, 0);
    assert.equal(clickhouse.buildTenantFilter({ tenantSlug: 'demo', role: 'admin' }).where, 'WHERE org_slug = {tenant:String}');
  } finally { store.onModuleDestroy(); }
});
