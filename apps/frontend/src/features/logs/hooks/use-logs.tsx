import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getLogs } from '@/features/logs/api';
import type { LogRecord } from '@/features/logs/types';
import { type FacetOption } from '@/shared/components/telemetry-sidebar';
import { generateTelemetry } from '@/shared/api/telemetry-api';
import { useTelemetryStream } from '@/shared/hooks/use-telemetry-stream';
import { useTelemetryQuery } from '@/shared/hooks/use-telemetry-query';
import { getErrorMessage } from '@/shared/lib/errors';
import type { TelemetryEvent } from '@/shared/types/telemetry';
import { normalizeSeverity } from '@/features/logs/model';

export function useLogs() {
  const requestId = useRef(0);
  const [logs, setLogs] = useState<LogRecord[]>([]);

  const [loading, setLoading] = useState(true);

  const [generating, setGenerating] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [selectedLog, setSelectedLog] = useState<LogRecord | null>(null);

  const {
    env,
    serviceFilters,
    setServiceFilters,
    facetFilters: severityFilters,
    setFacetFilters: setSeverityFilters,
    timeRange,
    setTimeRange,
    searchQuery,
    setSearchQuery,
    getApiParams,
  } = useTelemetryQuery({ facetParam: 'severity' });
  useEffect(() => {
    setLogs([]);
    setSelectedLog(null);
  }, [env]);

  const loadLogs = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    try {
      const { from, to, limit, offset, env } = getApiParams();
      const result = await getLogs({ from, to, limit, offset, env });
      if (id !== requestId.current) return;
      setLogs(result);
      setError(null);
    } catch (loadError) {
      if (id !== requestId.current) return;
      setLogs([]);
      setError(
        getErrorMessage(
          loadError,
          'Unable to load logs. Verify that the backend is reachable and VITE_BACKEND_URL is correct.',
        ),
      );
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [getApiParams]);

  useEffect(() => {
    void loadLogs();
    return () => {
      requestId.current += 1;
    };
  }, [loadLogs]);

  const handleStreamEvent = useCallback(
    (event: TelemetryEvent) => {
      if (event.type === 'update' && event.logsChanged) {
        void loadLogs();
      }
    },
    [loadLogs],
  );

  const connected = useTelemetryStream(handleStreamEvent);

  const generateAndRefresh = async () => {
    setGenerating(true);
    try {
      await generateTelemetry();
      await loadLogs();
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
    () =>
      [
        ...new Set(logs.map((log) => log.ServiceName || 'Unknown service')),
      ].sort(),
    [logs],
  );

  const facetOptions = useMemo<FacetOption[]>(() => {
    const count = (severity: string) =>
      logs.filter((log) => normalizeSeverity(log.SeverityText) === severity)
        .length;

    return [
      { value: 'INFO', label: 'Info', count: count('INFO'), tone: 'info' },
      {
        value: 'WARN',
        label: 'Warning',
        count: count('WARN'),
        tone: 'warning',
      },
      { value: 'ERROR', label: 'Error', count: count('ERROR'), tone: 'error' },
      {
        value: 'OTHER',
        label: 'Other',
        count: count('OTHER'),
        tone: 'neutral',
      },
    ];
  }, [logs]);

  const filteredLogs = useMemo(
    () =>
      logs.filter(
        (log) =>
          (serviceFilters.length === 0 ||
            serviceFilters.includes(log.ServiceName || 'Unknown service')) &&
          (severityFilters.length === 0 ||
            severityFilters.includes(normalizeSeverity(log.SeverityText))),
      ),
    [logs, serviceFilters, severityFilters],
  );
  return {
    logs,
    loading,
    generating,
    error,
    selectedLog,
    setSelectedLog,
    serviceFilters,
    setServiceFilters,
    severityFilters,
    setSeverityFilters,
    timeRange,
    setTimeRange,
    searchQuery,
    setSearchQuery,
    loadLogs,
    connected,
    generateAndRefresh,
    services,
    facetOptions,
    filteredLogs,
  };
}
