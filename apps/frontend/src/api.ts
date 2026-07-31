import axios from 'axios';
import type {
  ApiEnvelope,
  LogRecord,
  ServiceMetrics,
  ServiceSummary,
  TraceSummary,
  TraceSpan,
} from '@/types/telemetry';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  timeout: 15_000,
});

function unwrap<T>(payload: ApiEnvelope<T> | T): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as ApiEnvelope<T>).data;
  }

  return payload as T;
}

function asNumber(value: number | string | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

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

export async function getLogs(limit: number, service?: string): Promise<LogRecord[]> {
  const response = await api.get<ApiEnvelope<LogRecord[]> | LogRecord[]>('/logs', {
    params: { limit, ...(service ? { service } : {}) },
  });

  return unwrap(response.data);
}

export async function getServices(): Promise<ServiceSummary[]> {
  const response = await api.get<ApiEnvelope<ServiceSummary[]> | ServiceSummary[]>('/services');
  return unwrap(response.data);
}

export async function getServiceMetrics(service: string): Promise<ServiceMetrics> {
  const response = await api.get<ApiEnvelope<ServiceMetrics> | ServiceMetrics>(
    `/services/${encodeURIComponent(service)}/metrics`,
  );
  return unwrap(response.data);
}

export async function generateTelemetry(): Promise<void> {
  await api.get('/data');
}

export function createEventSource(): EventSource {
  return new EventSource(`${BACKEND_URL}/api/events/stream`);
}
