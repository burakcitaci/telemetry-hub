# Graph Report - src  (2026-10-09)

## Corpus Check
- 99 files · ~32,405 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 1 file(s) not represented in the graph (top: .css 1)

## Summary
- 324 nodes · 856 edges · 9 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `fedb4873`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- data-table.tsx
- metrics-view.tsx
- app.tsx
- shared/trace-detail-sheet.tsx
- service-detail-page.tsx
- telemetry-sidebar.tsx
- use-traces.tsx
- use-metrics.tsx
- facet-query-bar.tsx

## God Nodes (most connected - your core abstractions)
1. `MetricsView()` - 20 edges
2. `ServiceDetailPage()` - 16 edges
3. `DataTable()` - 15 edges
4. `ServicesView()` - 14 edges
5. `AppRoutes()` - 12 edges
6. `TraceDetailSheet()` - 12 edges
7. `TracesView()` - 12 edges
8. `ViewSkeleton()` - 12 edges
9. `LogsView()` - 11 edges
10. `FeaturePage()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `AppRoutes()` --calls--> `ViewSkeleton()`  [EXTRACTED]
  app/app.tsx → components/shared/view-skeleton.tsx
- `TraceDetailSheet()` --calls--> `getTraceById()`  [EXTRACTED]
  components/shared/trace-detail-sheet.tsx → features/traces/api.ts
- `ActiveTraceProvider()` --calls--> `TraceDetailSheet()`  [EXTRACTED]
  shared/hooks/use-active-trace.tsx → components/shared/trace-detail-sheet.tsx
- `LogTraceLink()` --calls--> `useActiveTrace()`  [EXTRACTED]
  features/logs/components/logs-components.tsx → shared/hooks/use-active-trace.tsx
- `ServicesView()` --calls--> `QueryError()`  [EXTRACTED]
  features/services/components/services-view.tsx → components/shared/view-skeleton.tsx

## Import Cycles
- None detected.

## Communities (9 total, 0 thin omitted)

### Community 0 - "data-table.tsx"
Cohesion: 0.11
Nodes (10): Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow (+2 more)

### Community 1 - "metrics-view.tsx"
Cohesion: 0.09
Nodes (34): FeatureHeader(), FeatureHeaderProps, TimeRangeProps, TelemetryGrid(), TelemetryWidget(), QueryErrorProps, ViewSkeleton(), ViewSkeletonProps (+26 more)

### Community 2 - "app.tsx"
Cohesion: 0.07
Nodes (13): App(), AppRoutes(), LogsPage, MetricsPage, MonitorsPage, ServiceDetailPage, ServicesPage, TracesPage (+5 more)

### Community 3 - "shared/trace-detail-sheet.tsx"
Cohesion: 0.06
Nodes (22): StatusBadge(), TraceDetailSheet(), TraceDetailSheetProps, QueryError(), columns, LogTraceLink(), columns, useTraces() (+14 more)

### Community 4 - "service-detail-page.tsx"
Cohesion: 0.12
Nodes (17): badgeColors, DataValue(), MetricCard(), statusLabels, StatusSpanProps, TelemetryStatus, valueColors, Card (+9 more)

### Community 5 - "telemetry-sidebar.tsx"
Cohesion: 0.20
Nodes (5): FacetIcon(), FilterPanel(), TelemetrySidebarProps, timeRanges, EnvironmentSource

### Community 6 - "use-traces.tsx"
Cohesion: 0.06
Nodes (16): getLogs(), LogsQueryParams, useLogs(), getServiceMetrics(), getServices(), columns, SummaryState, useServiceSummary() (+8 more)

### Community 7 - "use-metrics.tsx"
Cohesion: 0.14
Nodes (21): useMetrics(), API_BASE, ApiMetric, colorFor(), DEFAULT_LIMIT, FACET_DEFS, formatBytes(), formatTime() (+13 more)

### Community 8 - "facet-query-bar.tsx"
Cohesion: 0.22
Nodes (4): FacetPill(), FacetQueryBar(), FacetQueryBarProps, Suggestion

## Knowledge Gaps
- **35 isolated node(s):** `TraceDetailSheetProps`, `ServicesViewProps`, `TracesViewProps`, `LayoutProps`, `HeaderProps` (+30 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 109 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ViewSkeleton()` connect `metrics-view.tsx` to `app.tsx`, `shared/trace-detail-sheet.tsx`, `service-detail-page.tsx`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **What connects `TraceDetailSheetProps`, `ServicesViewProps`, `TracesViewProps` to the rest of the system?**
  _35 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `data-table.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10887096774193548 - nodes in this community are weakly interconnected._
- **Why does `DataTable()` connect `data-table.tsx` to `metrics-view.tsx`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Should `metrics-view.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09086538461538461 - nodes in this community are weakly interconnected._
- **Why does `EnvironmentFilter()` connect `service-detail-page.tsx` to `data-table.tsx`, `metrics-view.tsx`, `telemetry-sidebar.tsx`, `use-traces.tsx`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **Should `app.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07435897435897436 - nodes in this community are weakly interconnected._