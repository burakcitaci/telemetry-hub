# Graph Report - src  (2026-10-11)

## Corpus Check
- 99 files · ~32,192 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 1 file(s) not represented in the graph (top: .css 1)

## Summary
- 338 nodes · 905 edges · 7 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b41e7ce7`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- data-table.tsx
- metrics-view.tsx
- app.tsx
- shared/trace-detail-sheet.tsx
- service-detail-page.tsx
- use-traces.tsx
- use-metrics.tsx

## God Nodes (most connected - your core abstractions)
1. `MetricsView()` - 19 edges
2. `ServiceDetailPage()` - 16 edges
3. `DataTable()` - 15 edges
4. `AppFilterSidebar()` - 14 edges
5. `ServicesView()` - 13 edges
6. `TracesView()` - 12 edges
7. `FeaturePage()` - 12 edges
8. `FeaturePanel()` - 12 edges
9. `ViewSkeleton()` - 12 edges
10. `AppRoutes()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `AppFilterSidebar()` --calls--> `EnvironmentFilter()`  [EXTRACTED]
  components/shared/app-filter-sidebar.tsx → shared/components/environment-filter.tsx
- `severityBadge()` --calls--> `Badge()`  [EXTRACTED]
  features/logs/components/logs-components.tsx → components/ui/badge.tsx
- `statusBadge()` --calls--> `Badge()`  [EXTRACTED]
  features/traces/components/traces-components.tsx → components/ui/badge.tsx
- `LogTraceLink()` --calls--> `useActiveTrace()`  [EXTRACTED]
  features/logs/components/logs-components.tsx → shared/hooks/use-active-trace.tsx
- `LogsView()` --calls--> `DataTable()`  [EXTRACTED]
  features/logs/components/logs-view.tsx → shared/components/data-table.tsx

## Import Cycles
- None detected.

## Communities (7 total, 0 thin omitted)

### Community 0 - "data-table.tsx"
Cohesion: 0.11
Nodes (12): Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow (+4 more)

### Community 1 - "metrics-view.tsx"
Cohesion: 0.08
Nodes (32): AppFilterSidebar(), FeatureHeader(), QueryError(), QueryErrorProps, ViewSkeletonProps, LogsView(), LogsViewProps, MetricsView() (+24 more)

### Community 2 - "app.tsx"
Cohesion: 0.07
Nodes (13): App(), AppRoutes(), LogsPage, MetricsPage, MonitorsPage, ServiceDetailPage, ServicesPage, TracesPage (+5 more)

### Community 3 - "shared/trace-detail-sheet.tsx"
Cohesion: 0.06
Nodes (21): AppFacetOption, AppFilterSidebarProps, FacetSelector(), ServiceSelector(), StatusBadge(), TraceDetailSheet(), TraceDetailSheetProps, Badge() (+13 more)

### Community 4 - "service-detail-page.tsx"
Cohesion: 0.11
Nodes (22): FeatureHeaderProps, TimeRangeProps, badgeColors, DataValue(), MetricCard(), statusLabels, StatusSpanProps, TelemetryStatus (+14 more)

### Community 6 - "use-traces.tsx"
Cohesion: 0.06
Nodes (23): FacetOption, getLogs(), LogsQueryParams, useLogs(), getServiceMetrics(), getServices(), SummaryState, useServiceSummary() (+15 more)

### Community 7 - "use-metrics.tsx"
Cohesion: 0.09
Nodes (25): useMetrics(), API_BASE, ApiMetric, colorFor(), DEFAULT_LIMIT, FACET_DEFS, formatBytes(), formatTime() (+17 more)

## Knowledge Gaps
- **36 isolated node(s):** `navItems`, `AppFacetOption`, `BadgeProps`, `LogsViewProps`, `MetricsViewProps` (+31 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 119 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ViewSkeleton()` connect `service-detail-page.tsx` to `metrics-view.tsx`, `app.tsx`, `shared/trace-detail-sheet.tsx`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **What connects `navItems`, `AppFacetOption`, `BadgeProps` to the rest of the system?**
  _36 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `data-table.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10804597701149425 - nodes in this community are weakly interconnected._
- **Why does `DataTable()` connect `data-table.tsx` to `metrics-view.tsx`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Should `metrics-view.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0781981981981982 - nodes in this community are weakly interconnected._
- **Why does `AppFilterSidebar()` connect `metrics-view.tsx` to `data-table.tsx`, `shared/trace-detail-sheet.tsx`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Should `app.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07317073170731707 - nodes in this community are weakly interconnected._