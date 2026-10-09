import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getServices } from '@/features/services/api';
import type { ServiceSummary } from '@/features/services/types';
import { generateTelemetry } from '@/shared/api/telemetry-api';
import { getErrorMessage } from '@/shared/lib/errors';
import { useServiceMetadata } from '@/features/services/hooks/use-service-metadata';
import { ServiceRow, mapServiceToRow } from '@/features/services/model';
import { useTelemetryQuery } from '@/shared/hooks/use-telemetry-query';

export function useServices() {
  const requestId = useRef(0);
  const { searchQuery, setSearchQuery, env } = useTelemetryQuery();
  const [services, setServices] = useState<ServiceSummary[]>([]);

  const [loading, setLoading] = useState(true);

  const [generating, setGenerating] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const { metadata } = useServiceMetadata();

  const loadServices = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setServices([]);
    try {
      const data = await getServices(env);
      if (id !== requestId.current) return;
      setServices(data);
      setError(null);
    } catch (loadError: unknown) {
      if (id !== requestId.current) return;
      setError(
        getErrorMessage(
          loadError,
          'Unable to load services. Verify that the backend is reachable and VITE_BACKEND_URL is correct.',
        ),
      );
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [env]);

  useEffect(() => {
    void loadServices();
    return () => { requestId.current += 1; };
  }, [loadServices]);

  const rows: ServiceRow[] = useMemo(
    () => services.map((s) => mapServiceToRow(s, metadata)),
    [services, metadata],
  );

  const generateAndRefresh = async () => {
    setGenerating(true);
    try {
      await generateTelemetry();
      await loadServices();
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
  return {
    searchQuery,
    setSearchQuery,
    services,
    loading,
    generating,
    error,
    loadServices,
    rows,
    generateAndRefresh,
  };
}
