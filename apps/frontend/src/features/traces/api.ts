import { api, asNumber, unwrap } from '@/shared/api/client';
import type { ApiEnvelope } from '@/shared/types/telemetry';
import type { TraceSpan, TraceSummary } from '@/features/traces/types';

function normalizeSpan(span: TraceSpan & { Duration?: number | string }): TraceSpan {
  return {
    ...span,
    TraceId: span.TraceId || '',
    SpanId: span.SpanId || '',
    SpanName: span.SpanName || 'Unknown operation',
    ServiceName: span.ServiceName || 'Unknown service',
    Timestamp: span.Timestamp || '',
    Duration: asNumber(span.Duration),
    StatusCode: span.StatusCode || 'UNSET',
    SpanAttributes: span.SpanAttributes || {},
  };
}

function normalizeTrace(trace: TraceSummary & { Duration?: number | string }): TraceSummary {
  return {
    ...trace,
    TraceId: trace.TraceId || '',
    SpanName: trace.SpanName || 'Unknown operation',
    ServiceName: trace.ServiceName || 'Unknown service',
    Timestamp: trace.Timestamp || '',
    Duration: asNumber(trace.Duration),
    StatusCode: trace.StatusCode || 'UNSET',
    SpanCount: asNumber(trace.SpanCount),
    ServiceCount: asNumber(trace.ServiceCount),
    SpanAttributes: trace.SpanAttributes || {},
  };
}

export async function getTraces(limit: number, service?: string): Promise<TraceSummary[]> {
  const response = await api.get<ApiEnvelope<TraceSummary[]> | TraceSummary[]>('/traces', {
    params: { limit, ...(service ? { service } : {}) },
  });

  return unwrap(response.data).map(normalizeTrace);
}

export async function getTraceById(traceId: string): Promise<TraceSpan[]> {
  const response = await api.get<ApiEnvelope<TraceSpan[]> | TraceSpan[]>(
    `/traces/${encodeURIComponent(traceId)}`,
  );

  return unwrap(response.data).map(normalizeSpan);
}
