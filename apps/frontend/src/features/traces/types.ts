import type { AttributeMap } from '@/shared/types/telemetry';

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
