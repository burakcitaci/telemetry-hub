import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LoggerProvider, BatchLogRecordProcessor, type ReadableLogRecord } from '@opentelemetry/sdk-logs';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ExportResultCode } from '@opentelemetry/core';
import { ConfigService } from '@nestjs/config';
import { PlatformStore } from '../../modules/auth/platform-store.service';
import { TenantTelemetryService } from '../../modules/health/services/tenant-telemetry.service';
import { TenantLogContextProcessor, TenantLogExporter } from './tenant-logs';
import { authenticatedTelemetryScope, currentTelemetryScope, runTelemetryContext } from './tenant-context';
import { LoggerMiddleware } from '../middleware/logger.middleware';
import { EventEmitter } from 'node:events';
import { ROOT_CONTEXT, trace } from '@opentelemetry/api';

test('batched logs capture request ownership without cross-tenant leaks or global resource mutation', async () => {
  const store = new PlatformStore(new ConfigService({ AUTH_DB_PATH: ':memory:' }));
  const records: ReadableLogRecord[] = [];
  const deployment = resourceFromAttributes({ 'org.slug': 'deployment', 'team.id': 'ops', 'service.name': 'tenant-heavy', 'host.name': 'backend-host' });
  const provider = new LoggerProvider({ resource: deployment, processors: [
    new TenantLogContextProcessor(),
    new BatchLogRecordProcessor({ exporter: new TenantLogExporter({
      export: (batch, callback) => { records.push(...batch); callback({ code: ExportResultCode.SUCCESS }); },
      shutdown: async () => {}, forceFlush: async () => {},
    }), scheduledDelayMillis: 60_000 }),
  ] });
  const logger = provider.getLogger('backend-service');
  try {
    store.saveServiceMetadata('demo', 'tenant-heavy', { team: 'platform', serviceName: 'tenant-heavy' });
    store.saveServiceMetadata('other', 'tenant-heavy', { team: 'backend', serviceName: 'tenant-heavy' });
    await Promise.all(['demo', 'other'].map(tenantSlug => runTelemetryContext({}, async () => {
      authenticatedTelemetryScope({ tenantSlug, role: 'user', teamId: 'member-team' });
      await Promise.resolve();
      logger.emit({ body: tenantSlug, severityText: 'INFO', severityNumber: 9, eventName: 'request-log',
        context: trace.setSpanContext(ROOT_CONTEXT, { traceId: 'a'.repeat(32), spanId: 'b'.repeat(16), traceFlags: 1 }),
        attributes: { 'org.slug': 'forged', 'team.id': 'forged' } });
    })));
    store.saveServiceMetadata('demo', 'tenant-heavy', { team: 'new-team', serviceName: 'tenant-heavy' });
    logger.emit({ body: 'background', severityText: 'INFO' });
    await provider.forceFlush();
    assert.equal(currentTelemetryScope(), undefined);
    for (const [org, team] of [['demo', 'platform'], ['other', 'backend'], ['deployment', 'ops']]) {
      const record = records.find(row => row.body === (org === 'deployment' ? 'background' : org))!;
      assert.equal(record.resource.attributes['org.slug'], org);
      assert.equal(record.resource.attributes['team.id'], team);
      assert.equal(record.resource.attributes['host.name'], 'backend-host');
      assert.equal(record.resource.attributes['service.name'], 'tenant-heavy');
      assert.equal(record.attributes['team.id'], team);
      assert.equal(record.severityText, 'INFO'); assert.equal(record.hrTime.length, 2);
      if (org !== 'deployment') {
        assert.equal(record.spanContext?.traceId, 'a'.repeat(32));
        assert.equal(record.severityNumber, 9); assert.equal(record.eventName, 'request-log');
      }
    }
    assert.equal(deployment.attributes['org.slug'], 'deployment');
    assert.equal(deployment.attributes['team.id'], 'ops');
    await runTelemetryContext({}, async () => {
      authenticatedTelemetryScope({ tenantSlug: 'demo', role: 'admin' });
      logger.emit({ body: 'reassigned' });
    });
    await provider.forceFlush();
    assert.equal(records.find(row => row.body === 'reassigned')!.resource.attributes['team.id'], 'new-team');
  } finally { await provider.shutdown(); store.onModuleDestroy(); }
});

test('HTTP finish logs re-enter their own validated request context', () => {
  const captured: string[] = [];
  const middleware = new LoggerMiddleware({ logWithAttributes: () => captured.push(currentTelemetryScope()!.tenantSlug) } as any);
  const response = Object.assign(new EventEmitter(), { statusCode: 200 });
  middleware.use({ method: 'GET', originalUrl: '/api/logs', ip: 'localhost' } as any, response as any,
    () => authenticatedTelemetryScope({ tenantSlug: 'demo', role: 'admin' }));
  runTelemetryContext({ scope: { tenantSlug: 'other', role: 'user' } }, () => response.emit('finish'));
  assert.deepEqual(captured, ['demo']);
  assert.equal(currentTelemetryScope(), undefined);
});

test('generated logs, traces and metrics receive catalog team ownership even for an admin without a team', async () => {
  const store = new PlatformStore(new ConfigService({ AUTH_DB_PATH: ':memory:' }));
  const originalFetch = globalThis.fetch;
  const payloads: any[] = [];
  try {
    store.createTeam('demo', { id: 'platform', name: 'Platform' });
    store.saveServiceMetadata('demo', 'tenant-heavy', { serviceName: 'tenant-heavy', team: 'platform' });
    globalThis.fetch = async (_url, options) => { payloads.push(JSON.parse(String(options?.body))); return new Response('{}'); };
    const generator = new TenantTelemetryService(new ConfigService({ OTEL_SERVICE_NAME: 'tenant-heavy' }), store);
    await generator.generate({ tenantSlug: 'demo', role: 'admin' });
    assert.equal(payloads.length, 3);
    for (const payload of payloads) {
      const group = (Object.values(payload)[0] as any[])[0];
      const attrs = Object.fromEntries(group.resource.attributes.map((attr: any) => [attr.key, attr.value.stringValue]));
      assert.equal(attrs['team.id'], 'platform'); assert.equal(attrs['org.slug'], 'demo');
      assert.equal(attrs['service.name'], 'tenant-heavy');
    }
  } finally { globalThis.fetch = originalFetch; store.onModuleDestroy(); }
});
