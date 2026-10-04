export interface MetricRecord {
  tableName: string;
  metricType: string;
  serviceName: string;
  metricName: string;
}

export interface MetricsPage {
  total: number;
  limit: number;
  offset: number;
  service: string | null;
  metrics: MetricRecord[];
}
