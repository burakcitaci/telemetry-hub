# Graph Report - src  (2026-10-11)

## Corpus Check
- 99 files · ~32,216 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 1 file(s) not represented in the graph (top: .css 1)

## Summary
- 368 nodes · 1040 edges · 11 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6fd27d1f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- data-table.tsx
- metrics-view.tsx
- app.tsx
- shared/trace-detail-sheet.tsx
- service-detail-page.tsx
- monitors-components.tsx
- use-traces.tsx
- use-metrics.tsx
- traces-components.tsx
- telemetry.ts
- timer-range.picker.tsx

## God Nodes (most connected - your core abstractions)
1. `MetricsView()` - 19 edges
2. `ServiceDetailPage()` - 17 edges
3. `DataTable()` - 15 edges
4. `AppFilterSidebar()` - 14 edges
5. `ServicesView()` - 13 edges
6. `MonitorDetail()` - 12 edges
7. `TracesView()` - 12 edges
8. `FeaturePage()` - 12 edges
9. `FeaturePanel()` - 12 edges
10. `AppRoutes()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `MetricsView()` --calls--> `ViewSkeleton()`  [EXTRACTED]
  features/metrics/components/metrics-view.tsx → components/shared/view-skeleton.tsx
- `MetricsView()` --calls--> `CardContent`  [EXTRACTED]
  features/metrics/components/metrics-view.tsx → components/ui/card.tsx
- `MetricsView()` --calls--> `CardTitle`  [EXTRACTED]
  features/metrics/components/metrics-view.tsx → components/ui/card.tsx
- `MetricsView()` --calls--> `DataTable()`  [EXTRACTED]
  features/metrics/components/metrics-view.tsx → shared/components/data-table.tsx
- `MetricsView()` --calls--> `FacetQueryBar()`  [EXTRACTED]
  features/metrics/components/metrics-view.tsx → shared/components/facet-query-bar.tsx

## Import Cycles
- None detected.

## Communities (11 total, 0 thin omitted)

### Community 0 - "data-table.tsx"
Cohesion: 0.12
Nodes (10): Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow (+2 more)

### Community 1 - "metrics-view.tsx"
Cohesion: 0.11
Nodes (35): AppFacetOption, AppFilterSidebar(), ServiceSelector(), FeatureHeader(), FeatureHeaderProps, TimeRangeProps, TelemetryGrid(), QueryError() (+27 more)

### Community 2 - "app.tsx"
Cohesion: 0.07
Nodes (13): App(), AppRoutes(), LogsPage, MetricsPage, MonitorsPage, ServiceDetailPage, ServicesPage, TracesPage (+5 more)

### Community 3 - "shared/trace-detail-sheet.tsx"
Cohesion: 0.12
Nodes (15): StatusBadge(), TraceDetailSheet(), TraceDetailSheetProps, LogDetailSheet(), LogDetailSheetProps, AttributeSection(), AttributeSectionProps, CopyButton() (+7 more)

### Community 4 - "service-detail-page.tsx"
Cohesion: 0.11
Nodes (23): TimeRangePicker(), badgeColors, DataValue(), MetricCard(), statusLabels, StatusSpanProps, TelemetryStatus, valueColors (+15 more)

### Community 5 - "monitors-components.tsx"
Cohesion: 0.10
Nodes (10): StatusBadge(), MonitorDetail(), MonitorGraph(), MonitorRow(), MutedBadge(), StatusBadge(), StatusDot(), TargetIcon() (+2 more)

### Community 6 - "use-traces.tsx"
Cohesion: 0.07
Nodes (17): AppFilterSidebarProps, FacetOption, getLogs(), LogsQueryParams, useLogs(), getServiceMetrics(), getServices(), SummaryState (+9 more)

### Community 7 - "use-metrics.tsx"
Cohesion: 0.14
Nodes (21): useMetrics(), API_BASE, ApiMetric, colorFor(), DEFAULT_LIMIT, FACET_DEFS, formatBytes(), formatTime() (+13 more)

### Community 8 - "traces-components.tsx"
Cohesion: 0.12
Nodes (11): FacetSelector(), Badge(), badgeVariants, SeverityBadge(), columns, LogTraceLink(), severityBadge(), columns (+3 more)

### Community 9 - "telemetry.ts"
Cohesion: 0.16
Nodes (12): getTraces(), normalizeTrace(), useTraces(), TelemetryViewParamsOptions, uniqueValues(), useTelemetryViewParams(), DEFAULT_TELEMETRY_RANGE, getTelemetryTimestampMs() (+4 more)

### Community 10 - "timer-range.picker.tsx"
Cohesion: 0.15
Nodes (5): TimeRangePickerProps, FacetPill(), FacetQueryBar(), FacetQueryBarProps, Suggestion

## Knowledge Gaps
- **42 isolated node(s):** `navItems`, `TimeRangePickerProps`, `TelemetryStatus`, `valueColors`, `badgeColors` (+37 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 116 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ViewSkeleton()` connect `service-detail-page.tsx` to `metrics-view.tsx`, `app.tsx`, `shared/trace-detail-sheet.tsx`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **What connects `navItems`, `TimeRangePickerProps`, `TelemetryStatus` to the rest of the system?**
  _42 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `data-table.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.1164021164021164 - nodes in this community are weakly interconnected._
- **Why does `Badge()` connect `traces-components.tsx` to `metrics-view.tsx`, `shared/trace-detail-sheet.tsx`, `service-detail-page.tsx`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Should `metrics-view.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10813492063492064 - nodes in this community are weakly interconnected._
- **Why does `DataTable()` connect `data-table.tsx` to `metrics-view.tsx`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **Should `app.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07435897435897436 - nodes in this community are weakly interconnected._