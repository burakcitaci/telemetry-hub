import type { useMonitors } from '../hooks/use-monitors';
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  PanelLeft,
  Plus,
  RefreshCw,
  Search,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  return (
    <div className="flex h-full min-h-0 flex-col bg-background text-foreground overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-20 shrink-0 border-b bg-background/95 backdrop-blur">
        <div className="flex h-14 items-center gap-2 px-3 sm:gap-3 sm:px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
            onClick={() => setSidebarOpen((v) => !v)}
          >
            <PanelLeft className="h-4 w-4" />
          </Button>

          <Bell className="h-4 w-4 text-primary shrink-0" />
          <h1 className="text-sm font-semibold shrink-0">Monitors</h1>
          <span className="text-muted-foreground hidden md:inline shrink-0">
            /
          </span>
          <span className="text-sm text-muted-foreground truncate min-w-0">
            {filtered.length} of {monitors.length} shown
            {statusCounts.Alert > 0 && (
              <span className="ml-2 text-destructive font-medium">
                · {statusCounts.Alert} alerting
              </span>
            )}
          </span>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2 shrink-0">
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
              <span className="hidden sm:inline">New monitor</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMonitors((prev) => [...prev])}
              disabled={loading}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
              />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`hidden md:flex h-full min-h-0 shrink-0 flex-col border-r bg-muted/30 transition-all duration-200 ${
            sidebarOpen ? 'w-64 sm:w-72' : 'w-11'
          }`}
        >
          {sidebarOpen ? (
            <>
              <div className="flex shrink-0 items-center justify-between border-b px-3 py-2">
                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Filters
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarOpen(false)}
                  className="h-7 w-7"
                >
                  <PanelLeft className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-3 space-y-4">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search monitors…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8"
                  />
                </div>

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
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center py-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(true)}
                className="h-8 w-8"
              >
                <PanelLeft className="h-4 w-4" />
              </Button>
            </div>
          )}
        </aside>

        {/* List (full width) + Sheet */}
        <div className="flex flex-1 min-w-0">
          <div className="flex min-w-0 flex-1 flex-col">
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
              <Alert variant="destructive" className="m-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">{error}</AlertDescription>
              </Alert>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto">
              {loading && monitors.length === 0 ? (
                <div className="space-y-2 p-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-14 animate-pulse rounded bg-muted"
                    />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
                  <Bell className="h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    {monitors.length === 0
                      ? 'No monitors yet. Create one to start getting notified.'
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
                </div>
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
          </div>

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
                  onCancel={() => setCreating(false)}
                  onSave={handleSave}
                />
              ) : openMonitor && datadogForOpen ? (
                <MonitorDetail
                  monitor={openMonitor}
                  datadogMonitor={datadogForOpen}
                  events={events[openMonitor.id] ?? []}
                  onClose={() => setOpenId(null)}
                  onToggleMute={handleToggleMute}
                />
              ) : null}
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
  );
}
