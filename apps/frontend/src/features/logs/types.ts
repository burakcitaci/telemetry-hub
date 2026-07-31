import type { AttributeMap } from '@/shared/types/telemetry';

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
