import { Activity, SearchX } from 'lucide-react';
import { useState } from 'react';
import { FeatureHeader } from '@/components/shared/feature-header';
import { Button } from '@/components/ui/button';
import { QueryError, ViewSkeleton } from '@/components/shared/view-skeleton';
import { DataTable } from '@/shared/components/data-table';
import { FeatureRefreshButton } from '@/shared/components/feature-actions';
import {
  FeaturePage,
  FeatureSearch,
  FeatureBody,
  FeatureContent,
  FeaturePanel,
  FeatureEmptyState,
} from '@/shared/components/feature-layout';
import { AppFilterSidebar } from '@/components/shared/app-filter-sidebar';
import { columns } from './services-components';
import type { useServices } from '../hooks/use-services';
import { useTelemetryQuery } from '@/shared/hooks/use-telemetry-query';
import type { ServiceRow } from '../model';

type ServicesViewProps = ReturnType<typeof useServices>;

function filterServiceRows(rows: ServiceRow[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return rows;

  return rows.filter((row) =>
    Object.values(row).some((value) =>
      String(value).toLowerCase().includes(normalizedQuery),
    ),
  );
}

export function ServicesView({
  services,
  loading,
  error,
  loadServices,
  rows,
  searchQuery,
  setSearchQuery,
}: ServicesViewProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { timeRange, setTimeRange, env } = useTelemetryQuery();
  const filteredRows = filterServiceRows(rows, searchQuery);
  return (
    <FeaturePage>
      <FeatureHeader
        title="Services"
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        onFiltersOpen={() => setFiltersOpen(true)}
        actions={
          <>
            <FeatureRefreshButton
              loading={loading}
              onRefresh={() => void loadServices()}
              label="Refresh services"
            />
          </>
        }
      />
      <FeatureBody>
        <AppFilterSidebar
          environmentSource="traces"
          title="Filters"
          mobileOpen={filtersOpen}
          onMobileOpenChange={setFiltersOpen}
        >
          <FeatureSearch
            placeholder="Search services…"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </AppFilterSidebar>
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
            ) : rows.length === 0 ? (
              <FeatureEmptyState>
                <Activity className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="font-medium">No traced services found</p>
                  <p className="text-sm text-muted-foreground">
                    Verify that your applications export traces through the
                    ingestion endpoint.
                  </p>
                </div>
              </FeatureEmptyState>
            ) : filteredRows.length > 0 ? (
              <DataTable
                columns={columns}
                data={filteredRows}
                enableSearch={false}
                enableRowSelection={false}
                enableColumnVisibility={false}
                enablePagination
                pageSize={20}
              />
            ) : (
              <FeatureEmptyState>
                <SearchX className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="font-medium">
                    No services match “{searchQuery.trim()}”
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Try a different service, team, repository, or type.
                  </p>
                </div>
                <Button variant="outline" onClick={() => setSearchQuery('')}>
                  Clear search
                </Button>
              </FeatureEmptyState>
            )}
          </FeaturePanel>
        </FeatureContent>
      </FeatureBody>
    </FeaturePage>
  );
}
