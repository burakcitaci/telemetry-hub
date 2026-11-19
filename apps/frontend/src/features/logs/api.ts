import { api, unwrap } from '@/shared/api/client';
import type { ApiEnvelope } from '@/shared/types/telemetry';
import type { ExplorerQuery } from '@/shared/types/telemetry';
import type { LogRecord } from '@/features/logs/types';

export async function getLogs(params: ExplorerQuery, signal: AbortSignal): Promise<LogRecord[]> {
  const response = await api.get<ApiEnvelope<LogRecord[]> | LogRecord[]>(
    '/logs',
    {
      params, signal, paramsSerializer: { indexes: null },
    },
  );

  return unwrap(response.data);
}
