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
