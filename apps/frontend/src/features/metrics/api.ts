import { api, unwrap } from '@/shared/api/client';
import type { ApiEnvelope } from '@/shared/types/telemetry';
import type { MetricsPage } from '@/features/metrics/types';

export async function getMetrics(limit: number, offset: number): Promise<MetricsPage> {
  const response = await api.get<ApiEnvelope<MetricsPage> | MetricsPage>('/metrics', {
    params: { limit, offset },
  });
  return unwrap(response.data);
}

import type { MetricRecord } from '@/features/metrics/types';

// Extended metric record with histogram details
export interface MetricDetailRecord extends MetricRecord {
  metricDescription?: string;
  metricUnit?: string;
  bucketCounts?: number[];
  explicitBounds?: number[];
  exemplars?: {
    filterAttributes?: Record<string, string>;
    timeUnix?: number;
    value?: number;
    spanId?: string;
    traceId?: string;
  }[];
  aggregationTemporality?: string;
}

export interface MetricDetailResponse {
  serviceName: string;
  metricName: string;
  metricType: string;
  totalRecords: number;
  records: MetricDetailRecord[];
}

/**
 * Fetch detailed metric data for a specific service and metric name
 * Returns all histogram records with bucket distribution data
 */
export async function getMetricDetail(
  serviceName: string,
  metricName: string,
): Promise<MetricDetailResponse> {
  const response = await api.get<
    ApiEnvelope<MetricDetailResponse> | MetricDetailResponse
  >('/metrics/detail', {
    params: {
      service: serviceName,
      metric: metricName,
    },
  });

  return unwrap(response.data);
}

/**
 * Export metric data as CSV
 */
export async function exportMetricAsCSV(
  serviceName: string,
  metricName: string,
): Promise<Blob> {
  const params = new URLSearchParams({
    service: serviceName,
    metric: metricName,
    format: 'csv',
  });

  const response = await fetch(`/api/metrics/detail?${params}`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`Failed to export metric data: ${response.status}`);
  }

  return response.blob();
}

/**
 * Get metric statistics (percentiles, distribution)
 */
export interface MetricStatistics {
  count: number;
  sum: number;
  min: number;
  max: number;
  mean: number;
  p50: number;
  p95: number;
  p99: number;
  stdDev: number;
}

export async function getMetricStatistics(
  serviceName: string,
  metricName: string,
): Promise<MetricStatistics> {
  const params = new URLSearchParams({
    service: serviceName,
    metric: metricName,
  });

  const response = await fetch(`/api/metrics/statistics?${params}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch metric statistics: ${response.status}`);
  }

  return response.json() as Promise<MetricStatistics>;
}