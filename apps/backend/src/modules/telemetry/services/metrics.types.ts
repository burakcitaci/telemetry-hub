export interface MetricSummary {
    metricName: string;
    metricDescription: string;
    metricUnit: string;
    serviceName: string;
    attributes: Record<string, string>;
    count: number;
    sum: number;
    min: number;
    max: number;
    average: number;
    bucketCounts: number[];
    explicitBounds: number[];
    timeUnix: string;
}

export interface ServiceMetricsOverview {
    serviceName: string;
    metricsCount: number;
    metrics: MetricSummary[];
}

export interface MetricsByScopeResult {
    scopeName: string;
    scopeVersion: string;
    metrics: MetricSummary[];
}

export interface MetricDetailRecord {
    serviceName: string;
    metricName: string;
    metricType: 'histogram' | 'sum' | 'gauge' | 'summary' | 'unknown';
    metricDescription: string;
    metricUnit: string;
    attributes: Record<string, string>;
    resourceAttributes: Record<string, string>;
    tableName: string;
    timeUnix: string;
    startTimeUnix: string;
    count: number;
    sum: number;
    min: number;
    max: number;
    bucketCounts: number[];
    explicitBounds: number[];
    aggregationTemporality?: number;
}

export interface MetricDetailResponse {
    serviceName: string;
    metricName: string;
    metricType: string;
    returnedRecords: number;
    truncated: boolean;
    records: MetricDetailRecord[];
}

export interface MetricStatistics {
    count: number;
    sum: number;
    min: number;
    max: number;
    mean: number;
    p50: number | null;
    p95: number | null;
    p99: number | null;
    stdDev: number | null;
    distributionComplete: boolean;
}
