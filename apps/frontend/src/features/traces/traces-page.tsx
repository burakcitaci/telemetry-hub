import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, PanelLeft, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { getTraces } from '@/features/traces/api';
import { TraceDetailSheet } from '@/features/traces/components/trace-detail-sheet';
import type { TraceSummary } from '@/features/traces/types';
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
import {
  formatDuration,
  formatTelemetryTimestamp,
  isWithinTimeRange,
  TELEMETRY_FETCH_LIMIT,
} from '@/shared/lib/telemetry';
import type { TelemetryEvent } from '@/shared/types/telemetry';
import { TimeRangePicker } from '@/app/components/timer-range.picker';

const SIDEBAR_STORAGE_KEY = 'traces:sidebar';
const MAIN_MIN_WIDTH = 720;

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
      <span className="whitespace-nowrap text-xs text-muted-foreground">
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

function TracesPage() {
  const [traces, setTraces] = useState<TraceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);

  // Sidebar open/closed — same pattern as metrics page.
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
    } catch { /* ignore */ }
  }, [sidebarOpen]);



// inside TracesPage, replace the useTelemetryViewParams destructuring
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

  const isEmpty = !loading && traces.length === 0 && !error;

  return (
    <div className="flex h-screen flex-col bg-background overflow-hidden">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 shrink-0 border-b bg-background/95 backdrop-blur">
        <div className="flex h-14 items-center gap-2 px-3 sm:gap-3 sm:px-4">
          
          <Activity className="h-4 w-4 text-indigo-500 shrink-0 hidden sm:block" />
          <h1 className="text-sm font-semibold shrink-0">Traces</h1>
          <span className="text-muted-foreground hidden md:inline shrink-0">/</span>
          <span className="text-sm text-muted-foreground truncate min-w-0">
            {filteredTraces.length} visible from the latest {traces.length}
            {traces.length === TELEMETRY_FETCH_LIMIT ? ` (capped at ${TELEMETRY_FETCH_LIMIT})` : ''}
          </span>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2 shrink-0">
  <span className="hidden lg:flex items-center gap-1.5 text-xs text-muted-foreground">
    {connected
      ? <Wifi className="h-3.5 w-3.5 text-green-600" />
      : <WifiOff className="h-3.5 w-3.5 text-muted-foreground" />}
    <span className="hidden xl:inline">
      {connected ? 'Stream connected' : 'Stream disconnected'}
    </span>
  </span>

  {/* NEW: Datadog-style time picker */}
  <TimeRangePicker value={timeRange} onChange={setTimeRange} />

  <Button
    variant="outline"
    size="sm"
    onClick={() => void generateAndRefresh()}
    disabled={generating}
    className="gap-1.5"
  >
    <Activity className="h-3.5 w-3.5" />
    <span className="hidden sm:inline">
      {generating ? 'Generating…' : 'Generate telemetry'}
    </span>
  </Button>

  <Button
    variant="ghost"
    size="icon"
    onClick={() => void loadTraces()}
    disabled={loading}
    aria-label="Refresh traces"
    title="Refresh"
    className="shrink-0"
  >
    <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
  </Button>
</div>
        </div>
      </header>

      {/* ── Body: sidebar + main ─────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar wrapper — matches metrics page look:
            expanded = 256/288px, collapsed = 44px icon rail */}
       <TelemetrySidebar
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

        {/* Main column — vertical scroll, horizontal scroll under min width */}
        <div className="flex-1 min-w-0 overflow-x-auto overflow-y-hidden">
          <section
            className="flex h-full flex-col overflow-y-auto"
            style={{ minWidth: MAIN_MIN_WIDTH }}
          >
            {error && (
              <Alert variant="destructive" className="m-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="min-h-0 flex-1 p-4 lg:p-6">
              {loading && traces.length === 0 && !error ? (
                <div className="space-y-3">
                  <Skeleton className="h-8 w-64" />
                  <Skeleton className="h-10 w-full" />
                  {Array.from({ length: 8 }).map((_, index) => (
                    <Skeleton key={index} className="h-9 w-full" />
                  ))}
                </div>
              ) : filteredTraces.length > 0 ? (
                <DataTable
                  columns={columns}
                  data={filteredTraces}
                  searchPlaceholder="Search recent traces…"
                  enableRowSelection={false}
                  enableColumnVisibility
                  enablePagination
                  pageSize={20}
                  searchValue={searchQuery}
                  onSearchChange={setSearchQuery}
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
        </div>
      </div>

      <TraceDetailSheet
        traceId={selectedTraceId}
        isOpen={selectedTraceId !== null}
        onClose={() => setSelectedTraceId(null)}
      />
    </div>
  );
}

// ─── Sidebar shell ──────────────────────────────────────────────────────────
// Visual wrapper that matches the metrics page sidebar chrome: a header row
// with a collapse button, and a slim icon rail when closed. It just renders
// children inside a scrollable body — all the filtering UI still comes from
// TelemetrySidebar.

const TracesSidebarShell: React.FC<{
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}> = ({ open, onToggle, children }) => {
  if (!open) {
    return (
      <aside className="flex w-11 shrink-0 flex-col items-center border-r bg-muted/30 py-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          title="Expand sidebar"
          className="h-8 w-8"
        >
          <PanelLeft className="h-4 w-4" />
        </Button>
      </aside>
    );
  }

  return (
    <aside className="flex w-64 sm:w-72 shrink-0 flex-col border-r bg-muted/30 min-h-0">
      {/* Header — matches the metrics page look:
          uppercase muted title on the left, collapse icon on the right. */}
      <div className="flex shrink-0 items-center justify-between border-b px-3 py-2">
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Filters
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          title="Collapse sidebar"
          className="h-7 w-7"
        >
          <PanelLeft className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Hide TelemetrySidebar's own internal header row so we don't
          duplicate the title. This targets the first child block inside
          its scroll container. */}
      <div className="traces-sidebar-body min-h-0 flex-1 overflow-y-auto [&>*:first-child>div:first-child]:hidden">
        {children}
      </div>
    </aside>
  );
};
export default TracesPage;