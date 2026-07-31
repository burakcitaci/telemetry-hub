import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { getLogs } from '@/features/logs/api';
import { LogDetailSheet } from '@/features/logs/components/log-detail-sheet';
import type { LogRecord } from '@/features/logs/types';
import { DataTable, DataTableColumnHeader } from '@/shared/components/data-table';
import { TelemetrySidebar, type FacetOption } from '@/shared/components/telemetry-sidebar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { generateTelemetry } from '@/shared/api/telemetry-api';
import { useTelemetryStream } from '@/shared/hooks/use-telemetry-stream';
import { useTelemetryViewParams } from '@/shared/hooks/use-telemetry-view-params';
import { getErrorMessage } from '@/shared/lib/errors';
import { formatTelemetryTimestamp, isWithinTimeRange, TELEMETRY_FETCH_LIMIT } from '@/shared/lib/telemetry';
import type { TelemetryEvent } from '@/shared/types/telemetry';

function severityBadge(severity: string) {
  const normalized = severity.toUpperCase();
  if (normalized === 'ERROR' || normalized === 'FATAL') {
    return <Badge variant="destructive">{normalized}</Badge>;
  }
  if (normalized === 'WARN' || normalized === 'WARNING') {
    return <Badge variant="warning">WARN</Badge>;
  }
  if (normalized === 'INFO') return <Badge variant="info">INFO</Badge>;
  return <Badge variant="secondary">{normalized || 'UNSET'}</Badge>;
}

const columns: ColumnDef<LogRecord>[] = [
  {
    accessorKey: 'Timestamp',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Timestamp" />,
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-xs text-muted-foreground">
        {formatTelemetryTimestamp(row.original.Timestamp)}
      </span>
    ),
  },
  {
    accessorKey: 'SeverityText',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Severity" />,
    cell: ({ row }) => severityBadge(row.original.SeverityText),
  },
  {
    accessorKey: 'ServiceName',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Service" />,
    cell: ({ row }) => <Badge variant="outline">{row.original.ServiceName || 'Unknown service'}</Badge>,
  },
  {
    accessorKey: 'Body',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Message" />,
    cell: ({ row }) => (
      <span className="block max-w-xl truncate text-xs" title={row.original.Body}>
        {row.original.Body}
      </span>
    ),
  },
  {
    accessorKey: 'TraceId',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Trace ID" />,
    cell: ({ row }) => (
      <code className="whitespace-nowrap text-xs text-muted-foreground">
        {row.original.TraceId ? `${row.original.TraceId.slice(0, 10)}…` : 'N/A'}
      </code>
    ),
  },
];

function normalizeSeverity(severity: string): string {
  const normalized = severity.toUpperCase();
  if (normalized === 'WARNING') return 'WARN';
  if (normalized === 'FATAL') return 'ERROR';
  return ['INFO', 'WARN', 'ERROR'].includes(normalized) ? normalized : 'OTHER';
}

function LogsPage() {
  const [logs, setLogs] = useState<LogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<LogRecord | null>(null);
  const {
    serviceFilters,
    setServiceFilters,
    facetFilters: severityFilters,
    setFacetFilters: setSeverityFilters,
    timeRange,
    setTimeRange,
    searchQuery,
    setSearchQuery,
  } = useTelemetryViewParams({ facetParam: 'severity' });

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      setLogs(await getLogs(TELEMETRY_FETCH_LIMIT));
      setError(null);
    } catch (loadError) {
      setError(getErrorMessage(
        loadError,
        'Unable to load logs. Verify that the backend is reachable and VITE_BACKEND_URL is correct.',
      ));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  const handleStreamEvent = useCallback((event: TelemetryEvent) => {
    if (event.type === 'update' && event.logsChanged) {
      void loadLogs();
    }
  }, [loadLogs]);

  const connected = useTelemetryStream(handleStreamEvent);

  const generateAndRefresh = async () => {
    setGenerating(true);
    try {
      await generateTelemetry();
      await loadLogs();
    } catch (generateError) {
      setError(getErrorMessage(
        generateError,
        'Unable to generate telemetry. Check the backend /api/data endpoint and port-forward.',
      ));
    } finally {
      setGenerating(false);
    }
  };

  const services = useMemo(
    () => [...new Set(logs.map((log) => log.ServiceName || 'Unknown service'))].sort(),
    [logs],
  );

  const facetOptions = useMemo<FacetOption[]>(() => {
    const count = (severity: string) => logs.filter(
      (log) => normalizeSeverity(log.SeverityText) === severity,
    ).length;

    return [
      { value: 'INFO', label: 'Info', count: count('INFO'), tone: 'info' },
      { value: 'WARN', label: 'Warning', count: count('WARN'), tone: 'warning' },
      { value: 'ERROR', label: 'Error', count: count('ERROR'), tone: 'error' },
      { value: 'OTHER', label: 'Other', count: count('OTHER'), tone: 'neutral' },
    ];
  }, [logs]);

  const filteredLogs = useMemo(() => logs.filter((log) => (
    (serviceFilters.length === 0 || serviceFilters.includes(log.ServiceName || 'Unknown service'))
      && (severityFilters.length === 0 || severityFilters.includes(normalizeSeverity(log.SeverityText)))
      && isWithinTimeRange(log.Timestamp, timeRange)
  )), [logs, serviceFilters, severityFilters, timeRange]);

  if (loading && logs.length === 0 && !error) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-9 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 bg-background">
      <TelemetrySidebar
        services={services}
        selectedServices={serviceFilters}
        onServicesSelect={setServiceFilters}
        facetTitle="Severity"
        facetOptions={facetOptions}
        selectedFacets={severityFilters}
        onFacetsSelect={setSeverityFilters}
        timeRange={timeRange}
        onTimeRangeSelect={setTimeRange}
      />

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <h1 className="text-sm font-semibold">Recent logs</h1>
            <p className="text-xs text-muted-foreground">
              {filteredLogs.length} visible from the latest {logs.length} log records
              {logs.length === TELEMETRY_FETCH_LIMIT ? ` (capped at ${TELEMETRY_FETCH_LIMIT})` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {connected
                ? <Wifi className="h-3.5 w-3.5 text-green-600" />
                : <WifiOff className="h-3.5 w-3.5 text-muted-foreground" />}
              {connected ? 'Stream connected' : 'Stream disconnected'}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void generateAndRefresh()}
              disabled={generating}
            >
              <Activity className="mr-1.5 h-3.5 w-3.5" />
              {generating ? 'Generating…' : 'Generate telemetry'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void loadLogs()}
              disabled={loading}
              aria-label="Refresh logs"
              title="Refresh"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </header>

        {error && (
          <Alert variant="destructive" className="mx-4 mt-3">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="min-h-0 flex-1 overflow-auto px-4 py-2">
          {filteredLogs.length > 0 ? (
            <DataTable
              columns={columns}
              data={filteredLogs}
              searchPlaceholder="Search recent logs…"
              enableRowSelection={false}
              enableColumnVisibility
              enablePagination
              pageSize={20}
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
              onRowClick={setSelectedLog}
            />
          ) : (
            <div className="flex h-full min-h-64 items-center justify-center text-center">
              <div className="max-w-md space-y-3">
                <p className="text-sm text-muted-foreground">
                  {logs.length > 0
                    ? 'No recent logs match the selected filters.'
                    : 'No log records have been stored yet. Generate a request to exercise the instrumented backend.'}
                </p>
                {logs.length === 0 && (
                  <Button onClick={() => void generateAndRefresh()} disabled={generating}>
                    <Activity className="mr-2 h-4 w-4" />
                    {generating ? 'Generating…' : 'Generate telemetry'}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      <LogDetailSheet
        log={selectedLog}
        isOpen={selectedLog !== null}
        onClose={() => setSelectedLog(null)}
      />
    </div>
  );
}

export default LogsPage;
