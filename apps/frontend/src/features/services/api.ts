import { api, unwrap } from '@/shared/api/client';
import type { ApiEnvelope } from '@/shared/types/telemetry';
import type { ServiceMetrics, ServiceSummary } from '@/features/services/types';

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
