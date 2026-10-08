import type { useMetrics } from '../hooks/use-metrics';
import { Checkbox } from '@/components/ui/checkbox';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Area,
} from 'recharts';
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  Download,
  Filter,
  Info,
  PanelLeft,
  RefreshCw,
  Search,
} from 'lucide-react';
import { DataTable } from '@/shared/components/data-table';
import { FacetQueryBar } from '@/shared/components/facet-query-bar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { TimeRangePicker } from '@/app/components/timer-range.picker';
import {
  MAIN_MIN_WIDTH,
  makeSeriesId,
  formatValue,
} from '@/features/metrics/model';
import {
  MetricStatCard,
  CustomTooltip,
  SeriesLegend,
} from '@/features/metrics/components/metrics-components';

type MetricsViewProps = ReturnType<typeof useMetrics>;

export function MetricsView({
  navigate,
  catalogError,
  metricSearch,
  setMetricSearch,
  selectedId,
  setSelectedId,
  records,
  metricType,
  seriesLoading,
  seriesError,
  setRefreshTick,
  facetSelection,
  setFacetSelection,
  groupBy,
  setGroupBy,
  hiddenSeries,
  setHiddenSeries,
  hideTransient,
  setHideTransient,
  timeRange,
  setTimeRange,
  chartType,
  setChartType,
  autoRefresh,
  setAutoRefresh,
  sidebarOpen,
  setSidebarOpen,
  facets,
  filteredRecords,
  series,
  visibleSeries,
  chartData,
  yDomain,
  summaryStats,
  activeUnit,
  tableRows,
  filteredCatalog,
  selectedMetric,
  selectedNotInCatalog,
  columns,
}: MetricsViewProps) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-background text-foreground overflow-hidden">
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
          <Activity className="h-4 w-4 text-primary shrink-0 hidden sm:block" />
          <h1 className="text-sm font-semibold hidden md:block shrink-0">
            Metrics Explorer
          </h1>
          <span className="text-muted-foreground hidden md:inline shrink-0">
            /
          </span>
          <span className="font-mono text-sm text-muted-foreground truncate min-w-0">
            {selectedMetric?.metricName ?? '—'}
          </span>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2 shrink-0">
            <TimeRangePicker value={timeRange} onChange={setTimeRange} />
            <Button
              variant={autoRefresh ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAutoRefresh((v) => !v)}
              className="gap-1.5"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${seriesLoading ? 'animate-spin' : ''}`}
              />
              <span className="hidden sm:inline">
                {autoRefresh ? 'Auto' : 'Manual'}
              </span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setRefreshTick((x) => x + 1)}
              disabled={seriesLoading}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${seriesLoading ? 'animate-spin' : ''}`}
              />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Metric catalog sidebar */}
        <aside
          className={`hidden md:flex h-full min-h-0 shrink-0 flex-col border-r bg-muted/30 transition-all duration-200 ${
            sidebarOpen ? 'w-64 sm:w-72' : 'w-11'
          }`}
        >
          {sidebarOpen ? (
            <>
              <div className="flex shrink-0 items-center justify-between border-b px-3 py-2">
                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Metrics
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
              <div className="min-h-0 flex-1 overflow-y-auto p-3">
                <div className="relative mb-3">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search metrics…"
                    value={metricSearch}
                    onChange={(e) => setMetricSearch(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <p className="mb-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                  {filteredCatalog.length} metric
                  {filteredCatalog.length === 1 ? '' : 's'}
                </p>
                {catalogError && (
                  <Alert variant="destructive" className="mb-2">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <AlertDescription className="text-xs">
                      {catalogError}
                    </AlertDescription>
                  </Alert>
                )}
                <div className="space-y-0.5">
                  {filteredCatalog.map((m) => {
                    const id = makeSeriesId(m);
                    const isSelected = selectedId === id;
                    return (
                      <button
                        key={id}
                        onClick={() => {
                          setSelectedId(id);
                          setFacetSelection({});
                          setHiddenSeries(new Set());
                        }}
                        className={`flex w-full items-center gap-2.5 rounded-md px-3 py-1.5 text-left transition-colors ${
                          isSelected
                            ? 'bg-accent text-accent-foreground'
                            : 'text-muted-foreground hover:bg-accent/50'
                        }`}
                      >
                        <span
                          className={`h-2.5 w-2.5 shrink-0 rounded-full ${isSelected ? 'bg-primary' : 'bg-muted/60'}`}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-mono text-xs">
                            {m.metricName}
                          </span>
                          <span className="block truncate text-[10px] opacity-70">
                            {m.serviceName ?? '—'} · {m.metricType}
                          </span>
                        </span>
                      </button>
                    );
                  })}
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

        {/* Main */}
        <div className="flex-1 min-w-0 overflow-x-auto overflow-y-hidden">
          <section
            className="h-full overflow-y-auto p-4 lg:p-6"
            style={{ minWidth: MAIN_MIN_WIDTH }}
          >
            {/* Filters + group by */}
            <Card className="mb-4">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Filters</CardTitle>
                <span className="text-xs text-muted-foreground">
                  {filteredRecords.length} of {records.length} records · grouped
                  by{' '}
                  <code className="font-mono">
                    {groupBy.join(' + ') || 'nothing'}
                  </code>
                </span>
              </CardHeader>
              <CardContent className="space-y-3">
                <FacetQueryBar
                  facets={facets}
                  selection={facetSelection}
                  onChange={setFacetSelection}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Group by
                  </span>
                  {facets.map((facet) => {
                    const on = groupBy.includes(facet.key);
                    return (
                      <button
                        key={facet.key}
                        type="button"
                        onClick={() =>
                          setGroupBy((prev) =>
                            prev.includes(facet.key)
                              ? prev.filter((k) => k !== facet.key)
                              : [...prev, facet.key],
                          )
                        }
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${
                          on
                            ? 'border-transparent bg-accent text-accent-foreground'
                            : 'border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground/60'
                        }`}
                      >
                        {facet.label}
                        {on && <span className="text-muted-foreground">×</span>}
                      </button>
                    );
                  })}
                  {groupBy.length === 0 && (
                    <span className="text-[11px] text-muted-foreground">
                      (one merged series)
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            {selectedNotInCatalog && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Metric <code>{selectedId}</code> isn't in the catalog. It may
                  have been renamed or removed. Pick another metric from the
                  sidebar.
                </AlertDescription>
              </Alert>
            )}

            {seriesError && !selectedNotInCatalog && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  {seriesError}
                </AlertDescription>
              </Alert>
            )}

            {/* Stats */}
            {summaryStats && (
              <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                <MetricStatCard
                  label="Current"
                  value={formatValue(summaryStats.latest, activeUnit)}
                  color="text-primary dark:text-primary"
                />
                <MetricStatCard
                  label="Average"
                  value={formatValue(summaryStats.avg, activeUnit)}
                />
                <MetricStatCard
                  label="Max"
                  value={formatValue(summaryStats.max, activeUnit)}
                  color="text-warning dark:text-warning"
                />
                <MetricStatCard
                  label="Min"
                  value={formatValue(summaryStats.min, activeUnit)}
                  color="text-success dark:text-success"
                />
              </div>
            )}

            {/* Chart */}
            <Card className="mb-4">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Time Series
                  {activeUnit && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      ({activeUnit})
                    </span>
                  )}
                </CardTitle>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                    <Checkbox
                      checked={hideTransient}
                      onCheckedChange={setHideTransient}
                      className="h-3 w-3"
                    />
                    Hide short-lived
                  </label>
                  <span className="text-xs text-muted-foreground">
                    {visibleSeries.length} of {series.length}
                  </span>
                  <div className="flex items-center gap-1 rounded-md border p-0.5">
                    {(['line', 'bar', 'area', 'composed'] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setChartType(t)}
                        className={`rounded px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
                          chartType === t
                            ? 'bg-accent text-accent-foreground'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="h-[220px] w-full">
                  {seriesLoading ? (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />{' '}
                      Loading…
                    </div>
                  ) : visibleSeries.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      {series.length === 0
                        ? 'No data for the current filters'
                        : 'All series hidden — click a legend item below'}
                    </div>
                  ) : chartData.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      No data points returned
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      {chartType === 'composed' ? (
                        <ComposedChart
                          data={chartData}
                          margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            className="stroke-muted"
                            vertical={false}
                          />
                          <XAxis
                            dataKey="time"
                            tick={{ fontSize: 10 }}
                            tickLine={false}
                            axisLine={false}
                            interval="preserveStartEnd"
                            height={20}
                          />
                          <YAxis
                            domain={yDomain}
                            tick={{ fontSize: 10 }}
                            tickLine={false}
                            axisLine={false}
                            width={64}
                            tickFormatter={(v) => formatValue(v, activeUnit)}
                          />
                          <Tooltip
                            content={<CustomTooltip unit={activeUnit} />}
                          />
                          {visibleSeries.map((s, i) =>
                            i % 2 === 0 ? (
                              <Bar
                                key={s.id}
                                dataKey={s.id}
                                name={s.label}
                                fill={s.color}
                                fillOpacity={0.5}
                              />
                            ) : (
                              <Line
                                key={s.id}
                                type="monotone"
                                dataKey={s.id}
                                name={s.label}
                                stroke={s.color}
                                strokeWidth={1.5}
                                dot={{ r: 2, strokeWidth: 0, fill: s.color }}
                                activeDot={{ r: 3 }}
                                connectNulls
                              />
                            ),
                          )}
                        </ComposedChart>
                      ) : chartType === 'bar' ? (
                        <BarChart
                          data={chartData}
                          margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            className="stroke-muted"
                            vertical={false}
                          />
                          <XAxis
                            dataKey="time"
                            tick={{ fontSize: 10 }}
                            tickLine={false}
                            axisLine={false}
                            interval="preserveStartEnd"
                            height={20}
                          />
                          <YAxis
                            domain={yDomain}
                            tick={{ fontSize: 10 }}
                            tickLine={false}
                            axisLine={false}
                            width={64}
                            tickFormatter={(v) => formatValue(v, activeUnit)}
                          />
                          <Tooltip
                            content={<CustomTooltip unit={activeUnit} />}
                          />
                          {visibleSeries.map((s) => (
                            <Bar
                              key={s.id}
                              dataKey={s.id}
                              name={s.label}
                              fill={s.color}
                              fillOpacity={0.75}
                            />
                          ))}
                        </BarChart>
                      ) : chartType === 'area' ? (
                        <ComposedChart
                          data={chartData}
                          margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                        >
                          <defs>
                            {visibleSeries.map((s) => (
                              <linearGradient
                                key={s.id}
                                id={`g-${s.id.replace(/[^a-z0-9]/gi, '')}`}
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                              >
                                <stop
                                  offset="5%"
                                  stopColor={s.color}
                                  stopOpacity={0.25}
                                />
                                <stop
                                  offset="95%"
                                  stopColor={s.color}
                                  stopOpacity={0}
                                />
                              </linearGradient>
                            ))}
                          </defs>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            className="stroke-muted"
                            vertical={false}
                          />
                          <XAxis
                            dataKey="time"
                            tick={{ fontSize: 10 }}
                            tickLine={false}
                            axisLine={false}
                            interval="preserveStartEnd"
                            height={20}
                          />
                          <YAxis
                            domain={yDomain}
                            tick={{ fontSize: 10 }}
                            tickLine={false}
                            axisLine={false}
                            width={64}
                            tickFormatter={(v) => formatValue(v, activeUnit)}
                          />
                          <Tooltip
                            content={<CustomTooltip unit={activeUnit} />}
                          />
                          {visibleSeries.map((s) => (
                            <Area
                              key={s.id}
                              type="monotone"
                              dataKey={s.id}
                              name={s.label}
                              stroke={s.color}
                              strokeWidth={1.5}
                              fill={`url(#g-${s.id.replace(/[^a-z0-9]/gi, '')})`}
                              connectNulls
                            />
                          ))}
                        </ComposedChart>
                      ) : (
                        <LineChart
                          data={chartData}
                          margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            className="stroke-muted"
                            vertical={false}
                          />
                          <XAxis
                            dataKey="time"
                            tick={{ fontSize: 10 }}
                            tickLine={false}
                            axisLine={false}
                            interval="preserveStartEnd"
                            height={20}
                          />
                          <YAxis
                            domain={yDomain}
                            tick={{ fontSize: 10 }}
                            tickLine={false}
                            axisLine={false}
                            width={64}
                            tickFormatter={(v) => formatValue(v, activeUnit)}
                          />
                          <Tooltip
                            content={<CustomTooltip unit={activeUnit} />}
                          />
                          {visibleSeries.map((s) => (
                            <Line
                              key={s.id}
                              type="monotone"
                              dataKey={s.id}
                              name={s.label}
                              stroke={s.color}
                              strokeWidth={1.5}
                              dot={{ r: 2, strokeWidth: 0, fill: s.color }}
                              activeDot={{ r: 3 }}
                              connectNulls
                            />
                          ))}
                        </LineChart>
                      )}
                    </ResponsiveContainer>
                  )}
                </div>

                <SeriesLegend
                  series={series}
                  hidden={hiddenSeries}
                  onToggle={(id) => {
                    setHiddenSeries((prev) => {
                      const next = new Set(prev);
                      if (next.has(id)) next.delete(id);
                      else next.add(id);
                      return next;
                    });
                  }}
                  onIsolate={(id) => {
                    setHiddenSeries((prev) => {
                      const isIsolated =
                        prev.size === series.length - 1 && !prev.has(id);
                      if (isIsolated) return new Set();
                      return new Set(
                        series.filter((s) => s.id !== id).map((s) => s.id),
                      );
                    });
                  }}
                  onShowAll={() => setHiddenSeries(new Set())}
                />
              </CardContent>
            </Card>

            {selectedMetric && (
              <Alert className="mb-4">
                <Info className="h-4 w-4" />
                <AlertDescription className="font-mono text-xs break-all">
                  {`${metricType}:${selectedMetric.metricName}{service:${selectedMetric.serviceName ?? '*'}}`}
                  {Object.entries(facetSelection).length > 0 && (
                    <>
                      {' · '}
                      {Object.entries(facetSelection)
                        .map(([k, v]) => `${k} in (${v.join(', ')})`)
                        .join(' · ')}
                    </>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium">
                  Raw Data
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {tableRows.length} rows
                  </span>
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Filter className="h-3.5 w-3.5" /> Filter
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Download className="h-3.5 w-3.5" /> CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {tableRows.length ? (
                  <DataTable columns={columns} data={tableRows} />
                ) : (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No data points yet
                  </p>
                )}
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}
