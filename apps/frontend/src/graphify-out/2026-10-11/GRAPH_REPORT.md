# Graph Report - src  (2026-10-11)

## Corpus Check
- 106 files · ~35,091 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 1 file(s) not represented in the graph (top: .css 1)

## Summary
- 445 nodes · 1346 edges · 10 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `85641e5b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- data-table.tsx
- metrics-view.tsx
- app.tsx
- shared/trace-detail-sheet.tsx
- service-detail-page.tsx
- monitors-components.tsx
- ref_react
- use-metrics.tsx
- traces-components.tsx
- admin-page.tsx

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
- `MetricsView()` --calls--> `DataTable()`  [EXTRACTED]
  features/metrics/components/metrics-view.tsx → shared/components/data-table.tsx
- `ServicesView()` --calls--> `DataTable()`  [EXTRACTED]
  features/services/components/services-view.tsx → shared/components/data-table.tsx
- `TracesView()` --calls--> `DataTable()`  [EXTRACTED]
  features/traces/components/traces-view.tsx → shared/components/data-table.tsx

## Import Cycles
- None detected.

## Communities (10 total, 0 thin omitted)

### Community 0 - "data-table.tsx"
Cohesion: 0.10
Nodes (11): Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow (+3 more)

### Community 1 - "metrics-view.tsx"
Cohesion: 0.11
Nodes (36): AppFacetOption, AppFilterSidebar(), FacetSelector(), FeatureHeader(), FeatureHeaderProps, TimeRangeProps, TelemetryGrid(), QueryError() (+28 more)

### Community 2 - "app.tsx"
Cohesion: 0.06
Nodes (35): AdminPage, App(), AppRoutes(), AuthenticatedRoutes(), EntryRedirect(), LoginPage, LogsPage, MetricsPage (+27 more)

### Community 3 - "shared/trace-detail-sheet.tsx"
Cohesion: 0.08
Nodes (26): StatusBadge(), TraceDetailSheet(), TraceDetailSheetProps, LogDetailSheet(), LogDetailSheetProps, SeverityBadge(), useTraces(), AttributeSection() (+18 more)

### Community 4 - "service-detail-page.tsx"
Cohesion: 0.13
Nodes (20): TimeRangePicker(), PageLayout(), badgeColors, DataValue(), MetricCard(), StatusBadge(), statusLabels, StatusSpanProps (+12 more)

### Community 5 - "monitors-components.tsx"
Cohesion: 0.06
Nodes (55): Card, CardContent, CardFooter, CardHeader, CardTitle, MonitorDetail(), MonitorForm(), MonitorGraph() (+47 more)

### Community 6 - "ref_react"
Cohesion: 0.06
Nodes (28): FacetOption, getLogs(), LogsQueryParams, useLogs(), getMetricDetail(), getMetrics(), getMetricStatistics(), MetricDetailRecord (+20 more)

### Community 7 - "use-metrics.tsx"
Cohesion: 0.10
Nodes (24): useMetrics(), API_BASE, ApiMetric, colorFor(), DEFAULT_LIMIT, FACET_DEFS, formatBytes(), formatTime() (+16 more)

### Community 8 - "traces-components.tsx"
Cohesion: 0.14
Nodes (12): Badge(), BadgeProps, badgeVariants, columns, LogTraceLink(), severityBadge(), columns, ServiceDetailLink() (+4 more)

### Community 9 - "admin-page.tsx"
Cohesion: 0.15
Nodes (6): TimeRangePickerProps, AdminPage(), errorMessage(), Team, User, UserRole

## Knowledge Gaps
- **67 isolated node(s):** `AppFacetOption`, `Options`, `Props`, `DataTableProps`, `FeatureHeaderProps` (+62 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 124 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `unwrap()` connect `ref_react` to `data-table.tsx`, `app.tsx`, `service-detail-page.tsx`, `monitors-components.tsx`, `admin-page.tsx`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **What connects `AppFacetOption`, `Options`, `Props` to the rest of the system?**
  _67 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `data-table.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0957983193277311 - nodes in this community are weakly interconnected._
- **Why does `useAuth()` connect `app.tsx` to `service-detail-page.tsx`, `monitors-components.tsx`, `ref_react`, `traces-components.tsx`, `admin-page.tsx`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Should `metrics-view.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._
- **Why does `api` connect `ref_react` to `data-table.tsx`, `app.tsx`, `monitors-components.tsx`, `use-metrics.tsx`, `admin-page.tsx`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Should `app.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.058823529411764705 - nodes in this community are weakly interconnected._