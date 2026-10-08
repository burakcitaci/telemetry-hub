import type { useLogs } from '../hooks/use-logs';
import { Activity, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { LogDetailSheet } from '@/features/logs/components/log-detail-sheet';
import { DataTable } from '@/shared/components/data-table';
import { TelemetrySidebar } from '@/shared/components/telemetry-sidebar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TELEMETRY_FETCH_LIMIT } from '@/shared/lib/telemetry';
import { columns } from '@/features/logs/components/logs-components';

type LogsViewProps = ReturnType<typeof useLogs>;

export function LogsView({
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
}: LogsViewProps) {
  if (loading && logs.length === 0 && !error) {
    return (
      <div className="space-y-3 bg-background p-4 text-foreground">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-9 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 bg-background text-foreground">
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
              {filteredLogs.length} visible from the latest {logs.length} log
              records
              {logs.length === TELEMETRY_FETCH_LIMIT
                ? ` (capped at ${TELEMETRY_FETCH_LIMIT})`
                : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {connected ? (
                <Wifi className="h-3.5 w-3.5 text-success" />
              ) : (
                <WifiOff className="h-3.5 w-3.5 text-muted-foreground" />
              )}
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
              <RefreshCw
                className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
              />
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

      <LogDetailSheet
        log={selectedLog}
        isOpen={selectedLog !== null}
        onClose={() => setSelectedLog(null)}
      />
    </div>
  );
}
