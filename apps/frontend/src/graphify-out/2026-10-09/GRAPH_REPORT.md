# Graph Report - src  (2026-10-09)

## Corpus Check
- 94 files · ~31,254 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 1 file(s) not represented in the graph (top: .css 1)

## Summary
- 224 nodes · 510 edges · 8 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3d021db3`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- data-table.tsx
- traces-view.tsx
- app-sidebar.tsx
- metrics-view.tsx
- service-detail-page.tsx
- feature-layout.tsx
- traces-components.tsx
- facet-query-bar.tsx

## God Nodes (most connected - your core abstractions)
1. `MetricsView()` - 16 edges
2. `DataTable()` - 15 edges
3. `ServiceDetailPage()` - 13 edges
4. `AppRoutes()` - 12 edges
5. `ServicesView()` - 11 edges
6. `LogsView()` - 10 edges
7. `TracesView()` - 10 edges
8. `FeaturePage()` - 10 edges
9. `FeaturePanel()` - 10 edges
10. `ViewSkeleton()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `LogsView()` --calls--> `DataTable()`  [EXTRACTED]
  features/logs/components/logs-view.tsx → shared/components/data-table.tsx
- `MetricsView()` --calls--> `DataTable()`  [EXTRACTED]
  features/metrics/components/metrics-view.tsx → shared/components/data-table.tsx
- `ServicesView()` --calls--> `DataTable()`  [EXTRACTED]
  features/services/components/services-view.tsx → shared/components/data-table.tsx
- `TracesView()` --calls--> `DataTable()`  [EXTRACTED]
  features/traces/components/traces-view.tsx → shared/components/data-table.tsx
- `LogsView()` --calls--> `FeatureHeader()`  [EXTRACTED]
  features/logs/components/logs-view.tsx → components/shared/feature-header.tsx

## Import Cycles
- None detected.

## Communities (8 total, 0 thin omitted)

### Community 0 - "data-table.tsx"
Cohesion: 0.11
Nodes (10): Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow (+2 more)

### Community 1 - "traces-view.tsx"
Cohesion: 0.10
Nodes (18): QueryError(), LogsView(), LogsViewProps, columns, ServicesView(), ServicesViewProps, TracesView(), TracesViewProps (+10 more)

### Community 2 - "app-sidebar.tsx"
Cohesion: 0.07
Nodes (13): App(), AppRoutes(), LogsPage, MetricsPage, MonitorsPage, ServiceDetailPage, ServicesPage, TracesPage (+5 more)

### Community 3 - "metrics-view.tsx"
Cohesion: 0.11
Nodes (8): FeatureHeader(), FeatureHeaderProps, TimeRangeProps, TelemetryGrid(), MetricsView(), MetricsViewProps, FeatureSearch(), FeatureSidebar()

### Community 4 - "service-detail-page.tsx"
Cohesion: 0.13
Nodes (11): DataValue(), Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, MetadataField() (+3 more)

### Community 5 - "feature-layout.tsx"
Cohesion: 0.12
Nodes (13): badgeColors, MetricCard(), statusLabels, StatusSpanProps, TelemetryStatus, valueColors, TelemetryWidget(), QueryErrorProps (+5 more)

### Community 6 - "traces-components.tsx"
Cohesion: 0.10
Nodes (11): columns, columns, DataTableColumnHeader(), DEFAULT_TELEMETRY_RANGE, formatDuration(), formatTelemetryTimestamp(), getTelemetryTimestampMs(), isWithinTimeRange() (+3 more)

### Community 7 - "facet-query-bar.tsx"
Cohesion: 0.20
Nodes (4): FacetPill(), FacetQueryBar(), FacetQueryBarProps, Suggestion

## Knowledge Gaps
- **26 isolated node(s):** `FacetQueryBarProps`, `Suggestion`, `DEFAULT_TELEMETRY_RANGE`, `DataTableProps`, `LogsViewProps` (+21 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 117 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ViewSkeleton()` connect `app-sidebar.tsx` to `traces-view.tsx`, `metrics-view.tsx`, `service-detail-page.tsx`, `feature-layout.tsx`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **What connects `FacetQueryBarProps`, `Suggestion`, `DEFAULT_TELEMETRY_RANGE` to the rest of the system?**
  _26 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `data-table.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10826210826210826 - nodes in this community are weakly interconnected._
- **Why does `DataTable()` connect `data-table.tsx` to `traces-view.tsx`, `metrics-view.tsx`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Should `traces-view.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09619450317124736 - nodes in this community are weakly interconnected._
- **Why does `PageLayout()` connect `app-sidebar.tsx` to `traces-view.tsx`, `service-detail-page.tsx`, `feature-layout.tsx`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Should `app-sidebar.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06794871794871794 - nodes in this community are weakly interconnected._