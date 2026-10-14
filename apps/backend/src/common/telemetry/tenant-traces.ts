import type { Attributes, Context } from '@opentelemetry/api';
import { resourceFromAttributes } from '@opentelemetry/resources';
import type {
  ReadableSpan, Span, SpanExporter, SpanProcessor,
} from '@opentelemetry/sdk-trace-base';
import type { ExportResult } from '@opentelemetry/core';
import { telemetryScopeForSpan, telemetryServiceTeam } from './tenant-context';

const owners = new WeakMap<object, Attributes>();

function spanOwner(span: ReadableSpan): Attributes | undefined {
  const scope = telemetryScopeForSpan(span);
  const org = scope?.tenantSlug ?? span.resource.attributes['org.slug'];
  if (typeof org !== 'string' || !org) return undefined;
  const service = String(span.resource.attributes['service.name'] ?? '');
  const team = telemetryServiceTeam(org, service)
    ?? scope?.teamId ?? span.resource.attributes['team.id'] ?? '';
  return { 'org.slug': org, 'team.id': String(team) };
}

function withOwner(span: ReadableSpan, owner: Attributes): ReadableSpan {
  return {
    name: span.name, kind: span.kind, spanContext: () => span.spanContext(),
    parentSpanContext: span.parentSpanContext, startTime: span.startTime,
    endTime: span.endTime, status: span.status,
    attributes: { ...span.attributes, ...owner }, links: span.links,
    events: span.events, duration: span.duration, ended: span.ended,
    resource: span.resource.merge(resourceFromAttributes(owner)),
    instrumentationScope: span.instrumentationScope,
    droppedAttributesCount: span.droppedAttributesCount,
    droppedEventsCount: span.droppedEventsCount,
    droppedLinksCount: span.droppedLinksCount,
  };
}

export class TenantSpanContextProcessor implements SpanProcessor {
  onStart(_span: Span, _parentContext: Context): void {}
  onEnd(span: ReadableSpan): void {
    const owner = spanOwner(span);
    if (owner) owners.set(span, owner);
  }
  async forceFlush(): Promise<void> {}
  async shutdown(): Promise<void> {}
}

export class TenantSpanExporter implements SpanExporter {
  constructor(private readonly exporter: SpanExporter) {}
  export(spans: ReadableSpan[], callback: (result: ExportResult) => void): void {
    this.exporter.export(spans.map(span => {
      const owner = owners.get(span);
      return owner ? withOwner(span, owner) : span;
    }), callback);
  }
  shutdown(): Promise<void> { return this.exporter.shutdown(); }
  forceFlush(): Promise<void> { return this.exporter.forceFlush?.() ?? Promise.resolve(); }
}
