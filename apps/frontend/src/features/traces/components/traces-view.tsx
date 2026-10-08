import type { useTraces } from '../hooks/use-traces';
import { Activity, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { TraceDetailSheet } from '@/features/traces/components/trace-detail-sheet';
import { DataTable } from '@/shared/components/data-table';
import { TelemetrySidebar } from '@/shared/components/telemetry-sidebar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TELEMETRY_FETCH_LIMIT } from '@/shared/lib/telemetry';
import { TimeRangePicker } from '@/app/components/timer-range.picker';
import { MAIN_MIN_WIDTH } from '@/features/traces/model';
import { columns } from '@/features/traces/components/traces-components';

type TracesViewProps = ReturnType<typeof useTraces>;

export function TracesView({
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
}: TracesViewProps) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-background text-foreground overflow-hidden">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 shrink-0 border-b bg-background/95 backdrop-blur">
        <div className="flex h-14 items-center gap-2 px-3 sm:gap-3 sm:px-4">
          <Activity className="h-4 w-4 text-primary shrink-0 hidden sm:block" />
          <h1 className="text-sm font-semibold shrink-0">Traces</h1>
          <span className="text-muted-foreground hidden md:inline shrink-0">
            /
          </span>
          <span className="text-sm text-muted-foreground truncate min-w-0">
            {filteredTraces.length} visible from the latest {traces.length}
            {traces.length === TELEMETRY_FETCH_LIMIT
              ? ` (capped at ${TELEMETRY_FETCH_LIMIT})`
              : ''}
          </span>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2 shrink-0">
            <span className="hidden lg:flex items-center gap-1.5 text-xs text-muted-foreground">
              {connected ? (
                <Wifi className="h-3.5 w-3.5 text-success" />
              ) : (
                <WifiOff className="h-3.5 w-3.5 text-muted-foreground" />
              )}
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
              <RefreshCw
                className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
              />
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
                      <Button
                        onClick={() => void generateAndRefresh()}
                        disabled={generating}
                      >
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
