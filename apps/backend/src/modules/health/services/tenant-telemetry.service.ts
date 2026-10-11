import { BadRequestException, Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PlatformStore } from '../../auth/platform-store.service';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';
import type { TenantScope } from '../../auth/auth.types';

@Injectable()
export class TenantTelemetryService {
  constructor(private readonly config: ConfigService, @Inject(PlatformStore) private readonly store?: PlatformStore) {}

  async generate(scope: TenantScope): Promise<void> {
    const resource = this.resource(scope);
    const start = BigInt(Date.now()) * 1_000_000n;
    const end = start + 25_000_000n;
    const traceId = randomBytes(16).toString('hex');
    const spanId = randomBytes(8).toString('hex');
    await Promise.all([
      this.export('traces', { resourceSpans: [{ resource, scopeSpans: [{
        scope: { name: 'tenant-demo' }, spans: [{ traceId, spanId,
          name: 'Generate telemetry', kind: 2, startTimeUnixNano: String(start),
          endTimeUnixNano: String(end), status: { code: 1 } }],
      }] }] }),
      this.export('logs', { resourceLogs: [{ resource, scopeLogs: [{
        scope: { name: 'tenant-demo' }, logRecords: [{ traceId, spanId,
          timeUnixNano: String(end), severityNumber: 9, severityText: 'INFO',
          body: { stringValue: 'Demo telemetry generated successfully' } }],
      }] }] }),
      this.export('metrics', this.metricPayload(resource, start, end)),
    ]);
  }

  private resource(scope: TenantScope) {
    const service = singleFilter(scope.serviceFilter) || this.config.get<string>('OTEL_SERVICE_NAME') || 'backend-service';
    const team = this.store?.serviceTeam(scope.tenantSlug, service)
      ?? (scope.role === 'admin' ? singleFilter(scope.teamFilter) ?? scope.teamId : scope.teamId);
    if (!team) {
      throw new BadRequestException(
        `Assign service "${service}" to a team in organization "${scope.tenantSlug}" before generating telemetry, or select one team.`,
      );
    }
    if (this.store && !this.store.teams(scope.tenantSlug).some(candidate => candidate.id === team)) {
      throw new BadRequestException('The telemetry team must belong to the authenticated organization.');
    }
    const attributes = {
      'service.name': service,
      'deployment.environment.name': singleFilter(scope.envFilter) || this.config.get<string>('DEPLOY_ENV') || 'production',
      'org.slug': scope.tenantSlug,
      'team.id': team,
    };
    return { attributes: Object.entries(attributes).map(([key, value]) => ({
      key, value: { stringValue: value },
    })) };
  }

  private metricPayload(resource: ReturnType<TenantTelemetryService['resource']>, start: bigint, end: bigint) {
    const point = { startTimeUnixNano: String(start), timeUnixNano: String(end) };
    const scope = { name: 'tenant-demo' };
    return { resourceMetrics: [{ resource, scopeMetrics: [{ scope, metrics: [
      { name: 'demo.requests', unit: '1', sum: { aggregationTemporality: 1,
        isMonotonic: true, dataPoints: [{ ...point, asDouble: 1 }] } },
      { name: 'demo.duration', unit: 'ms', histogram: { aggregationTemporality: 1,
        dataPoints: [{ ...point, count: '1', sum: 25, min: 25, max: 25,
          explicitBounds: [10, 50, 100], bucketCounts: ['0', '1', '0', '0'] }] } },
      { name: 'demo.memory', unit: 'By', gauge: { dataPoints: [{ ...point,
        asDouble: process.memoryUsage().heapUsed }] } },
    ] }] }] };
  }

  private async export(signal: string, payload: unknown): Promise<void> {
    const endpoint = this.config.get<string>('OTEL_EXPORTER_OTLP_ENDPOINT') || 'http://localhost:4318';
    try {
      const response = await fetch(`${endpoint.replace(/\/$/, '')}/v1/${signal}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload), signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new Error(`Collector returned ${response.status}`);
      const result = await response.json() as { partialSuccess?: { errorMessage?: string } };
      if (result.partialSuccess?.errorMessage) throw new Error(result.partialSuccess.errorMessage);
    } catch (cause) {
      throw new ServiceUnavailableException('Demo telemetry export failed.', { cause });
    }
  }
}
import { singleFilter } from '../../auth/platform-filters';
