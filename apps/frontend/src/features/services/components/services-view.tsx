import { Activity, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { QueryError, ViewSkeleton } from '@/components/shared/view-skeleton';
import { DataTable } from '@/shared/components/data-table';
import { FeatureRefreshButton } from '@/shared/components/feature-actions';
import {
  FeaturePage,
  FeatureHeader,
  FeatureBody,
  FeatureContent,
  FeaturePanel,
  FeatureEmptyState,
} from '@/shared/components/feature-layout';
import { columns } from './services-components';
import type { useServices } from '../hooks/use-services';
import { TimeRangePicker } from '@/app/components/timer-range.picker';
import { useTelemetryQuery } from '@/shared/hooks/use-telemetry-query';

type ServicesViewProps = ReturnType<typeof useServices>;

export function ServicesView({
  services,
  loading,
  generating,
  error,
  loadServices,
  rows,
  generateAndRefresh,
  searchQuery,
  setSearchQuery,
}: ServicesViewProps) {
  const { timeRange, setTimeRange } = useTelemetryQuery();
  return (
    <FeaturePage>
      <FeatureHeader
        title="Services"
        icon={Activity}
        description={`${services.length} discovered services · full catalog`}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link to="/setup">
                <Settings className="h-4 w-4" /> Setup & Config
              </Link>
            </Button>
            <FeatureRefreshButton
              loading={loading}
              onRefresh={() => void loadServices()}
              label="Refresh services"
            />
            <TimeRangePicker value={timeRange} onChange={setTimeRange} />
          </>
        }
      />
      <FeatureBody>
        <FeatureContent>
          <FeaturePanel>
            {loading && services.length === 0 ? (
              <ViewSkeleton
                variant="list"
                showHeader={false}
                className="p-0 lg:p-0"
              />
            ) : error ? (
              <QueryError
                message={error}
                onRetry={loadServices}
                isRetrying={loading}
              />
            ) : rows.length > 0 ? (
              <DataTable
                columns={columns}
                data={rows}
                searchPlaceholder="Search for services"
                searchValue={searchQuery}
                onSearchChange={setSearchQuery}
                enableRowSelection={false}
                enableColumnVisibility={false}
                enablePagination
                pageSize={20}
              />
            ) : (
              <FeatureEmptyState>
                <Activity className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="font-medium">No traced services found</p>
                  <p className="text-sm text-muted-foreground">
                    Generate telemetry, then allow the collector time to export
                    it.
                  </p>
                </div>
                <Button
                  onClick={() => void generateAndRefresh()}
                  disabled={generating}
                >
                  {generating ? 'Generating…' : 'Generate telemetry'}
                </Button>
              </FeatureEmptyState>
            )}
          </FeaturePanel>
        </FeatureContent>
      </FeatureBody>
    </FeaturePage>
  );
}
