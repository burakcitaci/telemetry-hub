import assert from 'node:assert/strict';
import { test } from 'node:test';
import { context, ROOT_CONTEXT, SpanKind, trace } from '@opentelemetry/api';
import { ExportResultCode } from '@opentelemetry/core';
import { resourceFromAttributes } from '@opentelemetry/resources';
import type { ReadableSpan } from '@opentelemetry/sdk-trace-base';
import {
  authenticatedTelemetryScope, registerTelemetryOwnership,
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

test('trace export adds catalog team ownership captured by trace id', async () => {
  const traceId = 'a'.repeat(32);
  const input = readableSpan(traceId);
  const output: ReadableSpan[] = [];
  const release = registerTelemetryOwnership((org, service) =>
    org === 'demo' && service === 'tenant-heavy' ? 'platform' : undefined);
  const processor = new TenantSpanContextProcessor();
  let activeContext = ROOT_CONTEXT;
  context.setGlobalContextManager({
    active: () => activeContext,
    with: (ctx, fn, thisArg, ...args) => {
      const previous = activeContext;
      activeContext = ctx;
      try { return fn.call(thisArg, ...args); } finally { activeContext = previous; }
    },
    bind: (_ctx, target) => target, enable() { return this; }, disable() { return this; },
  });
  const exporter = new TenantSpanExporter({
    export: (spans, callback) => { output.push(...spans); callback({ code: ExportResultCode.SUCCESS }); },
    shutdown: async () => {}, forceFlush: async () => {},
  });
  try {
    const requestContext = trace.setSpanContext(ROOT_CONTEXT,
      { traceId, spanId: 'b'.repeat(16), traceFlags: 1 });
    context.with(requestContext, () =>
      authenticatedTelemetryScope({ tenantSlug: 'demo', role: 'admin' }));
    processor.onEnd(input);
    await new Promise<void>((resolve, reject) => exporter.export([input], result =>
      result.code === ExportResultCode.SUCCESS ? resolve() : reject(result.error)));
    assert.equal(output[0].resource.attributes['org.slug'], 'demo');
    assert.equal(output[0].resource.attributes['team.id'], 'platform');
    assert.equal(output[0].attributes['team.id'], 'platform');
    assert.equal(output[0].spanContext().traceId, traceId);
    assert.equal(input.resource.attributes['team.id'], '');
  } finally { context.disable(); release(); }
});
