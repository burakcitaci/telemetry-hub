import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { generateTelemetry, getTraces } from '@/api';
import { DataTable, DataTableColumnHeader } from '@/components/data-table';
import { Sidebar, type FacetOption } from '@/components/sidebar';
import { TraceDetailSheet } from '@/components/trace-detail-sheet';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useTelemetryStream } from '@/hooks/use-telemetry-stream';
import { getErrorMessage } from '@/lib/errors';
import {
  formatDuration,
  formatTelemetryTimestamp,
  isWithinTimeRange,
  TELEMETRY_FETCH_LIMIT,
} from '@/lib/telemetry';
import type { TelemetryEvent, TraceSummary } from '@/types/telemetry';

function statusBadge(status: string) {
  const normalized = status.toUpperCase();
  if (normalized === 'ERROR') return <Badge variant="destructive">Error</Badge>;
  if (normalized === 'OK') return <Badge variant="success">OK</Badge>;
  return <Badge variant="secondary">{status || 'Unset'}</Badge>;
}

const columns: ColumnDef<TraceSummary>[] = [
  {
    accessorKey: 'Timestamp',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Timestamp" />,
    cell: ({ row }) => (
      <span className="whitespace-nowrap px-2 text-xs text-muted-foreground">
        {formatTelemetryTimestamp(row.original.Timestamp)}
      </span>
    ),
  },
  {
    accessorKey: 'ServiceName',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Service" />,
    cell: ({ row }) => <Badge variant="outline">{row.original.ServiceName}</Badge>,
  },
  {
    accessorKey: 'SpanName',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Operation" />,
    cell: ({ row }) => (
      <span className="block max-w-xl truncate text-xs" title={row.original.SpanName}>
        {row.original.SpanName}
      </span>
    ),
  },
  {
    accessorKey: 'Duration',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Duration" />,
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-xs text-muted-foreground">
        {formatDuration(row.original.Duration)}
      </span>
    ),
  },
  {
    accessorKey: 'SpanCount',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Spans" />,
    cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.SpanCount}</span>,
  },
  {
    accessorKey: 'ServiceCount',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Services" />,
    cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.ServiceCount}</span>,
  },
  {
    accessorKey: 'StatusCode',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => statusBadge(row.original.StatusCode),
  },
];

function TracesView() {
  const [traces, setTraces] = useState<TraceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serviceFilters, setServiceFilters] = useState<string[]>([]);
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [timeRange, setTimeRange] = useState('6h');
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);

  const loadTraces = useCallback(async () => {
    setLoading(true);
    try {
      setTraces(await getTraces(TELEMETRY_FETCH_LIMIT));
      setError(null);
    } catch (loadError) {
      setError(getErrorMessage(
        loadError,
        'Unable to load traces. Verify that the backend is reachable and VITE_BACKEND_URL is correct.',
      ));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTraces();
  }, [loadTraces]);

  const handleStreamEvent = useCallback((event: TelemetryEvent) => {
    if (event.type === 'update' && event.tracesChanged) {
      void loadTraces();
    }
  }, [loadTraces]);

  const connected = useTelemetryStream(handleStreamEvent);

  const generateAndRefresh = async () => {
    setGenerating(true);
    try {
      await generateTelemetry();
      await loadTraces();
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
    () => [...new Set(traces.map((trace) => trace.ServiceName))].sort(),
    [traces],
  );

  const facetOptions = useMemo<FacetOption[]>(() => {
    const count = (status: string) => traces.filter(
      (trace) => trace.StatusCode.toUpperCase() === status,
    ).length;

    return [
      { value: 'OK', label: 'Success', count: count('OK'), tone: 'success' },
      { value: 'ERROR', label: 'Error', count: count('ERROR'), tone: 'error' },
      {
        value: 'UNSET',
        label: 'Unset',
        count: traces.filter((trace) => !['OK', 'ERROR'].includes(trace.StatusCode.toUpperCase())).length,
        tone: 'neutral',
      },
    ];
  }, [traces]);

  const filteredTraces = useMemo(() => traces.filter((trace) => {
    const normalizedStatus = ['OK', 'ERROR'].includes(trace.StatusCode.toUpperCase())
      ? trace.StatusCode.toUpperCase()
      : 'UNSET';

    return (serviceFilters.length === 0 || serviceFilters.includes(trace.ServiceName))
      && (statusFilters.length === 0 || statusFilters.includes(normalizedStatus))
      && isWithinTimeRange(trace.Timestamp, timeRange);
  }), [serviceFilters, statusFilters, timeRange, traces]);

  if (loading && traces.length === 0 && !error) {
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
      <Sidebar
        services={services}
        selectedServices={serviceFilters}
        onServicesSelect={setServiceFilters}
        facetTitle="Status"
        facetOptions={facetOptions}
        selectedFacets={statusFilters}
        onFacetsSelect={setStatusFilters}
        timeRange={timeRange}
        onTimeRangeSelect={setTimeRange}
      />

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <h1 className="text-sm font-semibold">Recent traces</h1>
            <p className="text-xs text-muted-foreground">
              {filteredTraces.length} visible from the latest {traces.length} traces
              {traces.length === TELEMETRY_FETCH_LIMIT ? ` (capped at ${TELEMETRY_FETCH_LIMIT})` : ''}
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
              onClick={() => void loadTraces()}
              disabled={loading}
              aria-label="Refresh traces"
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
          {filteredTraces.length > 0 ? (
            <DataTable
              columns={columns}
              data={filteredTraces}
              searchPlaceholder="Search recent traces…"
              enableRowSelection={false}
              enableColumnVisibility
              enablePagination
              pageSize={20}
              onRowClick={(trace) => setSelectedTraceId(trace.TraceId)}
            />
          ) : (
            <div className="flex h-full min-h-64 items-center justify-center text-center">
              <div className="max-w-md space-y-3">
                <p className="text-sm text-muted-foreground">
                  {traces.length > 0
                    ? 'No recent traces match the selected filters.'
                    : 'No traces have been stored yet. Generate a request to exercise the instrumented backend.'}
                </p>
                {traces.length === 0 && (
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

      <TraceDetailSheet
        traceId={selectedTraceId}
        isOpen={selectedTraceId !== null}
        onClose={() => setSelectedTraceId(null)}
      />
    </div>
  );
}

export default TracesView;
