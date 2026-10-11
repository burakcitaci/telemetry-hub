import { TelemetryActions } from "@/shared/components/feature-actions";
import { useState } from "react";
import { FeatureHeader } from "@/components/shared/feature-header";
import {
  FeaturePage,
  FeatureBody,
  FeatureContent,
  FeaturePanel,
  FeatureLoading,
  FeatureEmptyState,
} from "@/shared/components/feature-layout";
import type { useTraces } from "../hooks/use-traces";
import { Activity } from "lucide-react";
import { useActiveTrace } from "@/shared/hooks/use-active-trace";
import { DataTable } from "@/shared/components/data-table";
import { AppFilterSidebar } from "@/components/shared/app-filter-sidebar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TELEMETRY_FETCH_LIMIT } from "@/shared/lib/telemetry";
import { columns } from "@/features/traces/components/traces-components";

type TracesViewProps = ReturnType<typeof useTraces>;

export function TracesView({
  traces,
  loading,
  generating,
  error,
  timeRange,
  setTimeRange,
  searchQuery,
  setSearchQuery,
  loadTraces,
  connected,
  generateAndRefresh,
  filteredTraces,
}: TracesViewProps) {
  const { openTrace } = useActiveTrace();
  const [filtersOpen, setFiltersOpen] = useState(false);
  return (
    <FeaturePage>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <FeatureHeader
        title="Traces"
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        onFiltersOpen={() => setFiltersOpen(true)}
        actions={
          <TelemetryActions
            connected={connected}
            generating={generating}
            onGenerate={() => void generateAndRefresh()}
            loading={loading}
            onRefresh={() => void loadTraces()}
            label="Refresh traces"
          ></TelemetryActions>
        }
      />

      {/* ── Body: sidebar + main ─────────────────────────────────────────── */}
      <FeatureBody>
        {/* Sidebar wrapper — matches metrics page look:
            expanded = 256/288px, collapsed = 44px icon rail */}
        <AppFilterSidebar
          mobileOpen={filtersOpen}
          onMobileOpenChange={setFiltersOpen}
          environmentSource="traces"
          timeRange={timeRange}
          onTimeRangeSelect={setTimeRange}
        />

        {/* Main column — vertical scroll, horizontal scroll under min width */}
        <FeatureContent>
          <div className="min-w-0">
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <FeaturePanel>
              {loading && traces.length === 0 && !error ? (
                <FeatureLoading />
              ) : filteredTraces.length > 0 ? (
                <DataTable
                  density="telemetry"
                  columns={columns}
                  data={filteredTraces}
                  searchPlaceholder="Search recent traces…"
                  enableRowSelection={false}
                  enableColumnVisibility
                  enablePagination
                  pageSize={20}
                  searchValue={searchQuery}
                  onSearchChange={setSearchQuery}
                  onRowClick={(trace) => openTrace(trace.TraceId)}
                />
              ) : (
                <FeatureEmptyState>
                  <div className="max-w-md space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {traces.length > 0
                        ? "No recent traces match the selected filters."
                        : "No traces have been stored yet. Generate a request to exercise the instrumented backend."}
                    </p>
                    {traces.length === 0 && (
                      <Button
                        onClick={() => void generateAndRefresh()}
                        disabled={generating}
                      >
                        <Activity className="mr-2 h-4 w-4" />
                        {generating ? "Generating…" : "Generate telemetry"}
                      </Button>
                    )}
                  </div>
                </FeatureEmptyState>
              )}
            </FeaturePanel>
          </div>
        </FeatureContent>
      </FeatureBody>
    </FeaturePage>
  );
}
