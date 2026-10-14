import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SpanKind } from '@opentelemetry/api';
import { ExportResultCode } from '@opentelemetry/core';
import { resourceFromAttributes } from '@opentelemetry/resources';
import type { ReadableSpan } from '@opentelemetry/sdk-trace-base';
import {
  recordTelemetrySpanScope, registerTelemetryOwnership,
} from './tenant-context';
import { TenantSpanContextProcessor, TenantSpanExporter } from './tenant-traces';

function readableSpan(traceId: string): ReadableSpan {
  return {
    name: 'GET', kind: SpanKind.SERVER,
    spanContext: () => ({ traceId, spanId: 'b'.repeat(16), traceFlags: 1 }),
    startTime: [1, 0], endTime: [2, 0], duration: [1, 0], ended: true,
    status: { code: 0 }, attributes: {}, links: [], events: [],
    resource: resourceFromAttributes({ 'service.name': 'tenant-heavy', 'team.id': '' }),
    instrumentationScope: { name: 'test' }, droppedAttributesCount: 0,
    droppedEventsCount: 0, droppedLinksCount: 0,
  };
}

test('trace export binds ownership to the span object, not a globally colliding trace id', async () => {
  const traceId = 'a'.repeat(32);
  const input = readableSpan(traceId);
  const output: ReadableSpan[] = [];
  const release = registerTelemetryOwnership((org, service) =>
    org === 'demo' && service === 'tenant-heavy' ? 'platform' : undefined);
  const processor = new TenantSpanContextProcessor();
  const exporter = new TenantSpanExporter({
    export: (spans, callback) => { output.push(...spans); callback({ code: ExportResultCode.SUCCESS }); },
    shutdown: async () => {}, forceFlush: async () => {},
  });
  try {
    recordTelemetrySpanScope(input, { tenantSlug: 'demo', role: 'admin' });
    const collision = readableSpan(traceId);
    recordTelemetrySpanScope(collision, { tenantSlug: 'other', role: 'admin' });
    processor.onEnd(input);
    await new Promise<void>((resolve, reject) => exporter.export([input], result =>
      result.code === ExportResultCode.SUCCESS ? resolve() : reject(result.error)));
    assert.equal(output[0].resource.attributes['org.slug'], 'demo');
    assert.equal(output[0].resource.attributes['team.id'], 'platform');
    assert.equal(output[0].attributes['team.id'], 'platform');
    assert.equal(output[0].spanContext().traceId, traceId);
    assert.equal(input.resource.attributes['team.id'], '');
    assert.equal(collision.spanContext().traceId, traceId);
  } finally { release(); }
});
