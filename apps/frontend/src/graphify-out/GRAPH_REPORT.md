# Graph Report - src  (2026-10-11)

## Corpus Check
- 108 files · ~34,810 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 1 file(s) not represented in the graph (top: .css 1)

## Summary
- 450 nodes · 1355 edges · 9 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `fb0c49f4`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- data-table.tsx
- metrics-view.tsx
- app.tsx
- shared/trace-detail-sheet.tsx
- service-detail-page.tsx
- monitors-components.tsx
- unwrap
- use-metrics.tsx
- use-filter-options.ts

## God Nodes (most connected - your core abstractions)
1. `unwrap()` - 25 edges
2. `useAuth()` - 21 edges
3. `MetricsView()` - 19 edges
4. `ServiceDetailPage()` - 19 edges
5. `MonitorsView()` - 18 edges
6. `AuthenticatedRoutes()` - 17 edges
7. `DataTable()` - 15 edges
8. `MonitorDetail()` - 15 edges
9. `ViewSkeleton()` - 14 edges
10. `api` - 14 edges

## Surprising Connections (you probably didn't know these)
- `AppFilterSidebar()` --calls--> `UnifiedFilterSidebar()`  [EXTRACTED]
  components/shared/app-filter-sidebar.tsx → shared/components/unified-filter-sidebar.tsx
- `LogsView()` --calls--> `DataTable()`  [EXTRACTED]
  features/logs/components/logs-view.tsx → shared/components/data-table.tsx
- `TracesView()` --calls--> `DataTable()`  [EXTRACTED]
  features/traces/components/traces-view.tsx → shared/components/data-table.tsx
- `TracesView()` --calls--> `useActiveTrace()`  [EXTRACTED]
  features/traces/components/traces-view.tsx → shared/hooks/use-active-trace.tsx
- `MetricsView()` --calls--> `DataTable()`  [EXTRACTED]
  features/metrics/components/metrics-view.tsx → shared/components/data-table.tsx

## Import Cycles
- None detected.

## Communities (9 total, 0 thin omitted)

### Community 0 - "data-table.tsx"
Cohesion: 0.10
Nodes (11): Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow (+3 more)

### Community 1 - "metrics-view.tsx"
Cohesion: 0.11
Nodes (40): TimeRangePicker(), AppFacetOption, AppFilterSidebar(), AppFilterSidebarProps, FeatureHeader(), FeatureHeaderProps, TimeRangeProps, TelemetryGrid() (+32 more)

### Community 2 - "app.tsx"
Cohesion: 0.06
Nodes (33): AdminPage, App(), AppRoutes(), AuthenticatedRoutes(), EntryRedirect(), LoginPage, LogsPage, MetricsPage (+25 more)

### Community 3 - "shared/trace-detail-sheet.tsx"
Cohesion: 0.07
Nodes (28): StatusBadge(), TraceDetailSheet(), TraceDetailSheetProps, Badge(), BadgeProps, badgeVariants, LogDetailSheet(), LogDetailSheetProps (+20 more)

### Community 4 - "service-detail-page.tsx"
Cohesion: 0.13
Nodes (18): PageLayout(), badgeColors, DataValue(), MetricCard(), StatusBadge(), statusLabels, StatusSpanProps, TelemetryStatus (+10 more)

### Community 5 - "monitors-components.tsx"
Cohesion: 0.06
Nodes (55): Card, CardContent, CardFooter, CardHeader, CardTitle, MonitorDetail(), MonitorForm(), MonitorGraph() (+47 more)

### Community 6 - "unwrap"
Cohesion: 0.06
Nodes (34): FacetOption, AdminPage(), errorMessage(), Team, User, UserRole, getLogs(), LogsQueryParams (+26 more)

### Community 7 - "use-metrics.tsx"
Cohesion: 0.08
Nodes (26): TimeRangePickerProps, useMetrics(), API_BASE, ApiMetric, colorFor(), DEFAULT_LIMIT, FACET_DEFS, formatBytes() (+18 more)

### Community 8 - "use-filter-options.ts"
Cohesion: 0.20
Nodes (12): FilterOptions, FilterOptionsQuery, FilterOptionsSource, getFilterOptions(), EMPTY_OPTIONS, useFilterOptions(), TelemetryViewParamsOptions, uniqueValues() (+4 more)

## Knowledge Gaps
- **68 isolated node(s):** `AppFacetOption`, `LogsViewProps`, `TracesViewProps`, `FilterOptionsQuery`, `EMPTY_OPTIONS` (+63 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 126 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `unwrap()` connect `unwrap` to `data-table.tsx`, `app.tsx`, `service-detail-page.tsx`, `monitors-components.tsx`, `use-filter-options.ts`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **What connects `AppFacetOption`, `LogsViewProps`, `TracesViewProps` to the rest of the system?**
  _68 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `data-table.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09982174688057041 - nodes in this community are weakly interconnected._
- **Why does `useAuth()` connect `app.tsx` to `service-detail-page.tsx`, `monitors-components.tsx`, `unwrap`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Should `metrics-view.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10538218000904569 - nodes in this community are weakly interconnected._
- **Why does `api` connect `unwrap` to `data-table.tsx`, `app.tsx`, `service-detail-page.tsx`, `monitors-components.tsx`, `use-metrics.tsx`, `use-filter-options.ts`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Should `app.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.056314699792960665 - nodes in this community are weakly interconnected._