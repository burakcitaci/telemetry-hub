# Graph Report - src  (2026-10-11)

## Corpus Check
- 105 files · ~34,617 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 1 file(s) not represented in the graph (top: .css 1)

## Summary
- 440 nodes · 1291 edges · 9 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `df4e747a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- data-table.tsx
- metrics-view.tsx
- app.tsx
- shared/trace-detail-sheet.tsx
- monitors-components.tsx
- monitors/model.ts
- use-traces.tsx
- use-metrics.tsx
- telemetry.ts

## God Nodes (most connected - your core abstractions)
1. `unwrap()` - 21 edges
2. `useAuth()` - 19 edges
3. `MetricsView()` - 19 edges
4. `MonitorsView()` - 18 edges
5. `AuthenticatedRoutes()` - 17 edges
6. `ServiceDetailPage()` - 17 edges
7. `MonitorDetail()` - 15 edges
8. `DataTable()` - 15 edges
9. `AppFilterSidebar()` - 14 edges
10. `ViewSkeleton()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `AppFilterSidebar()` --calls--> `UnifiedFilterSidebar()`  [EXTRACTED]
  components/shared/app-filter-sidebar.tsx → shared/components/unified-filter-sidebar.tsx
- `AuthProvider()` --calls--> `unwrap()`  [EXTRACTED]
  features/auth/auth-context.tsx → shared/api/client.ts
- `UnifiedFilterSidebar()` --calls--> `useAuth()`  [EXTRACTED]
  shared/components/unified-filter-sidebar.tsx → features/auth/auth-context.tsx
- `LoginPage()` --calls--> `MetricCard()`  [EXTRACTED]
  features/auth/login-page.tsx → components/shared/telemetry-primitives.tsx
- `getMetrics()` --calls--> `unwrap()`  [EXTRACTED]
  features/metrics/api.ts → shared/api/client.ts

## Import Cycles
- None detected.

## Communities (9 total, 0 thin omitted)

### Community 0 - "data-table.tsx"
Cohesion: 0.09
Nodes (17): AppFilterSidebarProps, Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader (+9 more)

### Community 1 - "metrics-view.tsx"
Cohesion: 0.11
Nodes (38): TimeRangePicker(), AppFacetOption, AppFilterSidebar(), FacetSelector(), ServiceSelector(), FeatureHeader(), FeatureHeaderProps, TimeRangeProps (+30 more)

### Community 2 - "app.tsx"
Cohesion: 0.07
Nodes (24): AdminPage, App(), AppRoutes(), AuthenticatedRoutes(), EntryRedirect(), LoginPage, LogsPage, MetricsPage (+16 more)

### Community 3 - "shared/trace-detail-sheet.tsx"
Cohesion: 0.06
Nodes (28): StatusBadge(), TraceDetailSheet(), TraceDetailSheetProps, Badge(), BadgeProps, badgeVariants, LogDetailSheet(), LogDetailSheetProps (+20 more)

### Community 4 - "monitors-components.tsx"
Cohesion: 0.10
Nodes (31): badgeColors, DataValue(), MetricCard(), StatusBadge(), statusLabels, StatusSpanProps, TelemetryStatus, valueColors (+23 more)

### Community 5 - "monitors/model.ts"
Cohesion: 0.07
Nodes (37): useMonitors(), Aggregation, API_BASE, Comparator, COMPARATOR_TOKENS, DATADOG_MONITORS, DatadogMonitor, DatadogMonitorCreator (+29 more)

### Community 6 - "use-traces.tsx"
Cohesion: 0.05
Nodes (38): FacetOption, AdminPage(), errorMessage(), Team, User, AuthContext, AuthContextValue, AuthSession (+30 more)

### Community 7 - "use-metrics.tsx"
Cohesion: 0.14
Nodes (21): useMetrics(), API_BASE, ApiMetric, colorFor(), DEFAULT_LIMIT, FACET_DEFS, formatBytes(), formatTime() (+13 more)

### Community 9 - "telemetry.ts"
Cohesion: 0.09
Nodes (15): TimeRangePickerProps, useTraces(), FacetPill(), FacetQueryBar(), FacetQueryBarProps, Suggestion, TelemetryViewParamsOptions, uniqueValues() (+7 more)

## Knowledge Gaps
- **65 isolated node(s):** `navItems`, `AppFacetOption`, `Team`, `AuthSession`, `LoginCredentials` (+60 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 125 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `unwrap()` connect `use-traces.tsx` to `data-table.tsx`, `app.tsx`, `monitors/model.ts`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **What connects `navItems`, `AppFacetOption`, `Team` to the rest of the system?**
  _65 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `data-table.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09041835357624832 - nodes in this community are weakly interconnected._
- **Why does `useAuth()` connect `app.tsx` to `data-table.tsx`, `shared/trace-detail-sheet.tsx`, `monitors-components.tsx`, `use-traces.tsx`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Should `metrics-view.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.11011904761904762 - nodes in this community are weakly interconnected._
- **Why does `api` connect `use-traces.tsx` to `data-table.tsx`, `monitors/model.ts`, `use-metrics.tsx`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Should `app.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07013574660633484 - nodes in this community are weakly interconnected._