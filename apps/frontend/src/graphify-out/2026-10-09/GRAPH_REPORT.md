# Graph Report - src  (2026-10-09)

## Corpus Check
- 94 files · ~31,009 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 1 file(s) not represented in the graph (top: .css 1)

## Summary
- 208 nodes · 481 edges · 7 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b2e1cfb5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- data-table.tsx
- traces-view.tsx
- app-sidebar.tsx
- metrics-view.tsx
- service-detail-page.tsx
- services-view.tsx
- traces-components.tsx

## God Nodes (most connected - your core abstractions)
1. `MetricsView()` - 16 edges
2. `DataTable()` - 15 edges
3. `ServiceDetailPage()` - 13 edges
4. `AppRoutes()` - 12 edges
5. `ServicesView()` - 11 edges
6. `LogsView()` - 10 edges
7. `TracesView()` - 10 edges
8. `FeaturePage()` - 10 edges
9. `ViewSkeleton()` - 10 edges
10. `FeaturePanel()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `MetricsView()` --calls--> `TelemetryGrid()`  [EXTRACTED]
  features/metrics/components/metrics-view.tsx → components/shared/telemetry-widget.tsx
- `MetricsView()` --calls--> `ViewSkeleton()`  [EXTRACTED]
  features/metrics/components/metrics-view.tsx → components/shared/view-skeleton.tsx
- `MetricsView()` --calls--> `CardContent`  [EXTRACTED]
  features/metrics/components/metrics-view.tsx → components/ui/card.tsx
- `MetricsView()` --calls--> `CardTitle`  [EXTRACTED]
  features/metrics/components/metrics-view.tsx → components/ui/card.tsx
- `MetricsView()` --calls--> `DataTable()`  [EXTRACTED]
  features/metrics/components/metrics-view.tsx → shared/components/data-table.tsx

## Import Cycles
- None detected.

## Communities (7 total, 0 thin omitted)

### Community 0 - "data-table.tsx"
Cohesion: 0.11
Nodes (10): Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow (+2 more)

### Community 1 - "traces-view.tsx"
Cohesion: 0.15
Nodes (17): FeatureHeader(), QueryError(), LogsView(), LogsViewProps, MetricsView(), ServicesView(), TracesView(), TracesViewProps (+9 more)

### Community 2 - "app-sidebar.tsx"
Cohesion: 0.07
Nodes (13): App(), AppRoutes(), LogsPage, MetricsPage, MonitorsPage, ServiceDetailPage, ServicesPage, TracesPage (+5 more)

### Community 3 - "metrics-view.tsx"
Cohesion: 0.09
Nodes (4): TelemetryGrid(), QueryErrorProps, ViewSkeletonProps, MetricsViewProps

### Community 4 - "service-detail-page.tsx"
Cohesion: 0.09
Nodes (23): badgeColors, DataValue(), MetricCard(), statusLabels, StatusSpanProps, TelemetryStatus, valueColors, TelemetryWidget() (+15 more)

### Community 5 - "services-view.tsx"
Cohesion: 0.12
Nodes (6): FeatureHeaderProps, TimeRangeProps, columns, ServicesViewProps, RefreshProps, TelemetryActionsProps

### Community 6 - "traces-components.tsx"
Cohesion: 0.13
Nodes (3): columns, columns, DataTableColumnHeader()

## Knowledge Gaps
- **23 isolated node(s):** `TableFooter`, `TableCaption`, `MetricsViewProps`, `DataTableProps`, `LogsViewProps` (+18 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 108 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ViewSkeleton()` connect `app-sidebar.tsx` to `traces-view.tsx`, `metrics-view.tsx`, `service-detail-page.tsx`, `services-view.tsx`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **What connects `TableFooter`, `TableCaption`, `MetricsViewProps` to the rest of the system?**
  _23 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `data-table.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10826210826210826 - nodes in this community are weakly interconnected._
- **Why does `DataTable()` connect `data-table.tsx` to `traces-view.tsx`, `metrics-view.tsx`, `services-view.tsx`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Should `app-sidebar.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06794871794871794 - nodes in this community are weakly interconnected._
- **Why does `PageLayout()` connect `app-sidebar.tsx` to `traces-view.tsx`, `service-detail-page.tsx`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Should `metrics-view.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08615384615384615 - nodes in this community are weakly interconnected._