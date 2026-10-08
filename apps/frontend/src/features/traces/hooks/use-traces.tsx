import { useCallback, useEffect, useMemo, useState } from 'react';
import { getTraces } from '@/features/traces/api';
import type { TraceSummary } from '@/features/traces/types';
import { type FacetOption } from '@/shared/components/telemetry-sidebar';
import { generateTelemetry } from '@/shared/api/telemetry-api';
import { useTelemetryStream } from '@/shared/hooks/use-telemetry-stream';
import { useTelemetryViewParams } from '@/shared/hooks/use-telemetry-view-params';
import { getErrorMessage } from '@/shared/lib/errors';
import {
  isWithinTimeRange,
  TELEMETRY_FETCH_LIMIT,
} from '@/shared/lib/telemetry';
import type { TelemetryEvent } from '@/shared/types/telemetry';
import { SIDEBAR_STORAGE_KEY } from '@/features/traces/model';

export function useTraces() {
  const [traces, setTraces] = useState<TraceSummary[]>([]);

  const [loading, setLoading] = useState(true);

  const [generating, setGenerating] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) !== 'collapsed';
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(
        SIDEBAR_STORAGE_KEY,
        sidebarOpen ? 'expanded' : 'collapsed',
      );
    } catch {
      /* ignore */
    }
  }, [sidebarOpen]);

  const {
    serviceFilters,
    setServiceFilters,
    facetFilters: statusFilters,
    setFacetFilters: setStatusFilters,
    timeRange,
    setTimeRange,
    searchQuery,
    setSearchQuery,
  } = useTelemetryViewParams({ facetParam: 'status' });

  const loadTraces = useCallback(async () => {
    setLoading(true);
    try {
      setTraces(await getTraces(TELEMETRY_FETCH_LIMIT));
      setError(null);
    } catch (loadError) {
      setError(
        getErrorMessage(
          loadError,
          'Unable to load traces. Verify that the backend is reachable and VITE_BACKEND_URL is correct.',
        ),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTraces();
  }, [loadTraces]);

  const handleStreamEvent = useCallback(
    (event: TelemetryEvent) => {
      if (event.type === 'update' && event.tracesChanged) {
        void loadTraces();
      }
    },
    [loadTraces],
  );

  const connected = useTelemetryStream(handleStreamEvent);

  const generateAndRefresh = async () => {
    setGenerating(true);
    try {
      await generateTelemetry();
      await loadTraces();
    } catch (generateError) {
      setError(
        getErrorMessage(
          generateError,
          'Unable to generate telemetry. Check the backend /api/data endpoint and port-forward.',
        ),
      );
    } finally {
      setGenerating(false);
    }
  };

  const services = useMemo(
    () => [...new Set(traces.map((trace) => trace.ServiceName))].sort(),
    [traces],
  );

  const facetOptions = useMemo<FacetOption[]>(() => {
    const count = (status: string) =>
      traces.filter((trace) => trace.StatusCode.toUpperCase() === status)
        .length;

    return [
      { value: 'OK', label: 'Success', count: count('OK'), tone: 'success' },
      { value: 'ERROR', label: 'Error', count: count('ERROR'), tone: 'error' },
      {
        value: 'UNSET',
        label: 'Unset',
        count: traces.filter(
          (trace) => !['OK', 'ERROR'].includes(trace.StatusCode.toUpperCase()),
        ).length,
        tone: 'neutral',
      },
    ];
  }, [traces]);

  const filteredTraces = useMemo(
    () =>
      traces.filter((trace) => {
        const normalizedStatus = ['OK', 'ERROR'].includes(
          trace.StatusCode.toUpperCase(),
        )
          ? trace.StatusCode.toUpperCase()
          : 'UNSET';

        return (
          (serviceFilters.length === 0 ||
            serviceFilters.includes(trace.ServiceName)) &&
          (statusFilters.length === 0 ||
            statusFilters.includes(normalizedStatus)) &&
          isWithinTimeRange(trace.Timestamp, timeRange)
        );
      }),
    [serviceFilters, statusFilters, timeRange, traces],
  );

  const isEmpty = !loading && traces.length === 0 && !error;
  return {
    traces,
    loading,
    generating,
    error,
    selectedTraceId,
    setSelectedTraceId,
    serviceFilters,
    setServiceFilters,
    statusFilters,
    setStatusFilters,
    timeRange,
    setTimeRange,
    searchQuery,
    setSearchQuery,
    loadTraces,
    connected,
    generateAndRefresh,
    services,
    facetOptions,
    filteredTraces,
  };
}
