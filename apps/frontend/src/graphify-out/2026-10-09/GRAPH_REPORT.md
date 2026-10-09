# Graph Report - src  (2026-10-09)

## Corpus Check
- 96 files · ~31,861 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 1 file(s) not represented in the graph (top: .css 1)

## Summary
- 316 nodes · 815 edges · 8 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3b17240f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- data-table.tsx
- metrics-view.tsx
- app-sidebar.tsx
- trace-detail-sheet.tsx
- service-detail-page.tsx
- use-services.tsx
- use-traces.tsx
- use-metrics.tsx

## God Nodes (most connected - your core abstractions)
1. `MetricsView()` - 20 edges
2. `ServiceDetailPage()` - 15 edges
3. `DataTable()` - 15 edges
4. `TracesView()` - 12 edges
5. `AppRoutes()` - 12 edges
6. `LogsView()` - 11 edges
7. `ServicesView()` - 11 edges
8. `useMetrics()` - 10 edges
9. `FeaturePage()` - 10 edges
10. `ViewSkeleton()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `LogsView()` --calls--> `DataTable()`  [EXTRACTED]
  features/logs/components/logs-view.tsx → shared/components/data-table.tsx
- `MetricsView()` --calls--> `CardContent`  [EXTRACTED]
  features/metrics/components/metrics-view.tsx → components/ui/card.tsx
- `MetricsView()` --calls--> `CardTitle`  [EXTRACTED]
  features/metrics/components/metrics-view.tsx → components/ui/card.tsx
- `MetricsView()` --calls--> `DataTable()`  [EXTRACTED]
  features/metrics/components/metrics-view.tsx → shared/components/data-table.tsx
- `MetricsView()` --calls--> `EnvironmentFilter()`  [EXTRACTED]
  features/metrics/components/metrics-view.tsx → shared/components/environment-filter.tsx

## Import Cycles
- None detected.

## Communities (8 total, 0 thin omitted)

### Community 0 - "data-table.tsx"
Cohesion: 0.11
Nodes (11): Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow (+3 more)

### Community 1 - "metrics-view.tsx"
Cohesion: 0.11
Nodes (33): FeatureHeader(), TelemetryGrid(), TelemetryWidget(), QueryError(), QueryErrorProps, ViewSkeleton(), ViewSkeletonProps, LogsView() (+25 more)

### Community 2 - "app-sidebar.tsx"
Cohesion: 0.07
Nodes (12): App(), AppRoutes(), LogsPage, MetricsPage, MonitorsPage, ServiceDetailPage, ServicesPage, TracesPage (+4 more)

### Community 3 - "trace-detail-sheet.tsx"
Cohesion: 0.07
Nodes (9): columns, TraceDetailSheetProps, EnvironmentFilter(), FacetIcon(), FilterPanel(), TelemetrySidebarProps, timeRanges, EnvironmentSource (+1 more)

### Community 4 - "service-detail-page.tsx"
Cohesion: 0.09
Nodes (18): FeatureHeaderProps, TimeRangeProps, badgeColors, DataValue(), MetricCard(), statusLabels, StatusSpanProps, TelemetryStatus (+10 more)

### Community 5 - "use-services.tsx"
Cohesion: 0.16
Nodes (6): getServiceMetrics(), getServices(), SummaryState, useServiceSummary(), load(), useServices()

### Community 6 - "use-traces.tsx"
Cohesion: 0.07
Nodes (23): getLogs(), LogsQueryParams, useLogs(), getTraceById(), getTraces(), normalizeSpan(), normalizeTrace(), StatusBadge() (+15 more)

### Community 7 - "use-metrics.tsx"
Cohesion: 0.09
Nodes (25): useMetrics(), API_BASE, ApiMetric, colorFor(), DEFAULT_LIMIT, FACET_DEFS, formatBytes(), formatTime() (+17 more)

## Knowledge Gaps
- **33 isolated node(s):** `navItems`, `LogsQueryParams`, `LogsViewProps`, `MetricsViewProps`, `MAIN_MIN_WIDTH` (+28 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 112 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ViewSkeleton()` connect `metrics-view.tsx` to `app-sidebar.tsx`, `service-detail-page.tsx`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **What connects `navItems`, `LogsQueryParams`, `LogsViewProps` to the rest of the system?**
  _33 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `data-table.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._
- **Why does `DataTable()` connect `data-table.tsx` to `metrics-view.tsx`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Should `metrics-view.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10714285714285714 - nodes in this community are weakly interconnected._
- **Why does `useServiceSummary()` connect `use-services.tsx` to `service-detail-page.tsx`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **Should `app-sidebar.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06882591093117409 - nodes in this community are weakly interconnected._