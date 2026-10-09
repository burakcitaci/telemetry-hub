import { TelemetryActions } from '@/shared/components/feature-actions';
import { FeatureHeader } from '@/components/shared/feature-header';
import {
  FeaturePage,
  FeatureBody,
  FeatureContent,
  FeaturePanel,
  FeatureLoading,
  FeatureEmptyState,
} from '@/shared/components/feature-layout';
import type { useLogs } from '../hooks/use-logs';
import { Activity } from 'lucide-react';
import { LogDetailSheet } from '@/features/logs/components/log-detail-sheet';
import { DataTable } from '@/shared/components/data-table';
import { TelemetrySidebar } from '@/shared/components/telemetry-sidebar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
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
  return (
    <FeaturePage>
      <FeatureHeader
        title="Logs"
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        description={
          <>
            {filteredLogs.length} visible from {logs.length} log records in the
            selected period
            {logs.length === TELEMETRY_FETCH_LIMIT
              ? ` (capped at ${TELEMETRY_FETCH_LIMIT})`
              : ''}
          </>
        }
        actions={
          <TelemetryActions
            connected={connected}
            generating={generating}
            onGenerate={() => void generateAndRefresh()}
            loading={loading}
            onRefresh={() => void loadLogs()}
            label="Refresh logs"
          ></TelemetryActions>
        }
      />
      <FeatureBody>
        <TelemetrySidebar
          environmentSource="logs"
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

        <FeatureContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <FeaturePanel>
            {loading && logs.length === 0 && !error ? (
              <FeatureLoading />
            ) : filteredLogs.length > 0 ? (
              <DataTable
                density="telemetry"
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
              <FeatureEmptyState>
                <div className="max-w-md space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {logs.length > 0
                      ? 'No logs in this period match the selected filters.'
                      : 'No logs found in the selected period. Choose another time range or generate telemetry.'}
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
              </FeatureEmptyState>
            )}
          </FeaturePanel>
        </FeatureContent>
      </FeatureBody>

      <LogDetailSheet
        log={selectedLog}
        isOpen={selectedLog !== null}
        onClose={() => setSelectedLog(null)}
      />
    </FeaturePage>
  );
}
