import { resourceFromAttributes } from '@opentelemetry/resources';
import type { Attributes } from '@opentelemetry/api';
import type { LogRecordExporter, LogRecordProcessor, ReadableLogRecord, ReadWriteLogRecord } from '@opentelemetry/sdk-logs';
import type { ExportResult } from '@opentelemetry/core';
import { currentTelemetryScope, telemetryServiceTeam } from './tenant-context';

// Capture trusted context at emission, not when an unrelated request flushes the batch.
const owners = new WeakMap<object, Attributes>();

export class TenantLogContextProcessor implements LogRecordProcessor {
  onEmit(record: ReadWriteLogRecord): void {
    const scope = currentTelemetryScope();
    const org = scope?.tenantSlug ?? record.resource.attributes['org.slug'];
    if (typeof org !== 'string' || !org) return;
    const service = String(record.resource.attributes['service.name'] ?? '');
    const team = telemetryServiceTeam(org, service) ?? scope?.teamId ?? record.resource.attributes['team.id'] ?? '';
    const owner = { 'org.slug': org, 'team.id': String(team) };
    owners.set(record, owner);
    record.setAttributes(owner);
  }
  async forceFlush(): Promise<void> {}
  async shutdown(): Promise<void> {}
}

export class TenantLogExporter implements LogRecordExporter {
  constructor(private readonly exporter: LogRecordExporter) {}
  export(records: ReadableLogRecord[], callback: (result: ExportResult) => void): void {
    this.exporter.export(records.map(record => {
      const owner = owners.get(record);
      if (!owner) return record;
      // SDK fields such as body are prototype getters, not enumerable own fields.
      return { hrTime: record.hrTime, hrTimeObserved: record.hrTimeObserved,
        spanContext: record.spanContext, severityNumber: record.severityNumber,
        severityText: record.severityText, body: record.body, eventName: record.eventName,
        attributes: record.attributes, instrumentationScope: record.instrumentationScope,
        droppedAttributesCount: record.droppedAttributesCount,
        resource: record.resource.merge(resourceFromAttributes(owner)) };
    }), callback);
  }
  shutdown(): Promise<void> { return this.exporter.shutdown(); }
  forceFlush(): Promise<void> { return this.exporter.forceFlush(); }
}
