import { FeatureRefreshButton } from '@/shared/components/feature-actions';
import { useState } from 'react';
import {
  FeaturePage,
  FeatureHeader,
  FeatureBody,
  FeatureContent,
  FeaturePanel,
  FeatureSearch,
  FeatureLoading,
  FeatureEmptyState,
} from '@/shared/components/feature-layout';
import { AppFilterSidebar } from '@/components/shared/app-filter-sidebar';
import type { useMonitors } from '../hooks/use-monitors';
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  PanelLeft,
  Filter,
  Plus,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { TimeRangePicker } from '@/app/components/timer-range.picker';
import {
  MonitorType,
  statusBg,
  statusLabel,
  STATUS_FILTERS,
} from '@/features/monitors/model';
import {
  typeIcon,
  MonitorRow,
  MonitorDetail,
  MonitorForm,
} from '@/features/monitors/components/monitors-components';

type MonitorsViewProps = ReturnType<typeof useMonitors>;

export function MonitorsView({
  navigate,
  monitors,
  setMonitors,
  loading,
  saving,
  refresh,
  error,
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  typeFilter,
  setTypeFilter,
  timeRange,
  setTimeRange,
  sidebarOpen,
  setSidebarOpen,
  setOpenId,
  creating,
  setCreating,
  events,
  seriesById,
  filtered,
  statusCounts,
  toggleStatusFilter,
  toggleTypeFilter,
  handleToggleMute,
  handleDelete,
  handleSave,
  openMonitor,
  datadogForOpen,
  detailVisible,
}: MonitorsViewProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  return (
    <FeaturePage>
      {/* Header */}
      <FeatureHeader
        title="Monitors"
        icon={Bell}
        description={
          <>
            {filtered.length} of {monitors.length} shown
            {statusCounts.Alert > 0 && (
              <span className="ml-2 text-destructive">
                · {statusCounts.Alert} alerting
              </span>
            )}
          </>
        }
        leading={
          <>
            {' '}
            <Button
              variant="ghost"
              size="icon"
              aria-label="Go back"
              onClick={() => navigate(-1)}
              className="shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="hidden shrink-0 lg:inline-flex"
              aria-label={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
              title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
              onClick={() => setSidebarOpen((v) => !v)}
            >
              <PanelLeft className="h-4 w-4" />
            </Button>{' '}
            <Button variant="ghost" size="icon" className="shrink-0 lg:hidden" aria-label="Open filters" onClick={() => setFiltersOpen(true)}>
              <Filter className="h-4 w-4" />
            </Button>
          </>
        }
        actions={
          <>
            <TimeRangePicker value={timeRange} onChange={setTimeRange} />
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                setCreating(true);
                setOpenId(null);
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only">New monitor</span>
            </Button>
            <FeatureRefreshButton
              loading={loading}
              onRefresh={refresh}
              label="Refresh monitors"
            />
          </>
        }
      />

      <FeatureBody>
        {/* Sidebar */}
        <AppFilterSidebar
          title="Filters"
          mobileOpen={filtersOpen}
          onMobileOpenChange={setFiltersOpen}
          open={sidebarOpen}
          onOpenChange={setSidebarOpen}
        >
          <FeatureSearch
            placeholder="Search monitors…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div>
            <p className="mb-2 text-[10px] uppercase tracking-wide text-muted-foreground">
              Status
            </p>
            <div className="space-y-0.5">
              {STATUS_FILTERS.map((s) => {
                const on = statusFilter.has(s);
                const count = statusCounts[s] ?? 0;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleStatusFilter(s)}
                    className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-xs transition-colors ${
                      on
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:bg-accent/50'
                    }`}
                  >
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${statusBg(s)}`}
                    />
                    <span className="flex-1">{statusLabel(s)}</span>
                    <span className="text-[10px] tabular-nums text-muted-foreground">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[10px] uppercase tracking-wide text-muted-foreground">
              Type
            </p>
            <div className="space-y-0.5">
              {(['metric', 'log', 'other'] as MonitorType[]).map((t) => {
                const on = typeFilter.has(t);
                const count = monitors.filter((m) => m.type === t).length;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTypeFilter(t)}
                    className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-xs transition-colors ${
                      on
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:bg-accent/50'
                    }`}
                  >
                    {typeIcon(t)}
                    <span className="flex-1 capitalize">{t}</span>
                    <span className="text-[10px] tabular-nums text-muted-foreground">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </AppFilterSidebar>

        {/* List (full width) + Sheet */}
        <FeatureContent>
          <FeaturePanel>
            <div className="flex items-center justify-between border-b px-4 py-2">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>
                  {filtered.length} monitor{filtered.length === 1 ? '' : 's'}
                </span>
                {(statusFilter.size > 0 || typeFilter.size > 0 || search) && (
                  <button
                    className="text-primary hover:underline"
                    onClick={() => {
                      setStatusFilter(new Set());
                      setTypeFilter(new Set());
                      setSearch('');
                    }}
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </div>

            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">{error}</AlertDescription>
              </Alert>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto">
              <p role="note" className="mb-2 text-xs text-muted-foreground">
                Configuration only — evaluation and notification delivery are not connected.
                Without an evaluation timestamp, status is Unknown.
              </p>
              {loading && monitors.length === 0 ? (
                <FeatureLoading />
              ) : filtered.length === 0 ? (
                <FeatureEmptyState>
                  <Bell className="h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    {monitors.length === 0
                      ? 'No monitor configurations yet. Create one to define a rule.'
                      : 'No monitors match the current filters.'}
                  </p>
                  {monitors.length === 0 && (
                    <Button
                      onClick={() => {
                        setCreating(true);
                        setOpenId(null);
                      }}
                    >
                      <Plus className="mr-1.5 h-4 w-4" /> New monitor
                    </Button>
                  )}
                </FeatureEmptyState>
              ) : (
                filtered.map((m) => (
                  <MonitorRow
                    key={m.id}
                    monitor={m}
                    series={seriesById[m.id] ?? { points: [], threshold: 0 }}
                    onToggleMute={handleToggleMute}
                    onOpen={(id) => {
                      setOpenId(id);
                      setCreating(false);
                    }}
                    onDelete={handleDelete}
                  />
                ))
              )}
            </div>
          </FeaturePanel>

          {/* Detail / form as a right-side sheet */}
          <Sheet
            open={detailVisible}
            onOpenChange={(open) => {
              if (!open) {
                setOpenId(null);
                setCreating(false);
              }
            }}
          >
            <SheetContent
              side="right"
              className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl lg:max-w-3xl"
            >
              {/* Radix requires a title for accessibility; hide it visually. */}
              <SheetHeader className="sr-only">
                <SheetTitle>
                  {creating ? 'New monitor' : (openMonitor?.name ?? 'Monitor')}
                </SheetTitle>
                <SheetDescription>
                  {creating
                    ? 'Define a query, a threshold, and who to notify.'
                    : 'Monitor detail and state history.'}
                </SheetDescription>
              </SheetHeader>

              {creating ? (
                <MonitorForm
                  initial={openMonitor}
                  pending={saving}
                  error={error}
                  onCancel={() => setCreating(false)}
                  onSave={handleSave}
                />
              ) : openMonitor ? (
                <MonitorDetail
                  monitor={openMonitor}
                  datadogMonitor={datadogForOpen}
                  events={events[openMonitor.id] ?? []}
                  onClose={() => setOpenId(null)}
                  onToggleMute={handleToggleMute}
                  onEdit={() => setCreating(true)}
                />
              ) : null}
            </SheetContent>
          </Sheet>
        </FeatureContent>
      </FeatureBody>
    </FeaturePage>
  );
}
