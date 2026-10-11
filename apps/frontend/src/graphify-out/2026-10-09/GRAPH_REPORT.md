# Graph Report - src  (2026-10-09)

## Corpus Check
- 96 files · ~32,086 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 1 file(s) not represented in the graph (top: .css 1)

## Summary
- 315 nodes · 823 edges · 8 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6276bca5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- data-table.tsx
- feature-layout.tsx
- app-sidebar.tsx
- trace-detail-sheet.tsx
- metrics-view.tsx
- telemetry-sidebar.tsx
- use-traces.tsx
- use-metrics.tsx

## God Nodes (most connected - your core abstractions)
1. `MetricsView()` - 20 edges
2. `ServiceDetailPage()` - 16 edges
3. `DataTable()` - 15 edges
4. `ServicesView()` - 14 edges
5. `TracesView()` - 12 edges
6. `AppRoutes()` - 12 edges
7. `LogsView()` - 11 edges
8. `EnvironmentFilter()` - 10 edges
9. `FeaturePage()` - 10 edges
10. `FeaturePanel()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `FeaturePanel()` --calls--> `TelemetryWidget()`  [EXTRACTED]
  shared/components/feature-layout.tsx → components/shared/telemetry-widget.tsx
- `LogsView()` --calls--> `DataTable()`  [EXTRACTED]
  features/logs/components/logs-view.tsx → shared/components/data-table.tsx
- `MetricsView()` --calls--> `DataTable()`  [EXTRACTED]
  features/metrics/components/metrics-view.tsx → shared/components/data-table.tsx
- `ServicesView()` --calls--> `DataTable()`  [EXTRACTED]
  features/services/components/services-view.tsx → shared/components/data-table.tsx
- `TracesView()` --calls--> `DataTable()`  [EXTRACTED]
  features/traces/components/traces-view.tsx → shared/components/data-table.tsx

## Import Cycles
- None detected.

## Communities (8 total, 0 thin omitted)

### Community 0 - "data-table.tsx"
Cohesion: 0.12
Nodes (10): Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow (+2 more)

### Community 1 - "feature-layout.tsx"
Cohesion: 0.11
Nodes (27): FeatureHeader(), FeatureHeaderProps, TimeRangeProps, QueryErrorProps, ViewSkeletonProps, LogsView(), LogsViewProps, ServicesView() (+19 more)

### Community 2 - "app-sidebar.tsx"
Cohesion: 0.07
Nodes (13): App(), AppRoutes(), LogsPage, MetricsPage, MonitorsPage, ServiceDetailPage, ServicesPage, TracesPage (+5 more)

### Community 3 - "trace-detail-sheet.tsx"
Cohesion: 0.06
Nodes (17): columns, columns, StatusBadge(), TraceDetailSheet(), TraceDetailSheetProps, columns, DataTableColumnHeader(), TelemetryViewParamsOptions (+9 more)

### Community 4 - "metrics-view.tsx"
Cohesion: 0.09
Nodes (24): badgeColors, DataValue(), MetricCard(), statusLabels, StatusSpanProps, TelemetryStatus, valueColors, TelemetryGrid() (+16 more)

### Community 5 - "telemetry-sidebar.tsx"
Cohesion: 0.18
Nodes (7): EnvironmentFilter(), FacetIcon(), FilterPanel(), TelemetrySidebarProps, timeRanges, EnvironmentSource, useEnvironments()

### Community 6 - "use-traces.tsx"
Cohesion: 0.07
Nodes (15): getLogs(), LogsQueryParams, useLogs(), getServiceMetrics(), getServices(), SummaryState, useServiceSummary(), load() (+7 more)

### Community 7 - "use-metrics.tsx"
Cohesion: 0.10
Nodes (23): useMetrics(), API_BASE, ApiMetric, colorFor(), DEFAULT_LIMIT, FACET_DEFS, formatBytes(), formatTime() (+15 more)

## Knowledge Gaps
- **33 isolated node(s):** `DataTableProps`, `LayoutProps`, `HeaderProps`, `SidebarProps`, `timeRanges` (+28 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 112 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ViewSkeleton()` connect `app-sidebar.tsx` to `feature-layout.tsx`, `metrics-view.tsx`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **What connects `DataTableProps`, `LayoutProps`, `HeaderProps` to the rest of the system?**
  _33 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `data-table.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.1164021164021164 - nodes in this community are weakly interconnected._
- **Why does `DataTable()` connect `data-table.tsx` to `feature-layout.tsx`, `metrics-view.tsx`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Should `feature-layout.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10509803921568628 - nodes in this community are weakly interconnected._
- **Why does `EnvironmentFilter()` connect `telemetry-sidebar.tsx` to `data-table.tsx`, `feature-layout.tsx`, `metrics-view.tsx`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Should `app-sidebar.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06707317073170732 - nodes in this community are weakly interconnected._