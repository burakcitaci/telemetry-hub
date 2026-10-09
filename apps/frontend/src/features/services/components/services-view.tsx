import { Activity, Settings } from "lucide-react";
import { useState } from "react";
import { FeatureHeader } from "@/components/shared/feature-header";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { QueryError, ViewSkeleton } from "@/components/shared/view-skeleton";
import { DataTable } from "@/shared/components/data-table";
import { FeatureRefreshButton } from "@/shared/components/feature-actions";
import {
  FeaturePage,
  FeatureSidebar,
  FeatureSearch,
  FeatureBody,
  FeatureContent,
  FeaturePanel,
  FeatureEmptyState,
} from "@/shared/components/feature-layout";
import { columns } from "./services-components";
import type { useServices } from "../hooks/use-services";
import { useTelemetryQuery } from "@/shared/hooks/use-telemetry-query";
import { EnvironmentFilter } from "@/shared/components/environment-filter";

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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { timeRange, setTimeRange, env } = useTelemetryQuery();
  return (
    <FeaturePage>
      <FeatureHeader
        title="Services"
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        onFiltersOpen={() => setFiltersOpen(true)}
        description={`${services.length} discovered services · ${env}`}
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
        <FeatureSidebar
          title="Filters"
          mobileOpen={filtersOpen}
          onMobileOpenChange={setFiltersOpen}
        >
          <EnvironmentFilter source="traces" />
          <FeatureSearch
            placeholder="Search services…"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </FeatureSidebar>
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
                  {generating ? "Generating…" : "Generate telemetry"}
                </Button>
              </FeatureEmptyState>
            )}
          </FeaturePanel>
        </FeatureContent>
      </FeatureBody>
    </FeaturePage>
  );
}
