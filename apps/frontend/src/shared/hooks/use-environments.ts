import { useEffect, useState } from 'react';
import { api, unwrap } from '@/shared/api/client';
import type { ApiEnvelope } from '@/shared/types/telemetry';

export type EnvironmentSource = 'metrics' | 'logs' | 'traces';

export function useEnvironments(source: EnvironmentSource) {
  const [values, setValues] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    api.get<ApiEnvelope<string[]> | string[]>('/environments', {
      params: { source }, signal: controller.signal,
    }).then(({ data }) => {
      if (!controller.signal.aborted) setValues(unwrap(data));
    }).catch(() => {
      if (!controller.signal.aborted) setError(true);
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [source, revision]);
  return { values, loading, error, retry: () => setRevision((value) => value + 1) };
}
