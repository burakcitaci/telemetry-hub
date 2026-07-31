export type AttributeMap = Record<string, string>;

export interface TraceSpan {
  TraceId: string;
  SpanId: string;
  ParentSpanId?: string;
  SpanName: string;
  ServiceName: string;
  Timestamp: string;
  Duration: number;
  StatusCode: string;
  SpanKind?: string;
  StatusMessage?: string;
  ResourceAttributes?: AttributeMap;
  SpanAttributes?: AttributeMap;
}

export interface TraceSummary {
  TraceId: string;
  SpanName: string;
  ServiceName: string;
  Timestamp: string;
  Duration: number;
  StatusCode: string;
  SpanId?: string;
  SpanCount: number;
  ServiceCount: number;
  SpanAttributes?: AttributeMap;
}

export interface LogRecord {
  Timestamp: string;
  TraceId: string;
  SpanId: string;
  SeverityText: string;
  ServiceName: string;
  Body: string;
  TimestampTime?: string;
  TraceFlags?: number;
  SeverityNumber?: number;
  ResourceSchemaUrl?: string;
  ResourceAttributes?: AttributeMap;
  ScopeSchemaUrl?: string;
  ScopeName?: string;
  ScopeVersion?: string;
  ScopeAttributes?: AttributeMap;
  LogAttributes?: AttributeMap;
}

export interface ServiceSummary {
  ServiceName: string;
}

export interface ServiceMetrics {
  request_count: string | number;
  avg_duration: string | number;
  p50_duration: string | number;
  p95_duration: string | number;
  p99_duration: string | number;
  error_count: string | number;
}

export interface TelemetryUpdateEvent {
  type: 'update';
  timestamp?: string;
  tracesChanged: boolean;
  logsChanged: boolean;
}

export interface TelemetryConnectedEvent {
  type: 'connected';
  message?: string;
}

export type TelemetryEvent = TelemetryConnectedEvent | TelemetryUpdateEvent;

export interface ApiEnvelope<T> {
  data: T;
  timestamp?: string;
  path?: string;
  method?: string;
}
