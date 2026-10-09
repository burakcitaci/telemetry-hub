# Graph Report - src  (2026-10-09)

## Corpus Check
- 94 files · ~31,065 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 1 file(s) not represented in the graph (top: .css 1)

## Summary
- 203 nodes · 455 edges · 8 communities (7 shown, 1 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `63d71919`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- data-table.tsx
- traces-view.tsx
- app.tsx
- metrics-view.tsx
- service-detail-page.tsx
- services-view.tsx
- feature-layout.tsx
- app-sidebar.tsx

## God Nodes (most connected - your core abstractions)
1. `MetricsView()` - 16 edges
2. `ServiceDetailPage()` - 13 edges
3. `AppRoutes()` - 12 edges
4. `ServicesView()` - 11 edges
5. `ViewSkeleton()` - 10 edges
6. `LogsView()` - 10 edges
7. `TracesView()` - 10 edges
8. `FeaturePage()` - 10 edges
9. `FeaturePanel()` - 10 edges
10. `DataTable()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `ServiceDetailPage()` --calls--> `PageLayout()`  [EXTRACTED]
  features/services/service-detail-page.tsx → components/shared/page-layout.tsx
- `FeaturePage()` --calls--> `PageLayout()`  [EXTRACTED]
  shared/components/feature-layout.tsx → components/shared/page-layout.tsx
- `ServiceDetailPage()` --calls--> `MetricCard()`  [EXTRACTED]
  features/services/service-detail-page.tsx → components/shared/telemetry-primitives.tsx
- `MetricsView()` --calls--> `TelemetryGrid()`  [EXTRACTED]
  features/metrics/components/metrics-view.tsx → components/shared/telemetry-widget.tsx
- `MetricsView()` --calls--> `ViewSkeleton()`  [EXTRACTED]
  features/metrics/components/metrics-view.tsx → components/shared/view-skeleton.tsx

## Import Cycles
- None detected.

## Communities (8 total, 1 thin omitted)

### Community 0 - "data-table.tsx"
Cohesion: 0.06
Nodes (4): columns, columns, DataTableColumnHeader(), DataTableProps

### Community 1 - "traces-view.tsx"
Cohesion: 0.14
Nodes (19): FeatureHeader(), QueryError(), LogsView(), LogsViewProps, MetricsView(), ServicesView(), TracesView(), TracesViewProps (+11 more)

### Community 2 - "app.tsx"
Cohesion: 0.13
Nodes (12): App(), AppRoutes(), LogsPage, MetricsPage, MonitorsPage, ServiceDetailPage, ServicesPage, TracesPage (+4 more)

### Community 3 - "metrics-view.tsx"
Cohesion: 0.09
Nodes (3): QueryErrorProps, ViewSkeletonProps, MetricsViewProps

### Community 4 - "service-detail-page.tsx"
Cohesion: 0.13
Nodes (11): DataValue(), Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, MetadataField() (+3 more)

### Community 5 - "services-view.tsx"
Cohesion: 0.12
Nodes (5): FeatureHeaderProps, TimeRangeProps, ServicesViewProps, RefreshProps, TelemetryActionsProps

### Community 6 - "feature-layout.tsx"
Cohesion: 0.14
Nodes (12): badgeColors, MetricCard(), statusLabels, StatusSpanProps, TelemetryStatus, valueColors, TelemetryGrid(), TelemetryWidget() (+4 more)

## Knowledge Gaps
- **21 isolated node(s):** `navItems`, `TimeRangeProps`, `FeatureHeaderProps`, `TelemetryStatus`, `valueColors` (+16 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 112 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ViewSkeleton()` connect `app.tsx` to `traces-view.tsx`, `metrics-view.tsx`, `service-detail-page.tsx`, `services-view.tsx`, `feature-layout.tsx`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **What connects `navItems`, `TimeRangeProps`, `FeatureHeaderProps` to the rest of the system?**
  _21 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `data-table.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05647840531561462 - nodes in this community are weakly interconnected._
- **Why does `PageLayout()` connect `app.tsx` to `traces-view.tsx`, `service-detail-page.tsx`, `feature-layout.tsx`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Should `traces-view.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.13709677419354838 - nodes in this community are weakly interconnected._
- **Should `app.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.13043478260869565 - nodes in this community are weakly interconnected._
- **Should `metrics-view.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09420289855072464 - nodes in this community are weakly interconnected._