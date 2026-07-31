import { api, unwrap } from '@/shared/api/client';
import type { ApiEnvelope } from '@/shared/types/telemetry';
import type { LogRecord } from '@/features/logs/types';

export async function getLogs(limit: number, service?: string): Promise<LogRecord[]> {
  const response = await api.get<ApiEnvelope<LogRecord[]> | LogRecord[]>('/logs', {
    params: { limit, ...(service ? { service } : {}) },
  });

  return unwrap(response.data);
}
