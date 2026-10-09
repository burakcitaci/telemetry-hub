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
import { TraceDetailSheet } from "@/features/traces/components/trace-detail-sheet";
import { DataTable } from "@/shared/components/data-table";
import { TelemetrySidebar } from "@/shared/components/telemetry-sidebar";
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
  const [filtersOpen, setFiltersOpen] = useState(false);
  return (
    <FeaturePage>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <FeatureHeader
        title="Traces"
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        onFiltersOpen={() => setFiltersOpen(true)}
        description={
          <>
            {filteredTraces.length} visible from the latest {traces.length}{" "}
            traces
            {traces.length === TELEMETRY_FETCH_LIMIT
              ? ` (capped at ${TELEMETRY_FETCH_LIMIT})`
              : ""}
          </>
        }
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
        <TelemetrySidebar
          mobileOpen={filtersOpen}
          onMobileOpenChange={setFiltersOpen}
          environmentSource="traces"
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
                  onRowClick={(trace) => setSelectedTraceId(trace.TraceId)}
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

      <TraceDetailSheet
        traceId={selectedTraceId}
        isOpen={selectedTraceId !== null}
        onClose={() => setSelectedTraceId(null)}
      />
    </FeaturePage>
  );
}
