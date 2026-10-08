import { useCallback, useEffect, useMemo, useState } from 'react';
import { getServices } from '@/features/services/api';
import type { ServiceSummary } from '@/features/services/types';
import { generateTelemetry } from '@/shared/api/telemetry-api';
import { getErrorMessage } from '@/shared/lib/errors';
import { useServiceMetadata } from '@/features/services/hooks/use-service-metadata';
import { ServiceRow, mapServiceToRow } from '@/features/services/model';

export function useServices() {
  const [services, setServices] = useState<ServiceSummary[]>([]);

  const [loading, setLoading] = useState(true);

  const [generating, setGenerating] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const { metadata } = useServiceMetadata();

  const loadServices = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getServices();
      setServices(data);
      setError(null);
    } catch (loadError: unknown) {
      setError(
        getErrorMessage(
          loadError,
          'Unable to load services. Verify that the backend is reachable and VITE_BACKEND_URL is correct.',
        ),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadServices();
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
    services,
    loading,
    generating,
    error,
    loadServices,
    rows,
    generateAndRefresh,
  };
}
