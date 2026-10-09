import { useEffect, useState } from 'react';
import { useTelemetryQuery } from '@/shared/hooks/use-telemetry-query';
import { getErrorMessage } from '@/shared/lib/errors';
import { getServiceMetrics } from '../api';
import type { ServiceMetrics } from '../types';

interface SummaryState {
  key: string;
  data: ServiceMetrics | null;
  error: string | null;
  loading: boolean;
}

export function useServiceSummary(serviceName: string) {
  const { timeRange, setTimeRange, env, setEnv, getApiParams } = useTelemetryQuery();
  const [refreshCount, setRefreshCount] = useState(0);
  const key = JSON.stringify([serviceName, timeRange, env]);
  const [state, setState] = useState<SummaryState>({
    key,
    data: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    const controller = new AbortController();
    setState({ key, data: null, error: null, loading: true });
    async function load() {
      try {
        const { from, to, env } = getApiParams();
        const data = await getServiceMetrics(
          serviceName,
          { from, to, env },
          controller.signal,
        );
        if (!controller.signal.aborted)
          setState({ key, data, error: null, loading: false });
      } catch (error) {
        if (!controller.signal.aborted)
          setState({
            key,
            data: null,
            error: getErrorMessage(
              error,
              'Service-KPIs konnten nicht geladen werden.',
            ),
            loading: false,
          });
      }
    }
    void load();
    return () => controller.abort();
  }, [serviceName, key, getApiParams, refreshCount]);

  const current =
    state.key === key ? state : { data: null, error: null, loading: true };
  return {
    metrics: current.data,
    env,
    setEnv,
    error: current.error,
    loading: current.loading,
    timeRange,
    setTimeRange,
    retry: () => setRefreshCount((count) => count + 1),
  };
}
