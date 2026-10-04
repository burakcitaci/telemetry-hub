import { api, unwrap } from '@/shared/api/client';
import type { ApiEnvelope } from '@/shared/types/telemetry';
import type { MetricsPage } from '@/features/metrics/types';

export async function getMetrics(limit: number, offset: number): Promise<MetricsPage> {
  const response = await api.get<ApiEnvelope<MetricsPage> | MetricsPage>('/metrics', {
    params: { limit, offset },
  });
  return unwrap(response.data);
}
