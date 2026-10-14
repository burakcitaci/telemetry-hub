import { TelemetryActions } from '@/shared/components/feature-actions';
import { useState } from 'react';
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
import { LogDetailSheet } from '@/features/logs/components/log-detail-sheet';
import { DataTable } from '@/shared/components/data-table';
import { AppFilterSidebar } from '@/components/shared/app-filter-sidebar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { columns } from '@/features/logs/components/logs-components';

type LogsViewProps = ReturnType<typeof useLogs>;

export function LogsView({
  logs,
  loading,
  error,
  selectedLog,
  setSelectedLog,
  timeRange,
  setTimeRange,
  searchQuery,
  setSearchQuery,
  loadLogs,
  connected,
  paused,
  setStreamPaused,
  filteredLogs,
}: LogsViewProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  return (
    <FeaturePage>
      <FeatureHeader
        title="Logs"
        onFiltersOpen={() => setFiltersOpen(true)}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        actions={
          <TelemetryActions
            connected={connected}
            paused={paused}
            onPausedChange={setStreamPaused}
            loading={loading}
            onRefresh={() => void loadLogs()}
            label="Refresh logs"
          ></TelemetryActions>
        }
      />
      <FeatureBody>
        <AppFilterSidebar
          mobileOpen={filtersOpen}
          onMobileOpenChange={setFiltersOpen}
          environmentSource="logs"
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
                      : 'No logs found in the selected period. Choose another time range or verify your ingestion configuration.'}
                  </p>
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
