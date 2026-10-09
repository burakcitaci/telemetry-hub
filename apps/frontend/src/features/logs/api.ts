import { api, unwrap } from '@/shared/api/client';
import type { ApiEnvelope } from '@/shared/types/telemetry';
import type { LogRecord } from '@/features/logs/types';

export interface LogsQueryParams {
  limit: number;
  offset?: number;
  from: string;
  to: string;
}

export async function getLogs(params: LogsQueryParams): Promise<LogRecord[]> {
  const response = await api.get<ApiEnvelope<LogRecord[]> | LogRecord[]>(
    '/logs',
    {
      params,
    },
  );

  return unwrap(response.data);
}
