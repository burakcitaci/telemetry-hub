# UI_REVIEW.md

# 1. Executive summary

TASK-UI-REVIEW-1 · 2026-10-13 · Source baseline: 823c298.

This is a product-experience review, not a code-quality review or implementation plan. Verdict: the app has a coherent compact observability shell, but several controls imply stronger data coverage or operational readiness than the interface can substantiate. At 2am, a falsely reassuring result is worse than an ugly panel.

Evidence boundary: source-based inspection of routed screens, shared controls, drawers, fetch behavior and styling. No screenshots, browser session, assistive-technology session, contrast measurements, viewport renders or interaction-latency measurements were available/performed. Every statement about appearance, clipping, contrast or perceptual polish is **inference from code**; explicit handlers, text, states and request scope are directly inspected. Ratings are provisional product judgments, not measured usability scores. “Within 100ms” cannot be certified here.

Scale: 0 = unusable/misleading, 3 = functional with consequential friction, 5 = strong operator experience. Major-surface scores below use 0–10; detailed axes use 0–5. Non-chart components are still assessed on data presentation, without inventing charts.

| Major surface | Rating / 10 | Operator verdict |
| --- | --- | --- |
| Shell/navigation | 7 | Coherent destinations; filter changes lose investigation context. [app.tsx:47](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/app/app.tsx:47) |
| Metrics | 5 | Useful explorer, unreliable continuity/current-value semantics and dead actions. [metrics-view.tsx:501](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/metrics/components/metrics-view.tsx:501) |
| Logs | 6 | Good evidence drawer and correlation; live reading lacks control. [use-logs.tsx:68](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/logs/hooks/use-logs.tsx:68) |
| Traces/APM | 5 | Credible waterfall, historical search scope is not credible. [use-traces.tsx:57](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/traces/hooks/use-traces.tsx:57) |
| Services catalog | 6 | Good navigation, misleading coverage and inactive time scope. [services-components.tsx:58](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/components/services-components.tsx:58) |
| Service detail | 5 | Understandable KPIs, missing drilldown and ambiguous empty values. [service-detail-page.tsx:48](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/service-detail-page.tsx:48) |
| Monitors | 3 | Configuration UI presented as operational monitoring. [monitors-components.tsx:578](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-components.tsx:578) |
| Infrastructure | 7 | Compact, theme-aware, good stale handling; unknown load looks like zero. [infrastructure-dashboard.tsx:219](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/infrastructure/infrastructure-dashboard.tsx:219) |
| Admin/settings | 5 | Useful confirmed actions; initial loading and recovery are weak. [admin-page.tsx:23](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/admin/admin-page.tsx:23) |
| Login | 6 | Clear form states; forced-dark theme and unexplained organization field. [login-page.tsx:36](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/auth/login-page.tsx:36) |

### Top 3 strengths

- Shared investigation vocabulary: environment/service/host facets, common headers and dense tables give the application a recognizable operating model. Preserve this foundation. [facet-query-bar.tsx:240](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/facet-query-bar.tsx:240)
- Real evidence, not decorative dashboards: trace span nesting, raw payloads, attribute panels and log-to-trace navigation are genuinely useful. [trace-detail-sheet.tsx:166](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/components/shared/trace-detail-sheet.tsx:166), [logs-components.tsx:8](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/logs/components/logs-components.tsx:8)
- Infrastructure is unusually honest about stale snapshots and unsupported Disk/Network measurements, and now respects the selected theme. [infrastructure-dashboard.tsx:40](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/infrastructure/infrastructure-dashboard.tsx:40), [infrastructure-dashboard.tsx:216](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/infrastructure/infrastructure-dashboard.tsx:216), [infrastructure.css:8](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/infrastructure/infrastructure.css:8)

### Top 5 issues, ranked by operator impact

1. Monitors imply healthy, notifying operation without evaluation data. The small detail disclosure contradicts the primary interface. [monitors-components.tsx:578](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-components.tsx:578)
2. Trace historical selection filters a bounded recent batch, so “no traces” can be a false investigative conclusion. [use-traces.tsx:57](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/traces/hooks/use-traces.tsx:57), [use-traces.tsx:128](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/traces/hooks/use-traces.tsx:128)
3. Unknown infrastructure CPU/RAM appears as 0%; the operator cannot distinguish idle from unobserved. [infrastructure-dashboard.tsx:219](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/infrastructure/infrastructure-dashboard.tsx:219)
4. Metrics visually bridges missing observations, presenting continuity that was not measured. [metrics-view.tsx:501](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/metrics/components/metrics-view.tsx:501)
5. Core log, trace and monitor detail flows are pointer-only at the row level. Keyboard users cannot complete the same investigation. [data-table.tsx:199](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/data-table.tsx:199), [monitors-components.tsx:370](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-components.tsx:370)

### Scope and absent surfaces

Actual routing is Services, service detail, Metrics, Logs, Traces, Monitors, Admin and Infrastructure, plus Login. [app.tsx:61](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/app/app.tsx:61)

A widget dashboard builder/grid with resize/drag, an incident-management screen, service topology map, container/Pod explorer, global command palette and toast/notification center were not found in the routed app or its UI call sites. They are absent, not “broken”; skip rating them. The InfrastructureDashboard is the host map, not a general widget builder. There is no standalone personal-settings page: review Admin, theme toggle and service metadata instead. [app.tsx:61](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/app/app.tsx:61), [infrastructure-page.tsx:17](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/infrastructure/infrastructure-page.tsx:17)

The shell has a tenant/role strip and logout, not a full account menu; no general breadcrumb trail is rendered. Service detail supplies a back action. Do not invent menu behavior. [global-header.tsx:25](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/app/components/global-header.tsx:25), [service-detail-page.tsx:85](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/service-detail-page.tsx:85)

Review checklist:

- [x] TASK-UI-REVIEW-1.1 — Graphify orientation before source inspection: root graph had 1,652 nodes, 4,323 edges, 81 communities. Expanded search covered metrics/logs/traces/monitors/services/infrastructure/sidebar/theme/table/filter. Graph query was budget-limited; direct source inspection supplied the actual UX evidence.
- [x] TASK-UI-REVIEW-1.2 — Ten screen groups, twelve real component spot-checks, all eleven axes.
- [x] TASK-UI-REVIEW-1.3 — Loading/empty/error/stale/permission, theme, responsive and keyboard review.
- [x] TASK-UI-REVIEW-1.4 — Source-literal design inventory and ranked product backlog.
- [x] TASK-UI-REVIEW-1.5 — Documentation only; no application, ingestion or health-endpoint changes.

# 2. Screen-by-screen review

All visual judgments below are code-derived inference. Each axis has a concrete finding; a component without a chart is assessed on truthful value/state presentation instead.
## Shell / navigation / account

**Rating:** 3.5/5

**What works:**

- The five core investigation destinations have one persistent navigation model; URLs preserve platform filters ([app-sidebar.tsx:148](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/app/components/app-sidebar.tsx:148)).
- A compact account strip exposes tenant and role without a bulky profile dashboard ([global-header.tsx:25](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/app/components/global-header.tsx:25)).

**What's weak:**

- Changing global filters remounts the page and active-trace provider. Investigation context is disposable rather than stable ([app.tsx:47](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/app/app.tsx:47)).
- Services is not highlighted on a service-detail route because active matching is exact ([app-sidebar.tsx:139](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/app/components/app-sidebar.tsx:139)). **FE-A4 resolved: segment-boundary matching in desktop/mobile. Test: navigation.browser.test.mjs.**
- Unknown routes silently land on Metrics instead of explaining a bad investigation link ([app.tsx:73](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/app/app.tsx:73)). **FE-A5 resolved: explicit global/org Not found; root/auth redirects retained. Test: navigation.browser.test.mjs.**

**Concrete fixes:**

1. M — Preserve the open investigation context while changing compatible global filters ([app.tsx:47](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/app/app.tsx:47)).
2. S — Keep Services highlighted on its detail route ([app-sidebar.tsx:139](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/app/components/app-sidebar.tsx:139)).
3. S — Show an explicit not-found state for invalid links ([app.tsx:73](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/app/app.tsx:73)).

| Axis | Rating / 5 | Concrete finding |
| --- | --- | --- |
| 1. First impression & hierarchy | 4 | Core destinations are clear; admin-only destinations sit separately. [app-sidebar.tsx:120](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/app/components/app-sidebar.tsx:120) |
| 2. Information density & scannability | 4 | Tenant and role remain visible in a short header. [global-header.tsx:25](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/app/components/global-header.tsx:25) |
| 3. Visual system consistency | 3 | Purple brand fill is a raw palette choice rather than a brand token. [app-sidebar.tsx:94](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/app/components/app-sidebar.tsx:94) |
| 4. Component quality | 4 | Sidebar primitives cover expanded, collapsed and mobile presentations. [app-sidebar.tsx:168](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/app/components/app-sidebar.tsx:168) |
| 5. Interaction & feedback | 2 | Global-filter changes reset page and trace selection. [app.tsx:47](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/app/app.tsx:47) |
| 6. Data visualization | 3 | No visualization is needed here; role and tenant are textual, not color-only. [global-header.tsx:25](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/app/components/global-header.tsx:25) |
| 7. State coverage | 2 | Wildcard navigation conceals a 404 rather than designing it. [app.tsx:73](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/app/app.tsx:73) |
| 8. Accessibility | 3 | Mobile links have labels; the collapsed/mobile rail lacks a theme control. [app-sidebar.tsx:202](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/app/components/app-sidebar.tsx:202) |
| 9. Responsiveness | 4 | Dedicated mobile rail is present; desktop collapse has a trigger. [app-sidebar.tsx:187](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/app/components/app-sidebar.tsx:187) |
| 10. Copy & microcopy | 2 | German logout copy sits inside otherwise English navigation. [global-header.tsx:31](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/app/components/global-header.tsx:31) |
| 11. Observability-specific UX | 3 | Filters survive route links, but time controls are screen-local. [app-sidebar.tsx:148](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/app/components/app-sidebar.tsx:148) |


## Metrics explorer

**Rating:** 2.5/5

**What works:**

- Metric catalog, grouping, summary, chart, legend and raw rows form a credible investigation sequence ([metrics-view.tsx:147](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/metrics/components/metrics-view.tsx:147)).
- Chart colors use the theme-aware five-series palette; tooltip values carry units ([model.ts:12](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/metrics/model.ts:12), [metrics-components.tsx:34](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/metrics/components/metrics-components.tsx:34)).

**What's weak:**

- Filter and CSV look operational but have no action handlers. These are false affordances ([metrics-view.tsx:562](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/metrics/components/metrics-view.tsx:562)).
- “Current” is the last value of a flattened collection, not necessarily the newest timestamp across groups ([use-metrics.tsx:302](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/metrics/hooks/use-metrics.tsx:302)).
- Lines connect missing samples, implying observed continuity where there is none ([metrics-view.tsx:501](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/metrics/components/metrics-view.tsx:501)).
- Categorical formatted time labels distribute points by sample order, not elapsed time; irregular samples can misrepresent a spike ([metrics-view.tsx:471](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/metrics/components/metrics-view.tsx:471)).

**Concrete fixes:**

1. S — Remove CSV until an actual export is available ([metrics-view.tsx:565](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/metrics/components/metrics-view.tsx:565)).
2. S — Remove the inert Filter button; existing facets already filter ([metrics-view.tsx:562](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/metrics/components/metrics-view.tsx:562)).
3. M — Define Current as the newest observation with a visible group/aggregation scope ([use-metrics.tsx:302](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/metrics/hooks/use-metrics.tsx:302)).
4. S — Display missing intervals as gaps ([metrics-view.tsx:501](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/metrics/components/metrics-view.tsx:501)).
5. M — Position samples on an elapsed-time axis ([metrics-view.tsx:471](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/metrics/components/metrics-view.tsx:471)).

| Axis | Rating / 5 | Concrete finding |
| --- | --- | --- |
| 1. First impression & hierarchy | 4 | Catalog leads into chart and summary rather than equal-weight cards. [metrics-view.tsx:147](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/metrics/components/metrics-view.tsx:147) |
| 2. Information density & scannability | 3 | Raw rows add evidence, but the hook caps them without a visible truncation explanation. [use-metrics.tsx:315](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/metrics/hooks/use-metrics.tsx:315) |
| 3. Visual system consistency | 4 | Series colors derive from chart tokens. [model.ts:12](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/metrics/model.ts:12) |
| 4. Component quality | 2 | Two toolbar buttons are visibly unfinished. [metrics-view.tsx:562](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/metrics/components/metrics-view.tsx:562) |
| 5. Interaction & feedback | 2 | Auto/Manual lacks interval and last-success context. [metrics-view.tsx:115](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/metrics/components/metrics-view.tsx:115) |
| 6. Data visualization | 1 | Missing samples are joined, and Current can name the wrong observation. [use-metrics.tsx:302](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/metrics/hooks/use-metrics.tsx:302) |
| 7. State coverage | 3 | Errors and empty reasons exist; chart loading is a cards skeleton. [metrics-view.tsx:330](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/metrics/components/metrics-view.tsx:330) |
| 8. Accessibility | 2 | Chart-type and group toggles do not expose pressed state. [metrics-view.tsx:312](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/metrics/components/metrics-view.tsx:312) |
| 9. Responsiveness | 3 | Chart height is fixed at 220px; small-label legibility is an inferred risk. [metrics-view.tsx:330](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/metrics/components/metrics-view.tsx:330) |
| 10. Copy & microcopy | 3 | Summary units help; Auto does not explain the 30-second interval. [use-metrics.tsx:214](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/metrics/hooks/use-metrics.tsx:214) |
| 11. Observability-specific UX | 3 | Server requests include time bounds, but no chart-to-log/trace drilldown is offered. [use-metrics.tsx:184](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/metrics/hooks/use-metrics.tsx:184) |


## Logs / log detail

**Rating:** 3/5

**What works:**

- The empty state distinguishes filtering from ingestion absence ([logs-view.tsx:86](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/logs/components/logs-view.tsx:86)).
- Valid trace IDs have a real, labeled correlation button; the detail drawer exposes message, attributes and raw JSON ([logs-components.tsx:8](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/logs/components/logs-components.tsx:8), [log-detail-sheet.tsx:87](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/logs/components/log-detail-sheet.tsx:87)).

**What's weak:**

- List severity is a rotated empty badge: color carries information that should be readable ([logs-components.tsx:28](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/logs/components/logs-components.tsx:28)).
- The stream refetches on updates without pause/resume, buffer or scroll-lock controls ([use-logs.tsx:68](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/logs/hooks/use-logs.tsx:68)).
- Clicking a log row opens its drawer, but the shared row is not a keyboard action ([data-table.tsx:199](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/data-table.tsx:199)).
- The drawer displays a trace ID as a copy field, not a correlation action; correlation is easier before opening the log ([log-detail-sheet.tsx:112](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/logs/components/log-detail-sheet.tsx:112)).

**Concrete fixes:**

1. S — Render readable severity text in the list ([logs-components.tsx:28](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/logs/components/logs-components.tsx:28)).
2. M — Give live logs an explicit pause/resume control that preserves the reading position ([use-logs.tsx:68](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/logs/hooks/use-logs.tsx:68)).
3. M — Provide a focusable Open log action for each row ([data-table.tsx:199](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/data-table.tsx:199)).
4. S — Add Open trace alongside the drawer's trace ID ([log-detail-sheet.tsx:112](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/logs/components/log-detail-sheet.tsx:112)).

| Axis | Rating / 5 | Concrete finding |
| --- | --- | --- |
| 1. First impression & hierarchy | 4 | Header, filters and log rows form a compact reader. [logs-view.tsx:38](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/logs/components/logs-view.tsx:38) |
| 2. Information density & scannability | 3 | Message truncation saves width but severity is not readable. [logs-components.tsx:28](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/logs/components/logs-components.tsx:28) |
| 3. Visual system consistency | 4 | Drawer uses shared detail fields and JSON treatment. [log-detail-sheet.tsx:87](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/logs/components/log-detail-sheet.tsx:87) |
| 4. Component quality | 3 | Useful detail tabs; row activation excludes keyboard users. [data-table.tsx:199](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/data-table.tsx:199) |
| 5. Interaction & feedback | 2 | Stream refresh is automatic without reading controls. [use-logs.tsx:68](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/logs/hooks/use-logs.tsx:68) |
| 6. Data visualization | 3 | No chart is required; timestamps and correlation are useful but severity encoding is weak. [logs-components.tsx:47](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/logs/components/logs-components.tsx:47) |
| 7. State coverage | 3 | Loading and scoped empties exist; fetch failure clears previous rows. [use-logs.tsx:49](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/logs/hooks/use-logs.tsx:49) |
| 8. Accessibility | 2 | Empty severity badges provide no readable or named severity. [logs-components.tsx:28](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/logs/components/logs-components.tsx:28) |
| 9. Responsiveness | 3 | Drawer width is bounded by viewport; split content remains dense. [log-detail-sheet.tsx:39](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/logs/components/log-detail-sheet.tsx:39) |
| 10. Copy & microcopy | 4 | Empty copy gives ingestion/filter context. [logs-view.tsx:86](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/logs/components/logs-view.tsx:86) |
| 11. Observability-specific UX | 3 | Log-to-trace works in list, not from the active detail context. [log-detail-sheet.tsx:112](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/logs/components/log-detail-sheet.tsx:112) |


## Traces / APM / waterfall

**Rating:** 2.5/5

**What works:**

- Eight meaningful trace columns allow comparison of duration, span count and service participation ([traces-components.tsx:20](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/traces/components/traces-components.tsx:20)).
- The drawer provides nested spans, proportional timing, attributes, raw data and opener-focus restoration ([trace-detail-sheet.tsx:166](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/components/shared/trace-detail-sheet.tsx:166), [trace-detail-sheet.tsx:284](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/components/shared/trace-detail-sheet.tsx:284)).

**What's weak:**

- The time picker filters only the recently fetched bounded trace batch. A historical empty result does not prove there were no traces ([use-traces.tsx:57](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/traces/hooks/use-traces.tsx:57), [use-traces.tsx:128](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/traces/hooks/use-traces.tsx:128)).
- Refreshing first clears the list; live updates can replace an engineer's reading surface with loading content ([use-traces.tsx:55](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/traces/hooks/use-traces.tsx:55)).
- The waterfall has no time ruler, zoom or critical-path guidance; comparing overlapping durations is unnecessarily manual ([trace-detail-sheet.tsx:382](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/components/shared/trace-detail-sheet.tsx:382)).

**Concrete fixes:**

1. M — Make historical search query the selected time interval rather than a recent batch ([use-traces.tsx:57](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/traces/hooks/use-traces.tsx:57)).
2. S — Keep existing trace rows visible during background refresh ([use-traces.tsx:55](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/traces/hooks/use-traces.tsx:55)).
3. M — Add a shared time ruler to the waterfall ([trace-detail-sheet.tsx:382](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/components/shared/trace-detail-sheet.tsx:382)).

| Axis | Rating / 5 | Concrete finding |
| --- | --- | --- |
| 1. First impression & hierarchy | 4 | Duration and status lead into detailed timing evidence. [traces-components.tsx:20](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/traces/components/traces-components.tsx:20) |
| 2. Information density & scannability | 4 | Useful eight-column comparison; operation/ID truncate. [traces-view.tsx:78](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/traces/components/traces-view.tsx:78) |
| 3. Visual system consistency | 3 | Waterfall uses raw blue while errors use a semantic token. [trace-detail-sheet.tsx:264](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/components/shared/trace-detail-sheet.tsx:264) |
| 4. Component quality | 4 | Nested spans and raw/attribute tabs have a clear investigative purpose. [trace-detail-sheet.tsx:363](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/components/shared/trace-detail-sheet.tsx:363) |
| 5. Interaction & feedback | 2 | Background fetch clears the table before data returns. [use-traces.tsx:55](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/traces/hooks/use-traces.tsx:55) |
| 6. Data visualization | 3 | Relative span bars help, but there is no ruler. [trace-detail-sheet.tsx:382](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/components/shared/trace-detail-sheet.tsx:382) |
| 7. State coverage | 2 | No traces stored yet overstates what a historical empty recent-batch result means. [traces-view.tsx:95](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/traces/components/traces-view.tsx:95) |
| 8. Accessibility | 2 | Shared clickable rows lack keyboard activation. [data-table.tsx:199](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/data-table.tsx:199) |
| 9. Responsiveness | 3 | Wide tables scroll; span rows stack below sm. [trace-detail-sheet.tsx:244](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/components/shared/trace-detail-sheet.tsx:244) |
| 10. Copy & microcopy | 3 | Units and status text are clear; empty-state scope is wrong. [traces-view.tsx:95](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/traces/components/traces-view.tsx:95) |
| 11. Observability-specific UX | 1 | The selected historical range is not sent in the trace request. [api.ts:38](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/traces/api.ts:38) |


## Services catalog

**Rating:** 3/5

**What works:**

- Service names are native links with encoded identifiers and preserved search context ([services-components.tsx:78](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/components/services-components.tsx:78)).
- The catalog has explicit loading and retry states ([services-view.tsx:65](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/components/services-view.tsx:65)).

**What's weak:**

- The time picker implies a scoped inventory, but requests use environment only ([use-services.tsx:25](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/hooks/use-services.tsx:25), [api.ts:5](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/api.ts:5)).
- Every row gets the same two Activity glyphs; “Telemetry” looks like coverage evidence but conveys no real per-service coverage ([services-components.tsx:58](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/components/services-components.tsx:58)).
- The Repository cell is an icon without a repository value or destination ([services-components.tsx:51](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/components/services-components.tsx:51)).
- Search is duplicated in sidebar and table; the empty message does not distinguish a search miss ([services-view.tsx:57](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/components/services-view.tsx:57), [services-view.tsx:89](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/components/services-view.tsx:89)).

**Concrete fixes:**

1. S — Label the catalog as environment-wide and remove its inactive time picker ([services-view.tsx:42](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/components/services-view.tsx:42)).
2. S — Hide Telemetry until actual per-service coverage can be displayed ([services-components.tsx:58](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/components/services-components.tsx:58)).
3. S — Replace the empty Repository icon cell with an explicit unavailable value ([services-components.tsx:51](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/components/services-components.tsx:51)).
4. S — Keep one search entry point ([services-view.tsx:57](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/components/services-view.tsx:57)).

| Axis | Rating / 5 | Concrete finding |
| --- | --- | --- |
| 1. First impression & hierarchy | 4 | Service name is a clear navigation destination. [services-view.tsx:78](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/components/services-view.tsx:78) |
| 2. Information density & scannability | 3 | Two search controls consume attention for the same task. [services-view.tsx:57](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/components/services-view.tsx:57) |
| 3. Visual system consistency | 4 | Shared table and filters retain platform styling. [services-view.tsx:78](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/components/services-view.tsx:78) |
| 4. Component quality | 2 | Repository/Telemetry cells look richer than the information they contain. [services-components.tsx:51](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/components/services-components.tsx:51) |
| 5. Interaction & feedback | 3 | Native links work; search-empty copy has no scoped recovery. [services-view.tsx:89](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/components/services-view.tsx:89) |
| 6. Data visualization | 2 | Repeated activity icons are not honest coverage visualization. [services-components.tsx:58](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/components/services-components.tsx:58) |
| 7. State coverage | 4 | Initial skeleton and error retry are explicit. [services-view.tsx:65](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/components/services-view.tsx:65) |
| 8. Accessibility | 4 | Native service links avoid the clickable-row keyboard defect. [services-components.tsx:78](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/components/services-components.tsx:78) |
| 9. Responsiveness | 3 | Table can scroll horizontally; columns do not prioritize operator health. [services-view.tsx:78](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/components/services-view.tsx:78) |
| 10. Copy & microcopy | 2 | Ingestion-empty wording is also used for filtered misses. [services-view.tsx:89](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/components/services-view.tsx:89) |
| 11. Observability-specific UX | 2 | Visible time selection does not affect the inventory request. [use-services.tsx:25](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/hooks/use-services.tsx:25) |


## Service detail / ownership setup

**Rating:** 2.5/5

**What works:**

- Requests, error rate and latency percentiles are understandable service KPIs; the summary request genuinely carries time bounds ([service-detail-page.tsx:135](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/service-detail-page.tsx:135), [use-service-summary.ts:30](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/hooks/use-service-summary.ts:30)).
- Ownership metadata and repository destination sit next to telemetry rather than on a separate settings island ([service-detail-page.tsx:282](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/service-detail-page.tsx:282)).

**What's weak:**

- The percentile bar chart is called “distribution”; three percentiles are not a distribution and cannot locate a spike in time ([service-detail-page.tsx:196](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/service-detail-page.tsx:196)).
- There is no visible same-service link to traces/logs next to the KPI evidence ([service-detail-page.tsx:135](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/service-detail-page.tsx:135)).
- A literal “12” is printed next to the service heading ([service-detail-page.tsx:92](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/service-detail-page.tsx:92)).
- Missing summary values become zero; when metrics itself is absent the body has no explicit empty state ([service-detail-page.tsx:48](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/service-detail-page.tsx:48), [service-detail-page.tsx:362](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/service-detail-page.tsx:362)).
- The chart tooltip customizes border/font but not foreground/background; dark-theme parity is uncertain without rendering ([service-detail-page.tsx:225](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/service-detail-page.tsx:225); inference).

**Concrete fixes:**

1. S — Name the chart Latency percentiles ([service-detail-page.tsx:196](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/service-detail-page.tsx:196)).
2. M — Offer same-service, same-range trace drilldown from latency ([service-detail-page.tsx:135](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/service-detail-page.tsx:135)).
3. S — Remove the stray 12 ([service-detail-page.tsx:92](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/service-detail-page.tsx:92)).
4. S — Show a designed no-summary state instead of a blank body ([service-detail-page.tsx:362](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/service-detail-page.tsx:362)).
5. S — Theme the tooltip background and foreground explicitly ([service-detail-page.tsx:225](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/service-detail-page.tsx:225)).

| Axis | Rating / 5 | Concrete finding |
| --- | --- | --- |
| 1. First impression & hierarchy | 4 | Four top-level KPIs group service health clearly. [service-detail-page.tsx:135](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/service-detail-page.tsx:135) |
| 2. Information density & scannability | 3 | Percentiles repeat in cards, bars and summary labels. [service-detail-page.tsx:260](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/service-detail-page.tsx:260) |
| 3. Visual system consistency | 2 | Tooltip styling does not establish dark/light parity. [service-detail-page.tsx:225](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/service-detail-page.tsx:225) |
| 4. Component quality | 3 | Ownership setup is useful; fields lack programmatic label associations. [service-metadata-sheet.tsx:165](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/components/service-metadata-sheet.tsx:165) |
| 5. Interaction & feedback | 3 | Metadata save shows Saving; refresh icon lacks a label. [service-metadata-sheet.tsx:226](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/components/service-metadata-sheet.tsx:226) |
| 6. Data visualization | 2 | A percentile comparison is mislabeled as a distribution. [service-detail-page.tsx:196](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/service-detail-page.tsx:196) |
| 7. State coverage | 2 | Missing metrics can leave blank content. [service-detail-page.tsx:362](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/service-detail-page.tsx:362) |
| 8. Accessibility | 2 | Back and refresh icon links/buttons lack explicit accessible names. [service-detail-page.tsx:85](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/service-detail-page.tsx:85) |
| 9. Responsiveness | 2 | Non-wrapping header plus fixed environment width creates narrow-width pressure (inference). [service-detail-page.tsx:83](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/service-detail-page.tsx:83) |
| 10. Copy & microcopy | 2 | Stray 12 is visible nonsense beside the service title. [service-detail-page.tsx:92](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/service-detail-page.tsx:92) |
| 11. Observability-specific UX | 2 | Time bounds work, but latency evidence has no trace drilldown. [use-service-summary.ts:30](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/hooks/use-service-summary.ts:30) |


## Monitors / detail / create / edit

**Rating:** 1.5/5

**What works:**

- List, detail and authoring form have a coherent scope; New monitor is easy to find ([monitors-view.tsx:130](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-view.tsx:130)).
- Delete is confirmed, pending saves are guarded, and form fields are disabled while saving ([use-monitors.tsx:147](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/hooks/use-monitors.tsx:147), [monitors-components.tsx:693](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-components.tsx:693)).

**What's weak:**

- The page presents OK/alert health and promises notification, but events/series are empty and the detail admits evaluation is not wired. This is configuration management wearing an operational-monitoring costume ([use-monitors.tsx:85](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/hooks/use-monitors.tsx:85), [monitors-components.tsx:578](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-components.tsx:578), [monitors-view.tsx:263](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-view.tsx:263)).
- The period picker is local display state; monitor fetching does not use it ([use-monitors.tsx:34](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/hooks/use-monitors.tsx:34), [use-monitors.tsx:67](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/hooks/use-monitors.tsx:67)).
- Query text and separate comparator/threshold/window controls create two apparent sources of truth; no query preview establishes the actual rule ([monitors-components.tsx:779](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-components.tsx:779), [monitors-components.tsx:866](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-components.tsx:866)).
- Monitor rows are clickable divs without keyboard activation ([monitors-components.tsx:370](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-components.tsx:370)).
- Closing the authoring sheet discards draft edits without a dirty-state warning ([monitors-view.tsx:300](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-view.tsx:300)).

**Concrete fixes:**

1. S — Present monitors as configuration-only/unavailable until evaluation evidence exists; remove the healthy/notifying implication ([monitors-components.tsx:578](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-components.tsx:578)).
2. S — Remove the inactive time-range control ([use-monitors.tsx:34](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/hooks/use-monitors.tsx:34)).
3. M — Show one readable rule preview generated from authoring inputs ([monitors-components.tsx:779](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-components.tsx:779)).
4. S — Add a focusable Open monitor action ([monitors-components.tsx:370](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-components.tsx:370)).
5. M — Confirm dismissal only when the draft has unsaved changes ([monitors-view.tsx:300](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-view.tsx:300)).

| Axis | Rating / 5 | Concrete finding |
| --- | --- | --- |
| 1. First impression & hierarchy | 3 | New monitor is obvious, but operational status dominates an unevaluated config list. [monitors-view.tsx:130](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-view.tsx:130) |
| 2. Information density & scannability | 3 | Rows are compact; status/type/global facets create several filter scopes. [monitors-view.tsx:175](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-view.tsx:175) |
| 3. Visual system consistency | 2 | StatusDot renders an empty uncolored span. [monitors-components.tsx:51](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-components.tsx:51) |
| 4. Component quality | 2 | Rich-looking graphs are empty because no series are supplied. [use-monitors.tsx:85](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/hooks/use-monitors.tsx:85) |
| 5. Interaction & feedback | 2 | Pending disables Save without changing its wording; row actions have no local pending feedback. [monitors-components.tsx:717](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-components.tsx:717) |
| 6. Data visualization | 1 | No data graphs and no state changes mask unavailable evaluation. [monitors-components.tsx:578](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-components.tsx:578) |
| 7. State coverage | 1 | Healthy status and notification promise lack operational evidence. [monitors-view.tsx:263](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-view.tsx:263) |
| 8. Accessibility | 1 | Clickable div rows and unassociated form labels block core paths. [monitors-components.tsx:370](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-components.tsx:370) |
| 9. Responsiveness | 3 | Container breakpoints hide secondary row content on narrow panels. [monitors-components.tsx:395](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-components.tsx:395) |
| 10. Copy & microcopy | 1 | Start getting notified promises more than this surface currently supports. [monitors-view.tsx:263](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-view.tsx:263) |
| 11. Observability-specific UX | 1 | Time picker does not affect the request; query semantics are not previewed. [use-monitors.tsx:67](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/hooks/use-monitors.tsx:67) |


## Infrastructure / host map

**Rating:** 3.5/5

**What works:**

- Counts, dense host blocks and selected-host bars suit a compact operator view ([infrastructure-dashboard.tsx:106](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/infrastructure/infrastructure-dashboard.tsx:106)).
- Host tiles are real buttons with pressed state, accessible status names and warning/critical symbols ([infrastructure-dashboard.tsx:166](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/infrastructure/infrastructure-dashboard.tsx:166)).
- The current version uses theme background/card/foreground tokens. The earlier forced-dark regression is NOT present ([infrastructure.css:8](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/infrastructure/infrastructure.css:8)).
- Stale snapshots remain visible with an alert; Disk and Network are explicitly unavailable, not invented ([infrastructure-dashboard.tsx:40](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/infrastructure/infrastructure-dashboard.tsx:40), [infrastructure-dashboard.tsx:216](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/infrastructure/infrastructure-dashboard.tsx:216)).

**What's weak:**

- CPU/RAM zero can mean unavailable metrics, yet appears as a valid low-load reading; the small footnote cannot repair this primary-number ambiguity ([infrastructure-dashboard.tsx:219](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/infrastructure/infrastructure-dashboard.tsx:219)).
- There is no host search, status filtering or grouping above the anonymous blocks ([infrastructure-dashboard.tsx:128](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/infrastructure/infrastructure-dashboard.tsx:128)).
- Updated at is the frontend fetch time, not the Kubernetes sample timestamp ([use-infrastructure.ts:61](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/infrastructure/use-infrastructure.ts:61)).

**Concrete fixes:**

1. M — Expose metric availability and render unknown CPU/RAM as unavailable, not 0% ([infrastructure-dashboard.tsx:219](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/infrastructure/infrastructure-dashboard.tsx:219)).
2. M — Add a hostname search that highlights and selects matching blocks ([infrastructure-dashboard.tsx:128](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/infrastructure/infrastructure-dashboard.tsx:128)).
3. S — Label the time as Last fetched so it does not imply sample freshness ([use-infrastructure.ts:61](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/infrastructure/use-infrastructure.ts:61)).

| Axis | Rating / 5 | Concrete finding |
| --- | --- | --- |
| 1. First impression & hierarchy | 4 | Status counts lead, selected-host evidence follows. [infrastructure-dashboard.tsx:106](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/infrastructure/infrastructure-dashboard.tsx:106) |
| 2. Information density & scannability | 4 | 24px map tiles fit many hosts; no search helps locate a known one. [infrastructure.css:87](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/infrastructure/infrastructure.css:87) |
| 3. Visual system consistency | 4 | Surfaces respect themes; map palette is still feature-local. [infrastructure.css:2](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/infrastructure/infrastructure.css:2) |
| 4. Component quality | 4 | HostTile has selected, focus, tooltip and accessible name states. [infrastructure-dashboard.tsx:166](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/infrastructure/infrastructure-dashboard.tsx:166) |
| 5. Interaction & feedback | 4 | Selection is direct and stale data stays visible. [infrastructure-dashboard.tsx:40](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/infrastructure/infrastructure-dashboard.tsx:40) |
| 6. Data visualization | 2 | Compact bars are honest except unknown CPU/RAM masquerading as zero. [infrastructure-dashboard.tsx:219](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/infrastructure/infrastructure-dashboard.tsx:219) |
| 7. State coverage | 4 | Loading, no hosts, stale error and no selected host are designed. [infrastructure-dashboard.tsx:40](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/infrastructure/infrastructure-dashboard.tsx:40) |
| 8. Accessibility | 4 | Native buttons expose status text and warning/critical symbols. [infrastructure-dashboard.tsx:166](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/infrastructure/infrastructure-dashboard.tsx:166) |
| 9. Responsiveness | 4 | A 760px rule stacks details; tiles retain exact 24px targets. [infrastructure.css:198](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/infrastructure/infrastructure.css:198) |
| 10. Copy & microcopy | 3 | Unavailable Disk/Network copy is explicit; zero footnote is too weak. [infrastructure-dashboard.tsx:216](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/infrastructure/infrastructure-dashboard.tsx:216) |
| 11. Observability-specific UX | 3 | Node capacity units and polling are clear; no container/Pod drilldown. [infrastructure-dashboard.tsx:219](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/infrastructure/infrastructure-dashboard.tsx:219) |


## Admin / tenant settings

**Rating:** 2.5/5

**What works:**

- Tenant, users and teams are grouped; destructive user/team actions have confirmation ([admin-page.tsx:67](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/admin/admin-page.tsx:67), [admin-page.tsx:84](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/admin/admin-page.tsx:84)).
- The password-change impact on sessions is explained ([admin-page.tsx:78](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/admin/admin-page.tsx:78)).

**What's weak:**

- There is no initial loading presentation; empty arrays can make users/teams look like zero while requests run ([admin-page.tsx:23](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/admin/admin-page.tsx:23)).
- Errors have no inline retry control ([admin-page.tsx:30](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/admin/admin-page.tsx:30)).
- Non-admin users silently redirect while Infrastructure explains permission denial; identical permission problems have different experiences ([admin-page.tsx:36](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/admin/admin-page.tsx:36)).

**Concrete fixes:**

1. S — Distinguish loading counts from genuine zero ([admin-page.tsx:23](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/admin/admin-page.tsx:23)).
2. S — Add Retry next to loading errors ([admin-page.tsx:30](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/admin/admin-page.tsx:30)).
3. S — Explain access denial before offering a return destination ([admin-page.tsx:36](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/admin/admin-page.tsx:36)).

| Axis | Rating / 5 | Concrete finding |
| --- | --- | --- |
| 1. First impression & hierarchy | 3 | Panel grouping is clear, but configuration shares operator-screen visual language. [admin-page.tsx:53](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/admin/admin-page.tsx:53) |
| 2. Information density & scannability | 3 | Dense user/team editing remains in grouped panels. [admin-page.tsx:61](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/admin/admin-page.tsx:61) |
| 3. Visual system consistency | 3 | p-5/p-6 panels are much roomier than host-map 4/8px rhythm. [admin-page.tsx:53](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/admin/admin-page.tsx:53) |
| 4. Component quality | 3 | Native confirmed actions are usable; initial state lacks polish. [admin-page.tsx:67](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/admin/admin-page.tsx:67) |
| 5. Interaction & feedback | 3 | Busy guards and saved notices exist. [admin-page.tsx:30](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/admin/admin-page.tsx:30) |
| 6. Data visualization | 3 | No chart needed; initial zero counts are not reliable state. [admin-page.tsx:23](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/admin/admin-page.tsx:23) |
| 7. State coverage | 2 | Loading, retry and permission explanation are underdeveloped. [admin-page.tsx:23](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/admin/admin-page.tsx:23) |
| 8. Accessibility | 4 | Wrapped labels associate the editing inputs. [admin-page.tsx:61](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/admin/admin-page.tsx:61) |
| 9. Responsiveness | 3 | Tables have horizontal overflow support. [admin-page.tsx:81](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/admin/admin-page.tsx:81) |
| 10. Copy & microcopy | 2 | English heading mixes with German administrative copy. [admin-page.tsx:54](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/admin/admin-page.tsx:54) |
| 11. Observability-specific UX | 3 | Useful tenant ownership controls; no operational dashboard is implied. [admin-page.tsx:78](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/admin/admin-page.tsx:78) |


## Login

**Rating:** 3/5

**What works:**

- Organization, email and password have explicit labels and appropriate autocomplete; pending submit is disabled with changed copy ([login-page.tsx:49](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/auth/login-page.tsx:49), [login-page.tsx:86](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/auth/login-page.tsx:86)).
- Authentication failures use an alert instead of disappearing silently ([login-page.tsx:85](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/auth/login-page.tsx:85)).

**What's weak:**

- Login forces raw dark surfaces regardless of the selected light theme ([login-page.tsx:36](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/auth/login-page.tsx:36)).
- Muted text inherits the active global theme over a permanently dark form; contrast is an inferred risk, not a measured screenshot result ([login-page.tsx:107](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/auth/login-page.tsx:107)).
- Organization entry offers no recovery guidance if the engineer does not know the tenant identifier ([login-page.tsx:49](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/auth/login-page.tsx:49)).

**Concrete fixes:**

1. S — Use the selected theme's surface and text tokens on Login ([login-page.tsx:36](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/auth/login-page.tsx:36)).
2. S — Add Where do I find my organization? help beside the tenant field ([login-page.tsx:49](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/auth/login-page.tsx:49)).

| Axis | Rating / 5 | Concrete finding |
| --- | --- | --- |
| 1. First impression & hierarchy | 4 | A single sign-in action is clear. [login-page.tsx:86](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/auth/login-page.tsx:86) |
| 2. Information density & scannability | 4 | Three necessary fields keep the surface focused. [login-page.tsx:49](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/auth/login-page.tsx:49) |
| 3. Visual system consistency | 1 | Hardcoded dark surfaces ignore selected light mode. [login-page.tsx:36](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/auth/login-page.tsx:36) |
| 4. Component quality | 4 | Explicit field labels, autocomplete and pending state are solid. [login-page.tsx:49](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/auth/login-page.tsx:49) |
| 5. Interaction & feedback | 4 | Submit shows pending feedback and prevents duplicate attempts. [login-page.tsx:86](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/auth/login-page.tsx:86) |
| 6. Data visualization | 3 | No chart appropriate; form values and errors are textual. [login-page.tsx:85](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/auth/login-page.tsx:85) |
| 7. State coverage | 3 | Error and pending states exist; recovery guidance is absent. [login-page.tsx:85](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/auth/login-page.tsx:85) |
| 8. Accessibility | 3 | Labels are strong; theme mixing makes muted contrast suspect (inference). [login-page.tsx:107](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/auth/login-page.tsx:107) |
| 9. Responsiveness | 4 | Constrained centered form is a reasonable small-screen foundation. [login-page.tsx:37](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/auth/login-page.tsx:37) |
| 10. Copy & microcopy | 3 | Organization is unexplained for an unfamiliar operator. [login-page.tsx:49](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/auth/login-page.tsx:49) |
| 11. Observability-specific UX | 3 | Tenant-aware access is useful; a lost tenant identifier can block an incident response. [login-page.tsx:49](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/auth/login-page.tsx:49) |

# 3. Component-level findings

Twelve real, mounted component spot-checks. Purpose/prop discussion below describes user-facing scope, not a proposed API refactor. Severity is product severity; individual axis scores remain provisional.

| Component | File | Issue | Severity (low/med/high) | Fix |
| --- | --- | --- | --- | --- |
| DataTable | [data-table.tsx:199](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/data-table.tsx:199) | Rows open drawers with pointer clicks but provide no equivalent focusable action. | high | Add a native Open detail action in the primary cell. |
| TimeRangePicker | [timer-range.picker.tsx:76](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/app/components/timer-range.picker.tsx:76) | A custom popup has no expanded/dialog semantics, labeled input or announced parse errors. | high | Give the picker a labeled input and explicit popup semantics/focus-return behavior. |
| FacetQueryBar | [facet-query-bar.tsx:207](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/facet-query-bar.tsx:207) | Good combobox interaction; 10px facets and tiny chip-dismiss affordances strain dense use. | low | Increase chip-dismiss hit areas without increasing the chip's visual weight. |
| FilterMultiselect | [filter-multiselect.tsx:11](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/filter-multiselect.tsx:11) | At the 50-selection limit additional options silently become disabled. | med | Show the selection limit beside the control when reached. |
| TelemetryActions | [feature-actions.tsx:41](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/feature-actions.tsx:41) | Stream connection status carries hidden with no visible-breakpoint override. | high | Make a compact Live/Disconnected indicator visible beside Refresh. |
| MonitorRow | [monitors-components.tsx:370](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-components.tsx:370) | A clickable div is the only row-level detail affordance. | high | Expose the monitor name as a keyboard-operable detail action. |
| MonitorForm | [monitors-components.tsx:631](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-components.tsx:631) | Query plus comparator/threshold/window makes rule meaning ambiguous. | high | Show a single human-readable evaluation-rule preview. |
| TraceDetailSheet | [trace-detail-sheet.tsx:382](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/components/shared/trace-detail-sheet.tsx:382) | Timeline bars have no shared temporal ruler. | med | Add a time ruler across the span timeline. |
| LogDetailSheet | [log-detail-sheet.tsx:112](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/logs/components/log-detail-sheet.tsx:112) | The correlation ID is copyable but does not open its trace. | med | Add Open trace beside Trace ID. |
| HostTile | [infrastructure-dashboard.tsx:166](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/infrastructure/infrastructure-dashboard.tsx:166) | Tiles work well individually; the map has no way to locate a known hostname. | low | Add hostname search to the map toolbar. |
| ServiceMetadataSheet | [service-metadata-sheet.tsx:165](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/components/service-metadata-sheet.tsx:165) | Visible text labels are not associated with the on-call/contact/repository inputs. | med | Associate each field label with its input. |
| CopyButton | [telemetry-detail.tsx:27](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/telemetry-detail.tsx:27) | Clipboard rejection has no visible error feedback. | med | Show Copy failed with a selectable-value fallback on clipboard failure. |

### Component axis scorecards

All eleven axes apply; for controls without charts, data visualization means truthful value/selection presentation.

### DataTable

| Axis | Rating / 5 | Concrete finding |
| --- | --- | --- |
| 1. First impression & hierarchy | 4 | Search, columns and pagination have a recognizable hierarchy. [data-table.tsx:143](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/data-table.tsx:143) |
| 2. Information density & scannability | 4 | Telemetry density uses compact rows. [data-table.tsx:204](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/data-table.tsx:204) |
| 3. Visual system consistency | 4 | Borders and muted striping use tokens. [data-table.tsx:203](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/data-table.tsx:203) |
| 4. Component quality | 3 | Density/search APIs are purposeful; activation state is incomplete. [data-table.tsx:62](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/data-table.tsx:62) |
| 5. Interaction & feedback | 2 | Hover advertises an action the keyboard cannot activate. [data-table.tsx:203](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/data-table.tsx:203) |
| 6. Data visualization | 3 | No chart; column widths preserve tabular comparison. [data-table.tsx:175](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/data-table.tsx:175) |
| 7. State coverage | 3 | No-results exists but is generic. [data-table.tsx:227](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/data-table.tsx:227) |
| 8. Accessibility | 1 | Row onClick has no keyboard path. [data-table.tsx:199](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/data-table.tsx:199) |
| 9. Responsiveness | 3 | Underlying table scrolls, but no sticky identifying column. [data-table.tsx:175](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/data-table.tsx:175) |
| 10. Copy & microcopy | 3 | Rows and Columns labels are understandable. [data-table.tsx:157](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/data-table.tsx:157) |
| 11. Observability-specific UX | 3 | Good raw-data reader, weak keyboard drilldown. [data-table.tsx:199](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/data-table.tsx:199) |


### TimeRangePicker

| Axis | Rating / 5 | Concrete finding |
| --- | --- | --- |
| 1. First impression & hierarchy | 4 | Current range is visible on its trigger. [timer-range.picker.tsx:80](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/app/components/timer-range.picker.tsx:80) |
| 2. Information density & scannability | 4 | Presets and free-text entry are compact. [timer-range.picker.tsx:114](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/app/components/timer-range.picker.tsx:114) |
| 3. Visual system consistency | 2 | Parse error uses raw red and 10px text. [timer-range.picker.tsx:99](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/app/components/timer-range.picker.tsx:99) |
| 4. Component quality | 3 | Controlled value/onChange is clear; popup semantics incomplete. [timer-range.picker.tsx:11](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/app/components/timer-range.picker.tsx:11) |
| 5. Interaction & feedback | 3 | Enter/Escape and outside click work; focus return is not managed. [timer-range.picker.tsx:42](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/app/components/timer-range.picker.tsx:42) |
| 6. Data visualization | 3 | No chart; friendly range is shown but absolute bounds/timezone are not. [timer-range.picker.tsx:50](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/app/components/timer-range.picker.tsx:50) |
| 7. State coverage | 3 | Parse error exists but is not associated with the input. [timer-range.picker.tsx:99](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/app/components/timer-range.picker.tsx:99) |
| 8. Accessibility | 1 | Trigger has no aria-expanded and input no accessible label. [timer-range.picker.tsx:76](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/app/components/timer-range.picker.tsx:76) |
| 9. Responsiveness | 2 | Fixed w-80 popup can overflow a narrow placement (inference). [timer-range.picker.tsx:85](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/app/components/timer-range.picker.tsx:85) |
| 10. Copy & microcopy | 3 | Examples teach syntax but not timezone. [timer-range.picker.tsx:103](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/app/components/timer-range.picker.tsx:103) |
| 11. Observability-specific UX | 3 | Flexible ranges are useful; consumers do not consistently honor them. [timer-range.picker.tsx:11](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/app/components/timer-range.picker.tsx:11) |


### FacetQueryBar

| Axis | Rating / 5 | Concrete finding |
| --- | --- | --- |
| 1. First impression & hierarchy | 4 | Selected chips precede search entry. [facet-query-bar.tsx:207](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/facet-query-bar.tsx:207) |
| 2. Information density & scannability | 4 | Wrap and truncation support dense filter sets. [facet-query-bar.tsx:209](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/facet-query-bar.tsx:209) |
| 3. Visual system consistency | 4 | Popover and focus styling use semantic tokens. [facet-query-bar.tsx:260](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/facet-query-bar.tsx:260) |
| 4. Component quality | 4 | Selection/onChange and facet descriptors suit multiple screens. [facet-query-bar.tsx:46](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/facet-query-bar.tsx:46) |
| 5. Interaction & feedback | 4 | Arrow, Enter, Escape and Backspace are implemented. [facet-query-bar.tsx:174](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/facet-query-bar.tsx:174) |
| 6. Data visualization | 3 | No chart; suggested facet/value pairs are explicit. [facet-query-bar.tsx:279](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/facet-query-bar.tsx:279) |
| 7. State coverage | 3 | No matching suggestions yields no explanatory result state. [facet-query-bar.tsx:250](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/facet-query-bar.tsx:250) |
| 8. Accessibility | 4 | Combobox/listbox active descendant semantics are present. [facet-query-bar.tsx:224](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/facet-query-bar.tsx:224) |
| 9. Responsiveness | 4 | Portalled popup flips and follows nested scroll. [facet-query-bar.tsx:128](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/facet-query-bar.tsx:128) |
| 10. Copy & microcopy | 4 | Add filter and removable named chips explain the task. [facet-query-bar.tsx:240](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/facet-query-bar.tsx:240) |
| 11. Observability-specific UX | 4 | Correlated host/service/environment facets support investigations. [facet-query-bar.tsx:240](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/facet-query-bar.tsx:240) |


### FilterMultiselect

| Axis | Rating / 5 | Concrete finding |
| --- | --- | --- |
| 1. First impression & hierarchy | 4 | All versus selected values is explicit. [filter-multiselect.tsx:13](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/filter-multiselect.tsx:13) |
| 2. Information density & scannability | 3 | Joined values truncate; there is no selected count summary. [filter-multiselect.tsx:13](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/filter-multiselect.tsx:13) |
| 3. Visual system consistency | 4 | Token surfaces match other filter controls. [filter-multiselect.tsx:12](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/filter-multiselect.tsx:12) |
| 4. Component quality | 4 | Selected values absent from current results are retained. [filter-multiselect.tsx:9](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/filter-multiselect.tsx:9) |
| 5. Interaction & feedback | 3 | Checkbox menus stay open; reaching 50 gives no explanation. [filter-multiselect.tsx:20](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/filter-multiselect.tsx:20) |
| 6. Data visualization | 3 | No chart; selected values are represented textually. [filter-multiselect.tsx:23](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/filter-multiselect.tsx:23) |
| 7. State coverage | 4 | No options and missing-current-result states exist. [filter-multiselect.tsx:23](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/filter-multiselect.tsx:23) |
| 8. Accessibility | 4 | Named trigger and checkbox primitives support keyboard use. [filter-multiselect.tsx:11](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/filter-multiselect.tsx:11) |
| 9. Responsiveness | 4 | Popup width is capped by viewport. [filter-multiselect.tsx:16](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/filter-multiselect.tsx:16) |
| 10. Copy & microcopy | 3 | All / Clear selection combines two meanings in one label. [filter-multiselect.tsx:17](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/filter-multiselect.tsx:17) |
| 11. Observability-specific UX | 4 | Stale selected filters remain visible rather than silently disappearing. [filter-multiselect.tsx:23](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/filter-multiselect.tsx:23) |


### TelemetryActions

| Axis | Rating / 5 | Concrete finding |
| --- | --- | --- |
| 1. First impression & hierarchy | 3 | Refresh is visible; connection state is concealed. [feature-actions.tsx:41](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/feature-actions.tsx:41) |
| 2. Information density & scannability | 3 | Compact actions save room at the expense of freshness context. [feature-actions.tsx:41](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/feature-actions.tsx:41) |
| 3. Visual system consistency | 4 | Shared button and muted status styling are consistent. [feature-actions.tsx:20](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/feature-actions.tsx:20) |
| 4. Component quality | 3 | Loading and connected props exist, but connected is not visibly usable. [feature-actions.tsx:31](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/feature-actions.tsx:31) |
| 5. Interaction & feedback | 3 | Refresh spinner works; no pause action exists. [feature-actions.tsx:23](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/feature-actions.tsx:23) |
| 6. Data visualization | 2 | No chart; live-state evidence is not surfaced. [feature-actions.tsx:41](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/feature-actions.tsx:41) |
| 7. State coverage | 2 | Disconnected state exists in markup but is hidden. [feature-actions.tsx:46](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/feature-actions.tsx:46) |
| 8. Accessibility | 3 | Refresh has title and aria-label; hidden status cannot inform readers. [feature-actions.tsx:20](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/feature-actions.tsx:20) |
| 9. Responsiveness | 4 | Button remains compact across screen widths. [feature-actions.tsx:20](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/feature-actions.tsx:20) |
| 10. Copy & microcopy | 2 | Refresh is clear; Stream connected is invisible. [feature-actions.tsx:46](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/feature-actions.tsx:46) |
| 11. Observability-specific UX | 2 | Engineers cannot tell live from disconnected at a glance. [feature-actions.tsx:41](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/feature-actions.tsx:41) |


### MonitorRow

| Axis | Rating / 5 | Concrete finding |
| --- | --- | --- |
| 1. First impression & hierarchy | 3 | Name/status are prominent, though status is unevaluated. [monitors-components.tsx:420](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-components.tsx:420) |
| 2. Information density & scannability | 4 | Secondary condition/time fields hide at container breakpoints. [monitors-components.tsx:395](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-components.tsx:395) |
| 3. Visual system consistency | 2 | Status dot is uncolored. [monitors-components.tsx:51](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-components.tsx:51) |
| 4. Component quality | 2 | Row accepts health/series data that currently supplies no evaluation evidence. [monitors-components.tsx:395](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-components.tsx:395) |
| 5. Interaction & feedback | 3 | Actions reveal on hover and focus-within, but row activation is pointer-only. [monitors-components.tsx:424](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-components.tsx:424) |
| 6. Data visualization | 1 | Empty sparkline does not establish operational state. [monitors-components.tsx:395](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-components.tsx:395) |
| 7. State coverage | 2 | No explicit per-row pending mute state. [monitors-components.tsx:427](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-components.tsx:427) |
| 8. Accessibility | 1 | Div onClick cannot be opened by keyboard. [monitors-components.tsx:370](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-components.tsx:370) |
| 9. Responsiveness | 4 | Container-aware layout is sensible for narrow panels. [monitors-components.tsx:371](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-components.tsx:371) |
| 10. Copy & microcopy | 3 | Status text is readable but can falsely imply measured health. [monitors-components.tsx:420](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-components.tsx:420) |
| 11. Observability-specific UX | 1 | The health-bearing row is currently a configuration row. [use-monitors.tsx:85](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/hooks/use-monitors.tsx:85) |


### MonitorForm

| Axis | Rating / 5 | Concrete finding |
| --- | --- | --- |
| 1. First impression & hierarchy | 3 | Name/query/threshold/targets establish an authoring sequence. [monitors-components.tsx:734](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-components.tsx:734) |
| 2. Information density & scannability | 2 | Long query syntax is compressed into a single-line field. [monitors-components.tsx:779](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-components.tsx:779) |
| 3. Visual system consistency | 3 | Shared controls mostly match the platform. [monitors-components.tsx:750](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-components.tsx:750) |
| 4. Component quality | 2 | canSave checks presence, not a visible query validation result. [monitors-components.tsx:665](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-components.tsx:665) |
| 5. Interaction & feedback | 3 | Pending disables input; submit label does not say Saving. [monitors-components.tsx:717](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-components.tsx:717) |
| 6. Data visualization | 1 | No preview series establishes what the rule will evaluate. [monitors-components.tsx:779](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-components.tsx:779) |
| 7. State coverage | 2 | No unsaved-draft dismissal guard. [monitors-view.tsx:300](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-view.tsx:300) |
| 8. Accessibility | 1 | Several labels have no htmlFor/id pairing. [monitors-components.tsx:734](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-components.tsx:734) |
| 9. Responsiveness | 3 | Form sections fit a sheet but query text can exceed its width. [monitors-components.tsx:779](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-components.tsx:779) |
| 10. Copy & microcopy | 2 | Template-support claim lacks a demonstrated delivery state. [monitors-components.tsx:922](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-components.tsx:922) |
| 11. Observability-specific UX | 1 | Two apparent threshold authorities undermine author confidence. [monitors-components.tsx:866](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-components.tsx:866) |


### TraceDetailSheet

| Axis | Rating / 5 | Concrete finding |
| --- | --- | --- |
| 1. First impression & hierarchy | 4 | Trace summary leads into span timing. [trace-detail-sheet.tsx:334](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/components/shared/trace-detail-sheet.tsx:334) |
| 2. Information density & scannability | 4 | Collapsible hierarchy makes many spans manageable. [trace-detail-sheet.tsx:218](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/components/shared/trace-detail-sheet.tsx:218) |
| 3. Visual system consistency | 3 | Normal span bars use raw blue. [trace-detail-sheet.tsx:264](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/components/shared/trace-detail-sheet.tsx:264) |
| 4. Component quality | 4 | Attributes/raw tabs and focus restoration are mature. [trace-detail-sheet.tsx:284](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/components/shared/trace-detail-sheet.tsx:284) |
| 5. Interaction & feedback | 4 | Loading errors have retry and opener focus returns on close. [trace-detail-sheet.tsx:330](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/components/shared/trace-detail-sheet.tsx:330) |
| 6. Data visualization | 3 | Relative bars help; no ruler or zoom. [trace-detail-sheet.tsx:382](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/components/shared/trace-detail-sheet.tsx:382) |
| 7. State coverage | 4 | Loading, expired/unavailable trace and retry are explicit. [trace-detail-sheet.tsx:327](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/components/shared/trace-detail-sheet.tsx:327) |
| 8. Accessibility | 3 | Collapse controls lack aria-expanded. [trace-detail-sheet.tsx:218](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/components/shared/trace-detail-sheet.tsx:218) |
| 9. Responsiveness | 3 | Rows stack below sm; long hierarchy reduces timing space. [trace-detail-sheet.tsx:244](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/components/shared/trace-detail-sheet.tsx:244) |
| 10. Copy & microcopy | 4 | Duration, services and errors are named. [trace-detail-sheet.tsx:334](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/components/shared/trace-detail-sheet.tsx:334) |
| 11. Observability-specific UX | 3 | Deep trace evidence is good; there is no trace-to-logs action. [trace-detail-sheet.tsx:439](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/components/shared/trace-detail-sheet.tsx:439) |


### LogDetailSheet

| Axis | Rating / 5 | Concrete finding |
| --- | --- | --- |
| 1. First impression & hierarchy | 4 | Message and correlation identify the selected record. [log-detail-sheet.tsx:45](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/logs/components/log-detail-sheet.tsx:45) |
| 2. Information density & scannability | 3 | Severity/time repeat in header and side detail. [log-detail-sheet.tsx:104](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/logs/components/log-detail-sheet.tsx:104) |
| 3. Visual system consistency | 4 | Shared JSON/detail treatment matches trace drawer. [log-detail-sheet.tsx:87](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/logs/components/log-detail-sheet.tsx:87) |
| 4. Component quality | 4 | Useful log/raw tabs and explicit close label. [log-detail-sheet.tsx:62](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/logs/components/log-detail-sheet.tsx:62) |
| 5. Interaction & feedback | 4 | Copy and close have direct feedback. [log-detail-sheet.tsx:57](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/logs/components/log-detail-sheet.tsx:57) |
| 6. Data visualization | 3 | No chart; raw payload preserves evidence. [log-detail-sheet.tsx:138](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/logs/components/log-detail-sheet.tsx:138) |
| 7. State coverage | 3 | Uncorrelated IDs are explained; read-only detail needs no network spinner. [log-detail-sheet.tsx:54](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/logs/components/log-detail-sheet.tsx:54) |
| 8. Accessibility | 4 | Sheet has title/description and named close. [log-detail-sheet.tsx:40](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/logs/components/log-detail-sheet.tsx:40) |
| 9. Responsiveness | 3 | Viewport-bounded width is good; split panes are dense. [log-detail-sheet.tsx:39](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/logs/components/log-detail-sheet.tsx:39) |
| 10. Copy & microcopy | 4 | Uncorrelated log record and Not correlated are specific. [log-detail-sheet.tsx:112](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/logs/components/log-detail-sheet.tsx:112) |
| 11. Observability-specific UX | 2 | Correlation gets harder after entering detail. [log-detail-sheet.tsx:112](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/logs/components/log-detail-sheet.tsx:112) |


### HostTile

| Axis | Rating / 5 | Concrete finding |
| --- | --- | --- |
| 1. First impression & hierarchy | 4 | Status owns the tile; detail stays outside it. [infrastructure-dashboard.tsx:169](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/infrastructure/infrastructure-dashboard.tsx:169) |
| 2. Information density & scannability | 4 | Exactly 24px blocks achieve intentional density. [infrastructure.css:92](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/infrastructure/infrastructure.css:92) |
| 3. Visual system consistency | 3 | Status palette is local rather than shared. [infrastructure.css:2](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/infrastructure/infrastructure.css:2) |
| 4. Component quality | 4 | Selected/onSelect and host data are a focused interface. [infrastructure-dashboard.tsx:159](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/infrastructure/infrastructure-dashboard.tsx:159) |
| 5. Interaction & feedback | 4 | Hover/focus tooltip and selected state are implemented. [infrastructure-dashboard.tsx:184](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/infrastructure/infrastructure-dashboard.tsx:184) |
| 6. Data visualization | 3 | Warning/critical symbols supplement color; zero-load ambiguity remains. [infrastructure-dashboard.tsx:174](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/infrastructure/infrastructure-dashboard.tsx:174) |
| 7. State coverage | 4 | Selected and unselected states have distinct treatments. [infrastructure-dashboard.tsx:169](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/infrastructure/infrastructure-dashboard.tsx:169) |
| 8. Accessibility | 4 | Native button, aria-pressed and descriptive status name. [infrastructure-dashboard.tsx:168](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/infrastructure/infrastructure-dashboard.tsx:168) |
| 9. Responsiveness | 4 | Tile size stays stable while columns reflow. [infrastructure.css:87](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/infrastructure/infrastructure.css:87) |
| 10. Copy & microcopy | 4 | Accessible name includes host, status, CPU and RAM. [infrastructure-dashboard.tsx:170](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/infrastructure/infrastructure-dashboard.tsx:170) |
| 11. Observability-specific UX | 3 | Useful low-density health encoding; finding a named host is manual. [infrastructure-dashboard.tsx:128](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/infrastructure/infrastructure-dashboard.tsx:128) |


### ServiceMetadataSheet

| Axis | Rating / 5 | Concrete finding |
| --- | --- | --- |
| 1. First impression & hierarchy | 4 | Ownership and source metadata are logically grouped. [service-metadata-sheet.tsx:146](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/components/service-metadata-sheet.tsx:146) |
| 2. Information density & scannability | 3 | Several short metadata fields fit a focused editor. [service-metadata-sheet.tsx:165](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/components/service-metadata-sheet.tsx:165) |
| 3. Visual system consistency | 4 | Shared sheet/control vocabulary is consistent. [service-metadata-sheet.tsx:92](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/components/service-metadata-sheet.tsx:92) |
| 4. Component quality | 3 | Saving and fetch errors exist; label associations are unfinished. [service-metadata-sheet.tsx:168](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/components/service-metadata-sheet.tsx:168) |
| 5. Interaction & feedback | 4 | Save changes to Saving and locks fields. [service-metadata-sheet.tsx:226](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/components/service-metadata-sheet.tsx:226) |
| 6. Data visualization | 3 | No chart appropriate; configuration values stay textual. [service-metadata-sheet.tsx:168](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/components/service-metadata-sheet.tsx:168) |
| 7. State coverage | 3 | Team-fetch failure instructs reopen rather than inline retry. [service-metadata-sheet.tsx:58](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/components/service-metadata-sheet.tsx:58) |
| 8. Accessibility | 2 | Input labels are visual only. [service-metadata-sheet.tsx:165](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/components/service-metadata-sheet.tsx:165) |
| 9. Responsiveness | 3 | Footer stays accessible; long repository strings need scrolling. [service-metadata-sheet.tsx:190](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/components/service-metadata-sheet.tsx:190) |
| 10. Copy & microcopy | 3 | Save is clear; failure recovery should not require closing. [service-metadata-sheet.tsx:58](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/components/service-metadata-sheet.tsx:58) |
| 11. Observability-specific UX | 4 | Team/on-call ownership belongs near service evidence. [service-metadata-sheet.tsx:146](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/components/service-metadata-sheet.tsx:146) |


### CopyButton

| Axis | Rating / 5 | Concrete finding |
| --- | --- | --- |
| 1. First impression & hierarchy | 4 | Small secondary action does not compete with payload text. [telemetry-detail.tsx:41](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/telemetry-detail.tsx:41) |
| 2. Information density & scannability | 4 | Mobile hides copy text while retaining the action. [telemetry-detail.tsx:51](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/telemetry-detail.tsx:51) |
| 3. Visual system consistency | 4 | Ghost styling and success token match detail UI. [telemetry-detail.tsx:47](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/telemetry-detail.tsx:47) |
| 4. Component quality | 3 | Value/label props are clear; failure state is missing. [telemetry-detail.tsx:7](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/telemetry-detail.tsx:7) |
| 5. Interaction & feedback | 3 | Success icon/text lasts 1.5 seconds; rejection is silent. [telemetry-detail.tsx:27](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/telemetry-detail.tsx:27) |
| 6. Data visualization | 3 | No chart; copying preserves exact raw evidence. [telemetry-detail.tsx:28](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/telemetry-detail.tsx:28) |
| 7. State coverage | 2 | Success state exists but clipboard rejection is unhandled. [telemetry-detail.tsx:27](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/telemetry-detail.tsx:27) |
| 8. Accessibility | 3 | Accessible name changes on success; no separate status announcement. [telemetry-detail.tsx:43](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/telemetry-detail.tsx:43) |
| 9. Responsiveness | 4 | Icon-only mobile variant retains an accessible label. [telemetry-detail.tsx:43](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/telemetry-detail.tsx:43) |
| 10. Copy & microcopy | 4 | Copy/Copied are precise. [telemetry-detail.tsx:51](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/telemetry-detail.tsx:51) |
| 11. Observability-specific UX | 4 | Exact IDs/messages can be moved into external incident tooling. [telemetry-detail.tsx:28](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/telemetry-detail.tsx:28) |

# 4. Design system audit

### What is already coherent

The actual frontend is React with React Router, Tailwind CSS, Radix-based UI primitives, TanStack tables and Recharts—not a Next.js screen implementation. Theme tokens define background, foreground, card, popover, border, input, ring, success, warning and five chart hues. This is a credible foundation. [app.tsx:61](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/app/app.tsx:61), [index.css:8](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/index.css:8), [index.css:239](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/index.css:239)

Inter is the global type family; identifiers are deliberately monospace. The root radius derives sm/md/lg/xl from one base. Lucide provides the inspected feature icons. Preserve these choices rather than replacing them with another design system. [index.css:94](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/index.css:94), [index.css:268](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/index.css:268), [metrics-view.tsx:562](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/metrics/components/metrics-view.tsx:562)

### What is ad hoc

| Dimension | Finding | Recommended design decision |
| --- | --- | --- |
| Theme | Login fixes dark hex backgrounds while the shell follows theme tokens. [login-page.tsx:36](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/auth/login-page.tsx:36) | Use the same surface/foreground tokens on authentication. |
| Status | Host map uses local green/yellow/red, while other pages use success/warning/destructive. [infrastructure.css:2](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/infrastructure/infrastructure.css:2), [index.css:31](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/index.css:31) | Define host-status tokens as intentional aliases/overrides with checked light/dark pairs; do not blindly recolor the map. |
| Brand | Purple logo tile is independent of the primary blue scale. [app-sidebar.tsx:94](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/app/components/app-sidebar.tsx:94) | Add a brand token if this purple is intentional. |
| Chart semantics | Five hue tokens exist, but series color depends on grouping iteration rather than persistent identity. [use-metrics.tsx:229](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/metrics/hooks/use-metrics.tsx:229) | Establish stable identity-to-hue rules, separate from status color. |
| Typography | 10/11/12/14/16/24px treatments and uppercase tracking recur without named operator roles. [metrics-view.tsx:189](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/metrics/components/metrics-view.tsx:189), [telemetry-detail.tsx:78](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/telemetry-detail.tsx:78), [service-detail-page.tsx:91](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/service-detail-page.tsx:91) | Define caption, data-label, body, section-title and page-title roles. Keep tiny captions out of essential status explanations. |
| Spacing | Host map has 4/8px rhythm; admin has p-5/p-6 and detail headers px-5/py-4. Different density is sometimes justified but not named. [infrastructure.css:6](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/infrastructure/infrastructure.css:6), [admin-page.tsx:53](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/admin/admin-page.tsx:53), [log-detail-sheet.tsx:45](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/logs/components/log-detail-sheet.tsx:45) | Define compact-investigation and comfortable-editing density roles; do not force forms into 4px spacing. |
| Icons | 12/14/16px icons, size-7/8 targets and default primitive sizes mix. [timer-range.picker.tsx:79](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/app/components/timer-range.picker.tsx:79), [metrics-view.tsx:563](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/metrics/components/metrics-view.tsx:563), [telemetry-detail.tsx:41](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/telemetry-detail.tsx:41) | Define icon-xs/sm and action-target roles; visual icon size must not determine touch target. |
| Radius | Token-derived radii coexist with rounded-full pills, bare rounded and CSS numeric radii. [index.css:268](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/index.css:268), [timer-range.picker.tsx:119](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/app/components/timer-range.picker.tsx:119), [infrastructure.css:92](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/infrastructure/infrastructure.css:92) | Name control, panel, status-pill and host-tile roles; preserve distinct tile/pill shapes intentionally. |
| Borders | FeatureHeader overrides the dark border with a hex. [feature-header.tsx:33](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/components/shared/feature-header.tsx:33) | Use border or a named section-divider token. |
| Motion | Infrastructure has a reduced-motion rule; root smooth scrolling and feature spinners are not equivalently scoped. [infrastructure.css:207](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/infrastructure/infrastructure.css:207), [index.css:110](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/index.css:110), [service-detail-page.tsx:124](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/service-detail-page.tsx:124) | Define a reduced-motion policy for continuous/spatial motion, not a blanket removal of all feedback. |

Recommended additions are semantic contracts, not an invitation to redesign working controls: metric-unavailable, data-stale, brand, host-status, chart-tooltip-surface, caption/data-label, density-compact/density-form and action-target. Each solves a visible inconsistency above. For missing telemetry use unavailable text/symbol, not a newly invented “healthy gray” state. [infrastructure-dashboard.tsx:219](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/infrastructure/infrastructure-dashboard.tsx:219)

### Complete grep-style inventory of source literals found

Scope: all 115 .ts/.tsx/.css files under apps/frontend/src, excluding generated graphify-out and comment-only lines. Scan found **1,015 matching source lines**. Inventory is not limited to mounted components: primitives/dormant exports are included and are NOT automatically treated as active user-facing defects.

Patterns cover hex and literal RGB/HSL colors; raw Tailwind palette colors; numeric/arbitrary Tailwind dimensions, spacing, text sizing and radii; rounded defaults; explicit numeric style/chart dimensions; CSS custom-property values and dimensional declarations. Semantic var references are excluded from color matches but included where a declaration contains literal numeric sizing. Same-line tokens are deduplicated. Numeric pagination/query constants are not design violations; occasional geometry helpers are retained for traceability. This is the full output of that lexical scan, not a claim of runtime/computed-style coverage. Tailwind scale classes are existing tokens, not inherently bad “hardcoding”; arbitrary sizes and raw colors require a design rationale.

Paths in the inventory are repository-relative grep identifiers; actionable findings elsewhere use absolute clickable file:line links. Root token declarations are intentionally listed and should stay centralized.

<details>
<summary>Expand all 1,015 source locations</summary>

```text
apps/frontend/src/app/app.tsx:51: h-dvh w-0 min-w-0
apps/frontend/src/app/app.tsx:53: min-h-0
apps/frontend/src/app/components/app-sidebar.tsx:78: p-3
apps/frontend/src/app/components/app-sidebar.tsx:84: h-10 px-1.5 text-xs
apps/frontend/src/app/components/app-sidebar.tsx:94: size-7 rounded-md bg-purple-600 text-white
apps/frontend/src/app/components/app-sidebar.tsx:95: size-4
apps/frontend/src/app/components/app-sidebar.tsx:97: min-w-0 leading-tight
apps/frontend/src/app/components/app-sidebar.tsx:98: text-xs
apps/frontend/src/app/components/app-sidebar.tsx:101: text-[12px]
apps/frontend/src/app/components/app-sidebar.tsx:112: p-1.5
apps/frontend/src/app/components/app-sidebar.tsx:113: h-7 px-1.5 text-[12px] tracking-wide
apps/frontend/src/app/components/app-sidebar.tsx:156: size-4
apps/frontend/src/app/components/app-sidebar.tsx:168: p-1.5
apps/frontend/src/app/components/app-sidebar.tsx:169: gap-2
apps/frontend/src/app/components/app-sidebar.tsx:187: h-dvh w-12
apps/frontend/src/app/components/app-sidebar.tsx:193: h-12
apps/frontend/src/app/components/app-sidebar.tsx:197: size-8 rounded-md bg-purple-600 text-white
apps/frontend/src/app/components/app-sidebar.tsx:198: size-4
apps/frontend/src/app/components/app-sidebar.tsx:203: gap-1 py-2
apps/frontend/src/app/components/app-sidebar.tsx:233: size-9 rounded-md
apps/frontend/src/app/components/app-sidebar.tsx:240: size-4
apps/frontend/src/app/components/global-header.tsx:22: h-12 px-4
apps/frontend/src/app/components/global-header.tsx:23: min-w-0 gap-2 text-xs
apps/frontend/src/app/components/global-header.tsx:24: size-3.5
apps/frontend/src/app/components/global-header.tsx:26: rounded-sm px-1.5 py-0.5 text-[10px] tracking-wider
apps/frontend/src/app/components/global-header.tsx:31: h-7 text-xs
apps/frontend/src/app/components/mode-toggle.tsx:9: gap-0.5 bg-slate-800 rounded-lg p-1 border-slate-700
apps/frontend/src/app/components/mode-toggle.tsx:16: h-8 w-8 p-0
apps/frontend/src/app/components/mode-toggle.tsx:18: bg-white w-sm bg-gray-100 bg-gray-200
apps/frontend/src/app/components/mode-toggle.tsx:19: bg-slate-700
apps/frontend/src/app/components/mode-toggle.tsx:22: h-4 w-4
apps/frontend/src/app/components/mode-toggle.tsx:30: h-8 w-8 p-0
apps/frontend/src/app/components/mode-toggle.tsx:32: bg-slate-800 text-white w-sm bg-slate-700
apps/frontend/src/app/components/mode-toggle.tsx:33: bg-slate-700
apps/frontend/src/app/components/mode-toggle.tsx:36: h-4 w-4
apps/frontend/src/app/components/mode-toggle.tsx:44: h-8 w-8 p-0
apps/frontend/src/app/components/mode-toggle.tsx:47: bg-slate-800 text-white w-sm bg-slate-700
apps/frontend/src/app/components/mode-toggle.tsx:48: bg-white w-sm bg-gray-100
apps/frontend/src/app/components/mode-toggle.tsx:49: bg-slate-700
apps/frontend/src/app/components/mode-toggle.tsx:52: h-4 w-4
apps/frontend/src/app/components/theme-provider.tsx:74: hsl(210, 40%, 98%) hsl(222.2, 84%, 4.9%)
apps/frontend/src/app/components/theme-provider.tsx:75: hsl(222.2, 84%, 4.9%) hsl(0, 0%, 100%)
apps/frontend/src/app/components/timer-range.picker.tsx:76: gap-1.5 max-w-[240px]
apps/frontend/src/app/components/timer-range.picker.tsx:79: h-3.5 w-3.5
apps/frontend/src/app/components/timer-range.picker.tsx:81: h-3.5 w-3.5
apps/frontend/src/app/components/timer-range.picker.tsx:85: p-full mt-1 w-80 rounded-lg p-3 w-lg
apps/frontend/src/app/components/timer-range.picker.tsx:87: mb-2
apps/frontend/src/app/components/timer-range.picker.tsx:96: h-8 text-xs
apps/frontend/src/app/components/timer-range.picker.tsx:99: mt-1 text-[10px] text-red-600
apps/frontend/src/app/components/timer-range.picker.tsx:101: mt-1 text-[10px]
apps/frontend/src/app/components/timer-range.picker.tsx:109: mb-1 gap-1.5 text-[10px] tracking-wide
apps/frontend/src/app/components/timer-range.picker.tsx:110: h-3 w-3
apps/frontend/src/app/components/timer-range.picker.tsx:113: max-h-64
apps/frontend/src/app/components/timer-range.picker.tsx:119: w-full rounded px-2 py-1.5 text-xs
apps/frontend/src/app/components/timer-range.picker.tsx:126: text-[10px]
apps/frontend/src/components/shared/app-filter-sidebar.tsx:43: min-h-0 min-w-0
apps/frontend/src/components/shared/app-filter-sidebar.tsx:44: w-full min-w-0 space-y-3 p-1
apps/frontend/src/components/shared/app-filter-sidebar.tsx:56: w-[min(20rem,calc(100vw-2rem))] p-0
apps/frontend/src/components/shared/app-filter-sidebar.tsx:58: p-4
apps/frontend/src/components/shared/app-filter-sidebar.tsx:64: min-h-0 p-4
apps/frontend/src/components/shared/app-filter-sidebar.tsx:69: min-h-0 min-w-0
apps/frontend/src/components/shared/app-filter-sidebar.tsx:70: w-64 w-12
apps/frontend/src/components/shared/app-filter-sidebar.tsx:78: mt-2 size-7
apps/frontend/src/components/shared/app-filter-sidebar.tsx:83: size-4
apps/frontend/src/components/shared/feature-header.tsx:33: gap-3 #242936 pb-3
apps/frontend/src/components/shared/feature-header.tsx:37: min-w-0
apps/frontend/src/components/shared/feature-header.tsx:38: text-base tracking-tight
apps/frontend/src/components/shared/feature-header.tsx:40: mt-1 text-sm
apps/frontend/src/components/shared/feature-header.tsx:46: min-w-0 gap-2
apps/frontend/src/components/shared/feature-header.tsx:50: max-w-full min-w-0 gap-2
apps/frontend/src/components/shared/feature-header.tsx:57: size-8
apps/frontend/src/components/shared/feature-header.tsx:63: size-4
apps/frontend/src/components/shared/page-layout.tsx:10: p-3 p-4 w-full min-w-0 space-y-4 min-h-screen
apps/frontend/src/components/shared/telemetry-primitives.tsx:40: tracking-tight
apps/frontend/src/components/shared/telemetry-primitives.tsx:58: rounded px-1.5 py-0.5 text-[10px] leading-none tracking-wide
apps/frontend/src/components/shared/telemetry-primitives.tsx:77: min-w-0
apps/frontend/src/components/shared/telemetry-widget.tsx:10: min-w-0 p-3 w-none p-0 pb-3
apps/frontend/src/components/shared/telemetry-widget.tsx:18: gap-3
apps/frontend/src/components/shared/trace-detail-sheet.tsx:212: min-h-11 pr-3
apps/frontend/src/components/shared/trace-detail-sheet.tsx:221: mr-1 h-6 w-6 p-0
apps/frontend/src/components/shared/trace-detail-sheet.tsx:233: h-3.5 w-3.5
apps/frontend/src/components/shared/trace-detail-sheet.tsx:235: h-3.5 w-3.5
apps/frontend/src/components/shared/trace-detail-sheet.tsx:239: mr-1 w-6
apps/frontend/src/components/shared/trace-detail-sheet.tsx:244: min-w-0 gap-2 py-1
apps/frontend/src/components/shared/trace-detail-sheet.tsx:247: min-w-0
apps/frontend/src/components/shared/trace-detail-sheet.tsx:248: text-xs
apps/frontend/src/components/shared/trace-detail-sheet.tsx:251: text-[11px]
apps/frontend/src/components/shared/trace-detail-sheet.tsx:255: rounded-sm
apps/frontend/src/components/shared/trace-detail-sheet.tsx:258: h-2 rounded-sm
apps/frontend/src/components/shared/trace-detail-sheet.tsx:261: bg-blue-500/80
apps/frontend/src/components/shared/trace-detail-sheet.tsx:266: text-xs
apps/frontend/src/components/shared/trace-detail-sheet.tsx:292: w-[min(96vw,1080px)] p-0 max-w-[1080px]
apps/frontend/src/components/shared/trace-detail-sheet.tsx:299: gap-3 px-5 py-4
apps/frontend/src/components/shared/trace-detail-sheet.tsx:300: min-w-0 gap-3
apps/frontend/src/components/shared/trace-detail-sheet.tsx:301: h-8 w-8 rounded-md
apps/frontend/src/components/shared/trace-detail-sheet.tsx:302: h-4 w-4
apps/frontend/src/components/shared/trace-detail-sheet.tsx:304: min-w-0
apps/frontend/src/components/shared/trace-detail-sheet.tsx:305: text-base
apps/frontend/src/components/shared/trace-detail-sheet.tsx:306: mt-0.5 min-w-0 gap-1
apps/frontend/src/components/shared/trace-detail-sheet.tsx:307: text-xs
apps/frontend/src/components/shared/trace-detail-sheet.tsx:319: h-8 w-8 p-0
apps/frontend/src/components/shared/trace-detail-sheet.tsx:323: h-3.5 w-3.5
apps/frontend/src/components/shared/trace-detail-sheet.tsx:336: px-5 py-3 text-xs
apps/frontend/src/components/shared/trace-detail-sheet.tsx:337: pr-4
apps/frontend/src/components/shared/trace-detail-sheet.tsx:339: mt-0.5
apps/frontend/src/components/shared/trace-detail-sheet.tsx:343: px-4
apps/frontend/src/components/shared/trace-detail-sheet.tsx:345: mt-0.5
apps/frontend/src/components/shared/trace-detail-sheet.tsx:349: px-4
apps/frontend/src/components/shared/trace-detail-sheet.tsx:351: mt-0.5
apps/frontend/src/components/shared/trace-detail-sheet.tsx:355: pl-4
apps/frontend/src/components/shared/trace-detail-sheet.tsx:357: mt-0.5
apps/frontend/src/components/shared/trace-detail-sheet.tsx:363: min-h-0
apps/frontend/src/components/shared/trace-detail-sheet.tsx:364: h-11 w-full rounded-none px-5 py-0
apps/frontend/src/components/shared/trace-detail-sheet.tsx:367: h-11 gap-2 rounded-none px-3 w-none
apps/frontend/src/components/shared/trace-detail-sheet.tsx:369: h-3.5 w-3.5
apps/frontend/src/components/shared/trace-detail-sheet.tsx:373: h-11 gap-2 rounded-none px-3 w-none
apps/frontend/src/components/shared/trace-detail-sheet.tsx:375: h-3.5 w-3.5
apps/frontend/src/components/shared/trace-detail-sheet.tsx:379: m-0 min-h-0
apps/frontend/src/components/shared/trace-detail-sheet.tsx:380: h-full min-h-0
apps/frontend/src/components/shared/trace-detail-sheet.tsx:381: min-h-0 min-w-0
apps/frontend/src/components/shared/trace-detail-sheet.tsx:382: h-9 gap-3 px-3 pl-10 text-[11px] tracking-wide
apps/frontend/src/components/shared/trace-detail-sheet.tsx:387: min-h-0
apps/frontend/src/components/shared/trace-detail-sheet.tsx:392: min-h-0 min-w-0
apps/frontend/src/components/shared/trace-detail-sheet.tsx:393: h-full
apps/frontend/src/components/shared/trace-detail-sheet.tsx:395: space-y-5 p-4
apps/frontend/src/components/shared/trace-detail-sheet.tsx:397: mb-1 gap-3
apps/frontend/src/components/shared/trace-detail-sheet.tsx:398: text-sm
apps/frontend/src/components/shared/trace-detail-sheet.tsx:403: text-xs
apps/frontend/src/components/shared/trace-detail-sheet.tsx:408: rounded-md px-3
apps/frontend/src/components/shared/trace-detail-sheet.tsx:449: h-full p-6 text-sm
apps/frontend/src/components/shared/trace-detail-sheet.tsx:460: m-0 min-h-0 p-5
apps/frontend/src/components/shared/view-skeleton.tsx:26: space-y-4
apps/frontend/src/components/shared/view-skeleton.tsx:31: space-y-4
apps/frontend/src/components/shared/view-skeleton.tsx:33: h-16 w-full rounded-xl
apps/frontend/src/components/shared/view-skeleton.tsx:37: gap-3
apps/frontend/src/components/shared/view-skeleton.tsx:47: w-full
apps/frontend/src/components/shared/view-skeleton.tsx:48: h-32 h-6
apps/frontend/src/components/shared/view-skeleton.tsx:79: rounded-xl
apps/frontend/src/components/shared/view-skeleton.tsx:81: h-4 w-4
apps/frontend/src/components/shared/view-skeleton.tsx:91: mt-3
apps/frontend/src/components/shared/view-skeleton.tsx:96: h-4 w-4
apps/frontend/src/components/ui/alert.tsx:7: w-full rounded-lg p-4 pl-7
apps/frontend/src/components/ui/alert.tsx:41: mb-1 leading-none tracking-tight
apps/frontend/src/components/ui/alert.tsx:53: text-sm
apps/frontend/src/components/ui/badge.tsx:7: rounded-md px-2.5 py-0.5 text-xs
apps/frontend/src/components/ui/button.tsx:8: gap-2 rounded-md text-sm size-4
apps/frontend/src/components/ui/button.tsx:23: h-10 px-4 py-2
apps/frontend/src/components/ui/button.tsx:24: h-9 rounded-md px-3
apps/frontend/src/components/ui/button.tsx:25: h-11 rounded-md px-8
apps/frontend/src/components/ui/button.tsx:26: h-10 w-10
apps/frontend/src/components/ui/card.tsx:12: rounded-xl w-sm
apps/frontend/src/components/ui/card.tsx:27: space-y-1.5 p-6
apps/frontend/src/components/ui/card.tsx:40: text-2xl leading-none tracking-tight
apps/frontend/src/components/ui/card.tsx:54: text-sm
apps/frontend/src/components/ui/card.tsx:64: p-6 pt-0
apps/frontend/src/components/ui/card.tsx:74: p-6 pt-0
apps/frontend/src/components/ui/checkbox.tsx:15: h-4 w-4 rounded
apps/frontend/src/components/ui/dropdown-menu.tsx:28: gap-2 rounded-sm px-2 py-1.5 text-sm size-4
apps/frontend/src/components/ui/dropdown-menu.tsx:29: pl-8
apps/frontend/src/components/ui/dropdown-menu.tsx:48: min-w-[8rem] rounded-md p-1 w-lg p-2 m-2
apps/frontend/src/components/ui/dropdown-menu.tsx:66: min-w-[8rem] rounded-md p-1 w-md p-2 m-2
apps/frontend/src/components/ui/dropdown-menu.tsx:84: gap-2 rounded-sm px-2 py-1.5 text-sm size-4
apps/frontend/src/components/ui/dropdown-menu.tsx:85: pl-8
apps/frontend/src/components/ui/dropdown-menu.tsx:100: rounded-sm py-1.5 pl-8 pr-2 text-sm
apps/frontend/src/components/ui/dropdown-menu.tsx:106: h-3.5 w-3.5
apps/frontend/src/components/ui/dropdown-menu.tsx:108: h-4 w-4
apps/frontend/src/components/ui/dropdown-menu.tsx:124: rounded-sm py-1.5 pl-8 pr-2 text-sm
apps/frontend/src/components/ui/dropdown-menu.tsx:129: h-3.5 w-3.5
apps/frontend/src/components/ui/dropdown-menu.tsx:131: h-2 w-2
apps/frontend/src/components/ui/dropdown-menu.tsx:148: px-2 py-1.5 text-sm
apps/frontend/src/components/ui/dropdown-menu.tsx:149: pl-8
apps/frontend/src/components/ui/dropdown-menu.tsx:163: mx-1 my-1
apps/frontend/src/components/ui/dropdown-menu.tsx:175: text-xs tracking-widest
apps/frontend/src/components/ui/input.tsx:11: h-10 w-full rounded-md px-3 py-2 text-base text-sm
apps/frontend/src/components/ui/scroll-area.tsx:15: h-full w-full rounded-[inherit]
apps/frontend/src/components/ui/scroll-area.tsx:32: h-none
apps/frontend/src/components/ui/scroll-area.tsx:34: h-full w-2.5 p-[1px]
apps/frontend/src/components/ui/scroll-area.tsx:36: h-2.5 p-[1px]
apps/frontend/src/components/ui/scroll-area.tsx:41: rounded-full
apps/frontend/src/components/ui/select.tsx:20: h-10 w-full rounded-md px-3 py-2 text-sm p-1
apps/frontend/src/components/ui/select.tsx:27: h-4 w-4
apps/frontend/src/components/ui/select.tsx:40: py-1
apps/frontend/src/components/ui/select.tsx:45: h-4 w-4
apps/frontend/src/components/ui/select.tsx:57: py-1
apps/frontend/src/components/ui/select.tsx:62: h-4 w-4
apps/frontend/src/components/ui/select.tsx:76: max-h-96 min-w-[8rem] rounded-md w-md p-2 m-2
apps/frontend/src/components/ui/select.tsx:87: p-1
apps/frontend/src/components/ui/select.tsx:89: w-full
apps/frontend/src/components/ui/select.tsx:106: py-1.5 pl-8 pr-2 text-sm
apps/frontend/src/components/ui/select.tsx:119: w-full rounded-sm py-1.5 pl-8 pr-2 text-sm
apps/frontend/src/components/ui/select.tsx:124: h-3.5 w-3.5
apps/frontend/src/components/ui/select.tsx:126: h-4 w-4
apps/frontend/src/components/ui/select.tsx:141: mx-1 my-1
apps/frontend/src/components/ui/separator.tsx:20: h-[1px] w-full h-full w-[1px]
apps/frontend/src/components/ui/sheet.tsx:24: bg-black/80
apps/frontend/src/components/ui/sheet.tsx:34: gap-4 p-6 w-lg
apps/frontend/src/components/ui/sheet.tsx:38: top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
apps/frontend/src/components/ui/sheet.tsx:40: m-0
apps/frontend/src/components/ui/sheet.tsx:41: left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
apps/frontend/src/components/ui/sheet.tsx:43: h-full w-3 max-w-sm
apps/frontend/src/components/ui/sheet.tsx:68: p-4 rounded-sm
apps/frontend/src/components/ui/sheet.tsx:69: h-4 w-4
apps/frontend/src/components/ui/sheet.tsx:83: space-y-2
apps/frontend/src/components/ui/sheet.tsx:97: space-x-2
apps/frontend/src/components/ui/sheet.tsx:111: text-lg
apps/frontend/src/components/ui/sheet.tsx:123: text-sm
apps/frontend/src/components/ui/sidebar.tsx:148: min-h-svh w-full
apps/frontend/src/components/ui/sidebar.tsx:188: h-full
apps/frontend/src/components/ui/sidebar.tsx:205: p-0
apps/frontend/src/components/ui/sidebar.tsx:217: h-full w-full
apps/frontend/src/components/ui/sidebar.tsx:236: w-0
apps/frontend/src/components/ui/sidebar.tsx:245: h-svh
apps/frontend/src/components/ui/sidebar.tsx:251: p-2
apps/frontend/src/components/ui/sidebar.tsx:259: h-full w-full rounded-lg
apps/frontend/src/components/ui/sidebar.tsx:282: h-7 w-7
apps/frontend/src/components/ui/sidebar.tsx:311: w-4 w-[2px]
apps/frontend/src/components/ui/sidebar.tsx:333: w-full
apps/frontend/src/components/ui/sidebar.tsx:334: m-2 ml-2 ml-0 rounded-xl
apps/frontend/src/components/ui/sidebar.tsx:352: h-8 w-full w-none
apps/frontend/src/components/ui/sidebar.tsx:369: gap-2 p-2
apps/frontend/src/components/ui/sidebar.tsx:384: gap-2 p-2
apps/frontend/src/components/ui/sidebar.tsx:399: mx-2
apps/frontend/src/components/ui/sidebar.tsx:415: min-h-0 gap-2
apps/frontend/src/components/ui/sidebar.tsx:432: w-full min-w-0 p-2
apps/frontend/src/components/ui/sidebar.tsx:450: h-8 rounded-md px-2 text-xs size-4
apps/frontend/src/components/ui/sidebar.tsx:451: mt-8
apps/frontend/src/components/ui/sidebar.tsx:471: p-3.5 w-5 rounded-md p-0 size-4
apps/frontend/src/components/ui/sidebar.tsx:490: w-full text-sm
apps/frontend/src/components/ui/sidebar.tsx:503: w-full min-w-0 gap-1
apps/frontend/src/components/ui/sidebar.tsx:523: w-full gap-2 rounded-md p-2 text-sm pr-8 size-8 size-4
apps/frontend/src/components/ui/sidebar.tsx:532: h-8 text-sm
apps/frontend/src/components/ui/sidebar.tsx:533: h-7 text-xs
apps/frontend/src/components/ui/sidebar.tsx:534: h-12 text-sm p-0
apps/frontend/src/components/ui/sidebar.tsx:617: p-1.5 w-5 rounded-md p-0 size-4
apps/frontend/src/components/ui/sidebar.tsx:620: p-1
apps/frontend/src/components/ui/sidebar.tsx:621: p-1.5
apps/frontend/src/components/ui/sidebar.tsx:622: p-2.5
apps/frontend/src/components/ui/sidebar.tsx:642: h-5 min-w-5 rounded-md px-1 text-xs
apps/frontend/src/components/ui/sidebar.tsx:644: p-1
apps/frontend/src/components/ui/sidebar.tsx:645: p-1.5
apps/frontend/src/components/ui/sidebar.tsx:646: p-2.5
apps/frontend/src/components/ui/sidebar.tsx:670: h-8 gap-2 rounded-md px-2
apps/frontend/src/components/ui/sidebar.tsx:675: size-4 rounded-md
apps/frontend/src/components/ui/sidebar.tsx:680: h-4
apps/frontend/src/components/ui/sidebar.tsx:701: mx-3.5 min-w-0 gap-1 px-2.5 py-0.5
apps/frontend/src/components/ui/sidebar.tsx:733: h-7 min-w-0 gap-2 rounded-md px-2 size-4
apps/frontend/src/components/ui/sidebar.tsx:735: text-xs
apps/frontend/src/components/ui/sidebar.tsx:736: text-sm
apps/frontend/src/components/ui/skeleton.tsx:9: rounded-md
apps/frontend/src/components/ui/table.tsx:9: w-full min-w-0 max-w-full
apps/frontend/src/components/ui/table.tsx:12: w-full text-sm
apps/frontend/src/components/ui/table.tsx:23: h-8
apps/frontend/src/components/ui/table.tsx:61: bg-blue-50 h-8
apps/frontend/src/components/ui/table.tsx:76: h-8 px-3 text-sm pr-0 py-2
apps/frontend/src/components/ui/table.tsx:90: py-2 px-3 text-sm pr-0
apps/frontend/src/components/ui/table.tsx:102: mt-4 text-sm
apps/frontend/src/components/ui/tabs.tsx:15: h-10 rounded-md p-1
apps/frontend/src/components/ui/tabs.tsx:30: rounded-sm px-3 py-1.5 text-sm w-sm
apps/frontend/src/components/ui/tabs.tsx:45: mt-2
apps/frontend/src/components/ui/textarea.tsx:11: min-h-20 w-full rounded-md px-3 py-2 text-sm
apps/frontend/src/components/ui/tooltip.tsx:20: rounded-md px-3 py-1.5 text-sm w-md p-2 m-2
apps/frontend/src/features/admin/admin-page.tsx:11: h-8 rounded-sm text-xs
apps/frontend/src/features/admin/admin-page.tsx:12: text-[11px] tracking-wider
apps/frontend/src/features/admin/admin-page.tsx:13: rounded-sm p-5
apps/frontend/src/features/admin/admin-page.tsx:53: space-y-5 p-5 p-6
apps/frontend/src/features/admin/admin-page.tsx:54: text-lg
apps/frontend/src/features/admin/admin-page.tsx:55: mt-1 text-xs
apps/frontend/src/features/admin/admin-page.tsx:56: rounded-sm p-3 text-xs
apps/frontend/src/features/admin/admin-page.tsx:57: text-xs
apps/frontend/src/features/admin/admin-page.tsx:58: gap-5
apps/frontend/src/features/admin/admin-page.tsx:59: mb-4 text-sm
apps/frontend/src/features/admin/admin-page.tsx:60: mb-4 space-y-3
apps/frontend/src/features/admin/admin-page.tsx:61: space-y-1
apps/frontend/src/features/admin/admin-page.tsx:62: space-y-1
apps/frontend/src/features/admin/admin-page.tsx:63: h-8 rounded-sm text-xs
apps/frontend/src/features/admin/admin-page.tsx:65: gap-2 py-2 text-xs
apps/frontend/src/features/admin/admin-page.tsx:66: ml-2
apps/frontend/src/features/admin/admin-page.tsx:67: h-7 text-xs
apps/frontend/src/features/admin/admin-page.tsx:72: mb-4 text-sm
apps/frontend/src/features/admin/admin-page.tsx:73: gap-3
apps/frontend/src/features/admin/admin-page.tsx:74: space-y-1
apps/frontend/src/features/admin/admin-page.tsx:75: space-y-1
apps/frontend/src/features/admin/admin-page.tsx:76: space-y-1 w-full px-2
apps/frontend/src/features/admin/admin-page.tsx:77: space-y-1 w-full px-2
apps/frontend/src/features/admin/admin-page.tsx:78: text-[11px]
apps/frontend/src/features/admin/admin-page.tsx:79: gap-2 h-8 rounded-sm text-xs
apps/frontend/src/features/admin/admin-page.tsx:81: mt-5 w-full text-xs py-2
apps/frontend/src/features/admin/admin-page.tsx:82: py-3 pr-2
apps/frontend/src/features/admin/admin-page.tsx:83: h-7 text-xs
apps/frontend/src/features/admin/admin-page.tsx:84: h-7 text-xs
apps/frontend/src/features/auth/login-page.tsx:36: min-h-dvh #0c0e12 px-4 py-10 text-slate-100
apps/frontend/src/features/auth/login-page.tsx:37: w-full max-w-sm rounded-sm #242936 #161920 p-6 w-2xl
apps/frontend/src/features/auth/login-page.tsx:38: mb-6 gap-3
apps/frontend/src/features/auth/login-page.tsx:39: size-9 rounded-sm bg-purple-600 text-white
apps/frontend/src/features/auth/login-page.tsx:40: size-4
apps/frontend/src/features/auth/login-page.tsx:43: text-sm tracking-tight
apps/frontend/src/features/auth/login-page.tsx:44: text-xs text-slate-400
apps/frontend/src/features/auth/login-page.tsx:48: space-y-4
apps/frontend/src/features/auth/login-page.tsx:57: h-9 rounded-sm #303747 #0f1218 text-sm text-slate-100
apps/frontend/src/features/auth/login-page.tsx:69: h-9 rounded-sm #303747 #0f1218 text-sm text-slate-100
apps/frontend/src/features/auth/login-page.tsx:81: h-9 rounded-sm #303747 #0f1218 text-sm text-slate-100
apps/frontend/src/features/auth/login-page.tsx:85: text-xs text-red-400
apps/frontend/src/features/auth/login-page.tsx:86: h-9 w-full rounded-sm text-xs
apps/frontend/src/features/auth/login-page.tsx:106: space-y-1.5
apps/frontend/src/features/auth/login-page.tsx:107: text-[11px] tracking-wider
apps/frontend/src/features/infrastructure/infrastructure-page.tsx:12: p-2 text-sm
apps/frontend/src/features/infrastructure/infrastructure.css:2: --infra-ok: #2ce2a2;
apps/frontend/src/features/infrastructure/infrastructure.css:3: --infra-warning: #f5a623;
apps/frontend/src/features/infrastructure/infrastructure.css:4: --infra-critical: #ff4d4d;
apps/frontend/src/features/infrastructure/infrastructure.css:5: margin: 8px;
apps/frontend/src/features/infrastructure/infrastructure.css:6: border: 1px solid hsl(var(--border));
apps/frontend/src/features/infrastructure/infrastructure.css:10: font-size: 12px;
apps/frontend/src/features/infrastructure/infrastructure.css:18: gap: 8px;
apps/frontend/src/features/infrastructure/infrastructure.css:19: padding: 8px;
apps/frontend/src/features/infrastructure/infrastructure.css:22: font-size: 14px;
apps/frontend/src/features/infrastructure/infrastructure.css:30: font-size: 11px;
apps/frontend/src/features/infrastructure/infrastructure.css:35: gap: 4px;
apps/frontend/src/features/infrastructure/infrastructure.css:40: width: 6px;
apps/frontend/src/features/infrastructure/infrastructure.css:41: height: 6px;
apps/frontend/src/features/infrastructure/infrastructure.css:42: border-radius: 50%;
apps/frontend/src/features/infrastructure/infrastructure.css:57: gap: 8px;
apps/frontend/src/features/infrastructure/infrastructure.css:58: padding: 8px;
apps/frontend/src/features/infrastructure/infrastructure.css:62: font-size: 14px;
apps/frontend/src/features/infrastructure/infrastructure.css:69: grid-template-columns: minmax(0, 1fr) 260px;
apps/frontend/src/features/infrastructure/infrastructure.css:72: padding: 8px;
apps/frontend/src/features/infrastructure/infrastructure.css:73: min-width: 0;
apps/frontend/src/features/infrastructure/infrastructure.css:79: gap: 8px;
apps/frontend/src/features/infrastructure/infrastructure.css:81: font-size: 10px;
apps/frontend/src/features/infrastructure/infrastructure.css:82: letter-spacing: 0.06em;
apps/frontend/src/features/infrastructure/infrastructure.css:87: grid-template-columns: repeat(auto-fill, 24px);
apps/frontend/src/features/infrastructure/infrastructure.css:88: gap: 4px;
apps/frontend/src/features/infrastructure/infrastructure.css:92: width: 24px;
apps/frontend/src/features/infrastructure/infrastructure.css:93: height: 24px;
apps/frontend/src/features/infrastructure/infrastructure.css:94: border: 1px solid transparent;
apps/frontend/src/features/infrastructure/infrastructure.css:95: border-radius: 2px;
apps/frontend/src/features/infrastructure/infrastructure.css:96: #0f172a
apps/frontend/src/features/infrastructure/infrastructure.css:107: box-shadow: 0 0 0 2px hsl(var(--foreground));
apps/frontend/src/features/infrastructure/infrastructure.css:111: box-shadow: inset 0 0 0 2px hsl(var(--background));
apps/frontend/src/features/infrastructure/infrastructure.css:125: padding: 8px;
apps/frontend/src/features/infrastructure/infrastructure.css:126: min-width: 0;
apps/frontend/src/features/infrastructure/infrastructure.css:129: font-size: 12px;
apps/frontend/src/features/infrastructure/infrastructure.css:150: height: 3px;
apps/frontend/src/features/infrastructure/infrastructure.css:151: border-radius: 2px;
apps/frontend/src/features/infrastructure/infrastructure.css:157: height: 100%;
apps/frontend/src/features/infrastructure/infrastructure.css:178: padding: 8px;
apps/frontend/src/features/infrastructure/infrastructure.css:183: padding: 8px;
apps/frontend/src/features/infrastructure/infrastructure.css:189: gap: 4px;
apps/frontend/src/features/infrastructure/infrastructure.css:190: max-width: 280px;
apps/frontend/src/features/infrastructure/infrastructure.css:191: padding: 8px;
apps/frontend/src/features/infrastructure/infrastructure.css:192: font-size: 11px;
apps/frontend/src/features/infrastructure/infrastructure.css:198: @media (max-width: 760px) {
apps/frontend/src/features/infrastructure/infrastructure.css:200: grid-template-columns: minmax(0, 1fr);
apps/frontend/src/features/logs/components/log-detail-sheet.tsx:39: w-[min(96vw,1080px)] p-0 max-w-[1080px]
apps/frontend/src/features/logs/components/log-detail-sheet.tsx:45: gap-3 px-5 py-4
apps/frontend/src/features/logs/components/log-detail-sheet.tsx:46: min-w-0 gap-3
apps/frontend/src/features/logs/components/log-detail-sheet.tsx:47: h-8 w-8 rounded-md
apps/frontend/src/features/logs/components/log-detail-sheet.tsx:48: h-4 w-4
apps/frontend/src/features/logs/components/log-detail-sheet.tsx:50: min-w-0
apps/frontend/src/features/logs/components/log-detail-sheet.tsx:51: text-base
apps/frontend/src/features/logs/components/log-detail-sheet.tsx:52: mt-0.5 min-w-0 gap-1
apps/frontend/src/features/logs/components/log-detail-sheet.tsx:53: text-xs
apps/frontend/src/features/logs/components/log-detail-sheet.tsx:62: h-8 w-8 p-0
apps/frontend/src/features/logs/components/log-detail-sheet.tsx:63: h-3.5 w-3.5
apps/frontend/src/features/logs/components/log-detail-sheet.tsx:67: px-5 py-3 text-xs
apps/frontend/src/features/logs/components/log-detail-sheet.tsx:68: pr-4
apps/frontend/src/features/logs/components/log-detail-sheet.tsx:70: mt-0.5
apps/frontend/src/features/logs/components/log-detail-sheet.tsx:72: px-4
apps/frontend/src/features/logs/components/log-detail-sheet.tsx:74: mt-0.5
apps/frontend/src/features/logs/components/log-detail-sheet.tsx:76: px-4
apps/frontend/src/features/logs/components/log-detail-sheet.tsx:78: mt-0.5
apps/frontend/src/features/logs/components/log-detail-sheet.tsx:80: pl-4
apps/frontend/src/features/logs/components/log-detail-sheet.tsx:82: mt-0.5
apps/frontend/src/features/logs/components/log-detail-sheet.tsx:86: min-h-0
apps/frontend/src/features/logs/components/log-detail-sheet.tsx:87: h-11 w-full rounded-none px-5 py-0
apps/frontend/src/features/logs/components/log-detail-sheet.tsx:88: h-11 gap-2 rounded-none px-3 w-none
apps/frontend/src/features/logs/components/log-detail-sheet.tsx:89: h-3.5 w-3.5
apps/frontend/src/features/logs/components/log-detail-sheet.tsx:91: h-11 gap-2 rounded-none px-3 w-none
apps/frontend/src/features/logs/components/log-detail-sheet.tsx:92: h-3.5 w-3.5
apps/frontend/src/features/logs/components/log-detail-sheet.tsx:96: m-0 min-h-0
apps/frontend/src/features/logs/components/log-detail-sheet.tsx:97: h-full min-h-0
apps/frontend/src/features/logs/components/log-detail-sheet.tsx:98: min-h-0 min-w-0
apps/frontend/src/features/logs/components/log-detail-sheet.tsx:99: h-full
apps/frontend/src/features/logs/components/log-detail-sheet.tsx:100: space-y-5 p-4
apps/frontend/src/features/logs/components/log-detail-sheet.tsx:102: mb-1 gap-3
apps/frontend/src/features/logs/components/log-detail-sheet.tsx:103: text-sm
apps/frontend/src/features/logs/components/log-detail-sheet.tsx:106: text-xs
apps/frontend/src/features/logs/components/log-detail-sheet.tsx:109: rounded-md px-3
apps/frontend/src/features/logs/components/log-detail-sheet.tsx:125: min-h-0 min-w-0
apps/frontend/src/features/logs/components/log-detail-sheet.tsx:126: h-9 px-4
apps/frontend/src/features/logs/components/log-detail-sheet.tsx:127: text-[11px] tracking-wide
apps/frontend/src/features/logs/components/log-detail-sheet.tsx:130: min-h-0
apps/frontend/src/features/logs/components/log-detail-sheet.tsx:131: p-5 text-sm leading-6
apps/frontend/src/features/logs/components/log-detail-sheet.tsx:137: m-0 min-h-0 p-5
apps/frontend/src/features/logs/components/logs-components.tsx:11: text-xs
apps/frontend/src/features/logs/components/logs-components.tsx:17: rounded-sm text-xs tracking-tight
apps/frontend/src/features/logs/components/logs-components.tsx:47: gap-2
apps/frontend/src/features/logs/components/logs-components.tsx:49: text-xs tracking-tight
apps/frontend/src/features/logs/components/logs-components.tsx:73: max-w-xl text-xs tracking-tight
apps/frontend/src/features/logs/components/logs-view.tsx:63: mb-4
apps/frontend/src/features/logs/components/logs-view.tsx:87: max-w-md space-y-3
apps/frontend/src/features/logs/components/logs-view.tsx:88: text-sm
apps/frontend/src/features/metrics/components/metrics-components.tsx:15: text-xs tracking-wide
apps/frontend/src/features/metrics/components/metrics-components.tsx:18: mt-1 gap-2
apps/frontend/src/features/metrics/components/metrics-components.tsx:19: text-2xl
apps/frontend/src/features/metrics/components/metrics-components.tsx:24: text-xs
apps/frontend/src/features/metrics/components/metrics-components.tsx:45: rounded-lg p-3 w-lg max-h-80
apps/frontend/src/features/metrics/components/metrics-components.tsx:46: mb-2 text-xs
apps/frontend/src/features/metrics/components/metrics-components.tsx:48: gap-2 text-xs
apps/frontend/src/features/metrics/components/metrics-components.tsx:50: h-2 w-2 rounded-sm
apps/frontend/src/features/metrics/components/metrics-components.tsx:53: max-w-[200px]
apps/frontend/src/features/metrics/components/metrics-components.tsx:76: mt-3 gap-x-4 gap-y-2 pt-3
apps/frontend/src/features/metrics/components/metrics-components.tsx:89: gap-1.5 text-xs
apps/frontend/src/features/metrics/components/metrics-components.tsx:94: h-2.5 w-2.5 rounded-sm
apps/frontend/src/features/metrics/components/metrics-components.tsx:99: max-w-[180px]
apps/frontend/src/features/metrics/components/metrics-components.tsx:100: text-[10px]
apps/frontend/src/features/metrics/components/metrics-components.tsx:110: text-[10px] tracking-wide
apps/frontend/src/features/metrics/components/metrics-view.tsx:119: gap-1.5
apps/frontend/src/features/metrics/components/metrics-view.tsx:122: h-3.5 w-3.5
apps/frontend/src/features/metrics/components/metrics-view.tsx:152: my-3 text-xs
apps/frontend/src/features/metrics/components/metrics-view.tsx:161: mb-2
apps/frontend/src/features/metrics/components/metrics-view.tsx:164: space-y-0.5
apps/frontend/src/features/metrics/components/metrics-view.tsx:176: w-full gap-2.5 rounded-md px-3 py-1.5
apps/frontend/src/features/metrics/components/metrics-view.tsx:182: min-w-0
apps/frontend/src/features/metrics/components/metrics-view.tsx:183: text-xs
apps/frontend/src/features/metrics/components/metrics-view.tsx:186: text-[10px]
apps/frontend/src/features/metrics/components/metrics-view.tsx:202: text-sm
apps/frontend/src/features/metrics/components/metrics-view.tsx:203: min-w-0 max-w-full text-xs
apps/frontend/src/features/metrics/components/metrics-view.tsx:211: space-y-3
apps/frontend/src/features/metrics/components/metrics-view.tsx:217: gap-2
apps/frontend/src/features/metrics/components/metrics-view.tsx:218: text-[10px] tracking-wide
apps/frontend/src/features/metrics/components/metrics-view.tsx:234: gap-1.5 rounded-full px-2.5 py-1 text-xs
apps/frontend/src/features/metrics/components/metrics-view.tsx:246: text-[11px]
apps/frontend/src/features/metrics/components/metrics-view.tsx:255: mb-4
apps/frontend/src/features/metrics/components/metrics-view.tsx:256: h-4 w-4
apps/frontend/src/features/metrics/components/metrics-view.tsx:257: text-xs
apps/frontend/src/features/metrics/components/metrics-view.tsx:292: text-sm
apps/frontend/src/features/metrics/components/metrics-view.tsx:295: ml-2 text-xs
apps/frontend/src/features/metrics/components/metrics-view.tsx:300: gap-3
apps/frontend/src/features/metrics/components/metrics-view.tsx:301: gap-1.5 text-xs
apps/frontend/src/features/metrics/components/metrics-view.tsx:305: h-3 w-3
apps/frontend/src/features/metrics/components/metrics-view.tsx:309: text-xs
apps/frontend/src/features/metrics/components/metrics-view.tsx:312: gap-1 rounded-md p-0.5
apps/frontend/src/features/metrics/components/metrics-view.tsx:317: rounded px-2.5 py-1 text-xs
apps/frontend/src/features/metrics/components/metrics-view.tsx:329: pt-0
apps/frontend/src/features/metrics/components/metrics-view.tsx:330: w-full h-[220px]
apps/frontend/src/features/metrics/components/metrics-view.tsx:336: p-0
apps/frontend/src/features/metrics/components/metrics-view.tsx:345: h-full text-sm
apps/frontend/src/features/metrics/components/metrics-view.tsx:351: h-full text-sm
apps/frontend/src/features/metrics/components/metrics-view.tsx:368: tick={{ fontSize: 10 }}
apps/frontend/src/features/metrics/components/metrics-view.tsx:372: height={20}
apps/frontend/src/features/metrics/components/metrics-view.tsx:376: tick={{ fontSize: 10 }}
apps/frontend/src/features/metrics/components/metrics-view.tsx:379: width={64}
apps/frontend/src/features/metrics/components/metrics-view.tsx:430: tick={{ fontSize: 10 }}
apps/frontend/src/features/metrics/components/metrics-view.tsx:435: height={30}
apps/frontend/src/features/metrics/components/metrics-view.tsx:439: tick={{ fontSize: 10 }}
apps/frontend/src/features/metrics/components/metrics-view.tsx:442: width={80}
apps/frontend/src/features/metrics/components/metrics-view.tsx:455: strokeWidth={1.5}
apps/frontend/src/features/metrics/components/metrics-view.tsx:473: tick={{ fontSize: 10 }}
apps/frontend/src/features/metrics/components/metrics-view.tsx:478: height={30}
apps/frontend/src/features/metrics/components/metrics-view.tsx:482: tick={{ fontSize: 10 }}
apps/frontend/src/features/metrics/components/metrics-view.tsx:485: width={80}
apps/frontend/src/features/metrics/components/metrics-view.tsx:498: strokeWidth={1.5}
apps/frontend/src/features/metrics/components/metrics-view.tsx:499: dot={{ r: 2, strokeWidth: 0, fill: s.color }}
apps/frontend/src/features/metrics/components/metrics-view.tsx:537: mb-4
apps/frontend/src/features/metrics/components/metrics-view.tsx:538: h-4 w-4
apps/frontend/src/features/metrics/components/metrics-view.tsx:539: text-xs
apps/frontend/src/features/metrics/components/metrics-view.tsx:555: text-sm
apps/frontend/src/features/metrics/components/metrics-view.tsx:557: ml-2 text-xs
apps/frontend/src/features/metrics/components/metrics-view.tsx:561: gap-2
apps/frontend/src/features/metrics/components/metrics-view.tsx:562: gap-1.5
apps/frontend/src/features/metrics/components/metrics-view.tsx:563: h-3.5 w-3.5
apps/frontend/src/features/metrics/components/metrics-view.tsx:565: gap-1.5
apps/frontend/src/features/metrics/components/metrics-view.tsx:566: h-3.5 w-3.5
apps/frontend/src/features/metrics/components/metrics-view.tsx:574: py-6 text-sm
apps/frontend/src/features/metrics/hooks/use-metrics.tsx:360: text-xs
apps/frontend/src/features/metrics/hooks/use-metrics.tsx:382: text-xs
apps/frontend/src/features/monitors/components/monitors-components.tsx:44: h-3.5 w-3.5
apps/frontend/src/features/monitors/components/monitors-components.tsx:46: h-3.5 w-3.5
apps/frontend/src/features/monitors/components/monitors-components.tsx:48: h-3.5 w-3.5
apps/frontend/src/features/monitors/components/monitors-components.tsx:55: h-2.5 w-2.5
apps/frontend/src/features/monitors/components/monitors-components.tsx:77: gap-1 rounded-full px-2 py-0.5 text-xs
apps/frontend/src/features/monitors/components/monitors-components.tsx:78: h-3 w-3
apps/frontend/src/features/monitors/components/monitors-components.tsx:84: gap-1 rounded-md px-1.5 py-0.5 text-[10px] tracking-wide
apps/frontend/src/features/monitors/components/monitors-components.tsx:99: h-4 min-w-4 rounded-sm px-1 text-[10px]
apps/frontend/src/features/monitors/components/monitors-components.tsx:111: }> = ({ series, status, height = 140, compact = false }) => {
apps/frontend/src/features/monitors/components/monitors-components.tsx:125: <svg viewBox="0 0 100 28" className="w-full" style={{ height: 28 }}>
apps/frontend/src/features/monitors/components/monitors-components.tsx:132: strokeWidth={1}
apps/frontend/src/features/monitors/components/monitors-components.tsx:139: h-32 text-xs
apps/frontend/src/features/monitors/components/monitors-components.tsx:201: w-full
apps/frontend/src/features/monitors/components/monitors-components.tsx:209: strokeWidth={0.75}
apps/frontend/src/features/monitors/components/monitors-components.tsx:220: strokeWidth={0.75}
apps/frontend/src/features/monitors/components/monitors-components.tsx:230: strokeWidth={1.25}
apps/frontend/src/features/monitors/components/monitors-components.tsx:251: w-full
apps/frontend/src/features/monitors/components/monitors-components.tsx:272: strokeWidth={1}
apps/frontend/src/features/monitors/components/monitors-components.tsx:284: strokeWidth={1}
apps/frontend/src/features/monitors/components/monitors-components.tsx:296: strokeWidth={1.5}
apps/frontend/src/features/monitors/components/monitors-components.tsx:314: fontSize={10}
apps/frontend/src/features/monitors/components/monitors-components.tsx:326: fontSize={10}
apps/frontend/src/features/monitors/components/monitors-components.tsx:336: fontSize={10}
apps/frontend/src/features/monitors/components/monitors-components.tsx:351: fontSize={10}
apps/frontend/src/features/monitors/components/monitors-components.tsx:371: gap-x-3 gap-y-2 px-4 py-3
apps/frontend/src/features/monitors/components/monitors-components.tsx:378: min-w-0
apps/frontend/src/features/monitors/components/monitors-components.tsx:379: gap-2
apps/frontend/src/features/monitors/components/monitors-components.tsx:380: text-sm
apps/frontend/src/features/monitors/components/monitors-components.tsx:384: mt-0.5
apps/frontend/src/features/monitors/components/monitors-components.tsx:386: text-xs
apps/frontend/src/features/monitors/components/monitors-components.tsx:395: h-7
apps/frontend/src/features/monitors/components/monitors-components.tsx:400: text-xs
apps/frontend/src/features/monitors/components/monitors-components.tsx:412: text-[10px] tracking-wide
apps/frontend/src/features/monitors/components/monitors-components.tsx:415: text-xs
apps/frontend/src/features/monitors/components/monitors-components.tsx:421: gap-1
apps/frontend/src/features/monitors/components/monitors-components.tsx:424: gap-0.5
apps/frontend/src/features/monitors/components/monitors-components.tsx:430: h-7 w-7
apps/frontend/src/features/monitors/components/monitors-components.tsx:435: h-3.5 w-3.5
apps/frontend/src/features/monitors/components/monitors-components.tsx:437: h-3.5 w-3.5
apps/frontend/src/features/monitors/components/monitors-components.tsx:443: h-7 w-7
apps/frontend/src/features/monitors/components/monitors-components.tsx:447: h-3.5 w-3.5
apps/frontend/src/features/monitors/components/monitors-components.tsx:481: h-full
apps/frontend/src/features/monitors/components/monitors-components.tsx:482: gap-3 p-4 pr-12
apps/frontend/src/features/monitors/components/monitors-components.tsx:483: min-w-0
apps/frontend/src/features/monitors/components/monitors-components.tsx:484: gap-2
apps/frontend/src/features/monitors/components/monitors-components.tsx:485: text-base
apps/frontend/src/features/monitors/components/monitors-components.tsx:490: mt-1 text-xs
apps/frontend/src/features/monitors/components/monitors-components.tsx:494: gap-1
apps/frontend/src/features/monitors/components/monitors-components.tsx:503: mr-1.5 h-3.5 w-3.5
apps/frontend/src/features/monitors/components/monitors-components.tsx:507: mr-1.5 h-3.5 w-3.5
apps/frontend/src/features/monitors/components/monitors-components.tsx:514: p-4 space-y-4
apps/frontend/src/features/monitors/components/monitors-components.tsx:517: pb-2
apps/frontend/src/features/monitors/components/monitors-components.tsx:518: text-sm
apps/frontend/src/features/monitors/components/monitors-components.tsx:520: gap-3 text-xs
apps/frontend/src/features/monitors/components/monitors-components.tsx:549: gap-1.5
apps/frontend/src/features/monitors/components/monitors-components.tsx:562: pb-2
apps/frontend/src/features/monitors/components/monitors-components.tsx:564: text-sm
apps/frontend/src/features/monitors/components/monitors-components.tsx:565: text-xs
apps/frontend/src/features/monitors/components/monitors-components.tsx:575: pt-0
apps/frontend/src/features/monitors/components/monitors-components.tsx:577: mt-2 text-[10px]
apps/frontend/src/features/monitors/components/monitors-components.tsx:585: pb-2
apps/frontend/src/features/monitors/components/monitors-components.tsx:586: text-sm
apps/frontend/src/features/monitors/components/monitors-components.tsx:588: ml-2 text-xs
apps/frontend/src/features/monitors/components/monitors-components.tsx:593: p-0
apps/frontend/src/features/monitors/components/monitors-components.tsx:595: px-4 py-6 text-xs
apps/frontend/src/features/monitors/components/monitors-components.tsx:603: gap-3 px-4 py-2 text-xs
apps/frontend/src/features/monitors/components/monitors-components.tsx:606: w-40
apps/frontend/src/features/monitors/components/monitors-components.tsx:610: min-w-0
apps/frontend/src/features/monitors/components/monitors-components.tsx:621: text-[11px]
apps/frontend/src/features/monitors/components/monitors-components.tsx:677: h-full
apps/frontend/src/features/monitors/components/monitors-components.tsx:678: p-4 pr-12
apps/frontend/src/features/monitors/components/monitors-components.tsx:680: text-base
apps/frontend/src/features/monitors/components/monitors-components.tsx:683: text-xs
apps/frontend/src/features/monitors/components/monitors-components.tsx:689: gap-2
apps/frontend/src/features/monitors/components/monitors-components.tsx:722: p-4 space-y-4
apps/frontend/src/features/monitors/components/monitors-components.tsx:724: text-xs
apps/frontend/src/features/monitors/components/monitors-components.tsx:725: gap-3 pt-4
apps/frontend/src/features/monitors/components/monitors-components.tsx:726: space-y-1 text-xs h-8 w-full rounded-sm px-2
apps/frontend/src/features/monitors/components/monitors-components.tsx:727: space-y-1 text-xs h-8
apps/frontend/src/features/monitors/components/monitors-components.tsx:728: space-y-1 text-xs h-8
apps/frontend/src/features/monitors/components/monitors-components.tsx:731: pt-4 space-y-3
apps/frontend/src/features/monitors/components/monitors-components.tsx:732: gap-3
apps/frontend/src/features/monitors/components/monitors-components.tsx:734: mb-1.5 text-xs
apps/frontend/src/features/monitors/components/monitors-components.tsx:750: mb-1.5 text-xs
apps/frontend/src/features/monitors/components/monitors-components.tsx:767: pb-2
apps/frontend/src/features/monitors/components/monitors-components.tsx:768: text-sm
apps/frontend/src/features/monitors/components/monitors-components.tsx:770: space-y-3
apps/frontend/src/features/monitors/components/monitors-components.tsx:772: mb-1.5 text-xs
apps/frontend/src/features/monitors/components/monitors-components.tsx:789: text-xs
apps/frontend/src/features/monitors/components/monitors-components.tsx:794: gap-3
apps/frontend/src/features/monitors/components/monitors-components.tsx:796: mb-1.5 text-xs
apps/frontend/src/features/monitors/components/monitors-components.tsx:818: mb-1.5 text-xs
apps/frontend/src/features/monitors/components/monitors-components.tsx:828: text-xs
apps/frontend/src/features/monitors/components/monitors-components.tsx:838: pb-2
apps/frontend/src/features/monitors/components/monitors-components.tsx:839: text-sm
apps/frontend/src/features/monitors/components/monitors-components.tsx:841: space-y-3
apps/frontend/src/features/monitors/components/monitors-components.tsx:842: gap-2
apps/frontend/src/features/monitors/components/monitors-components.tsx:843: pb-2 text-xs
apps/frontend/src/features/monitors/components/monitors-components.tsx:846: w-40
apps/frontend/src/features/monitors/components/monitors-components.tsx:866: w-40
apps/frontend/src/features/monitors/components/monitors-components.tsx:874: pb-2 text-xs
apps/frontend/src/features/monitors/components/monitors-components.tsx:875: w-28
apps/frontend/src/features/monitors/components/monitors-components.tsx:880: text-xs
apps/frontend/src/features/monitors/components/monitors-components.tsx:885: gap-3 pt-3
apps/frontend/src/features/monitors/components/monitors-components.tsx:886: w-40
apps/frontend/src/features/monitors/components/monitors-components.tsx:887: mb-1.5 text-xs
apps/frontend/src/features/monitors/components/monitors-components.tsx:906: pb-2
apps/frontend/src/features/monitors/components/monitors-components.tsx:907: text-sm
apps/frontend/src/features/monitors/components/monitors-components.tsx:909: space-y-3
apps/frontend/src/features/monitors/components/monitors-components.tsx:911: mb-1.5 text-xs
apps/frontend/src/features/monitors/components/monitors-components.tsx:919: text-xs
apps/frontend/src/features/monitors/components/monitors-components.tsx:921: mt-1.5 text-[11px]
apps/frontend/src/features/monitors/components/monitors-components.tsx:931: mb-1.5 text-xs
apps/frontend/src/features/monitors/components/monitors-components.tsx:934: gap-2
apps/frontend/src/features/monitors/components/monitors-components.tsx:949: gap-1.5 rounded-full px-2.5 py-1 text-xs
apps/frontend/src/features/monitors/components/monitors-view.tsx:94: ml-2
apps/frontend/src/features/monitors/components/monitors-view.tsx:110: h-4 w-4
apps/frontend/src/features/monitors/components/monitors-view.tsx:120: h-4 w-4
apps/frontend/src/features/monitors/components/monitors-view.tsx:123: h-4 w-4
apps/frontend/src/features/monitors/components/monitors-view.tsx:133: gap-1.5
apps/frontend/src/features/monitors/components/monitors-view.tsx:139: h-3.5 w-3.5
apps/frontend/src/features/monitors/components/monitors-view.tsx:167: mb-2 text-[10px] tracking-wide
apps/frontend/src/features/monitors/components/monitors-view.tsx:170: space-y-0.5
apps/frontend/src/features/monitors/components/monitors-view.tsx:179: w-full gap-2.5 rounded-md px-2.5 py-1.5 text-xs
apps/frontend/src/features/monitors/components/monitors-view.tsx:186: h-2 w-2 rounded-full
apps/frontend/src/features/monitors/components/monitors-view.tsx:189: text-[10px]
apps/frontend/src/features/monitors/components/monitors-view.tsx:199: mb-2 text-[10px] tracking-wide
apps/frontend/src/features/monitors/components/monitors-view.tsx:202: space-y-0.5
apps/frontend/src/features/monitors/components/monitors-view.tsx:211: w-full gap-2.5 rounded-md px-2.5 py-1.5 text-xs
apps/frontend/src/features/monitors/components/monitors-view.tsx:219: text-[10px]
apps/frontend/src/features/monitors/components/monitors-view.tsx:232: px-4 py-2
apps/frontend/src/features/monitors/components/monitors-view.tsx:233: gap-3 text-xs
apps/frontend/src/features/monitors/components/monitors-view.tsx:253: mb-4
apps/frontend/src/features/monitors/components/monitors-view.tsx:254: h-4 w-4
apps/frontend/src/features/monitors/components/monitors-view.tsx:255: text-xs
apps/frontend/src/features/monitors/components/monitors-view.tsx:259: min-h-0
apps/frontend/src/features/monitors/components/monitors-view.tsx:264: h-8 w-8
apps/frontend/src/features/monitors/components/monitors-view.tsx:265: text-sm
apps/frontend/src/features/monitors/components/monitors-view.tsx:277: mr-1.5 h-4 w-4
apps/frontend/src/features/monitors/components/monitors-view.tsx:311: w-full gap-0 p-0 max-w-2xl max-w-3xl
apps/frontend/src/features/monitors/model.ts:270: w-07
apps/frontend/src/features/services/components/service-metadata-sheet.tsx:93: w-full max-w-lg
apps/frontend/src/features/services/components/service-metadata-sheet.tsx:94: mb-6
apps/frontend/src/features/services/components/service-metadata-sheet.tsx:95: gap-2
apps/frontend/src/features/services/components/service-metadata-sheet.tsx:96: h-5 w-5
apps/frontend/src/features/services/components/service-metadata-sheet.tsx:105: mb-4
apps/frontend/src/features/services/components/service-metadata-sheet.tsx:106: h-4 w-4
apps/frontend/src/features/services/components/service-metadata-sheet.tsx:107: text-xs
apps/frontend/src/features/services/components/service-metadata-sheet.tsx:112: mb-4 text-sm
apps/frontend/src/features/services/components/service-metadata-sheet.tsx:113: space-y-4
apps/frontend/src/features/services/components/service-metadata-sheet.tsx:114: space-y-1
apps/frontend/src/features/services/components/service-metadata-sheet.tsx:115: text-xs gap-1
apps/frontend/src/features/services/components/service-metadata-sheet.tsx:116: h-3 w-3
apps/frontend/src/features/services/components/service-metadata-sheet.tsx:145: space-y-1
apps/frontend/src/features/services/components/service-metadata-sheet.tsx:146: text-xs gap-1
apps/frontend/src/features/services/components/service-metadata-sheet.tsx:147: h-3 w-3
apps/frontend/src/features/services/components/service-metadata-sheet.tsx:159: text-xs
apps/frontend/src/features/services/components/service-metadata-sheet.tsx:160: text-xs
apps/frontend/src/features/services/components/service-metadata-sheet.tsx:163: gap-3
apps/frontend/src/features/services/components/service-metadata-sheet.tsx:164: space-y-1
apps/frontend/src/features/services/components/service-metadata-sheet.tsx:165: text-xs gap-1
apps/frontend/src/features/services/components/service-metadata-sheet.tsx:166: h-3 w-3
apps/frontend/src/features/services/components/service-metadata-sheet.tsx:174: space-y-1
apps/frontend/src/features/services/components/service-metadata-sheet.tsx:175: text-xs gap-1
apps/frontend/src/features/services/components/service-metadata-sheet.tsx:176: h-3 w-3
apps/frontend/src/features/services/components/service-metadata-sheet.tsx:186: space-y-1
apps/frontend/src/features/services/components/service-metadata-sheet.tsx:187: text-xs gap-1
apps/frontend/src/features/services/components/service-metadata-sheet.tsx:188: h-3 w-3
apps/frontend/src/features/services/components/service-metadata-sheet.tsx:197: space-y-1
apps/frontend/src/features/services/components/service-metadata-sheet.tsx:198: text-xs gap-1
apps/frontend/src/features/services/components/service-metadata-sheet.tsx:199: h-3 w-3
apps/frontend/src/features/services/components/service-metadata-sheet.tsx:221: m-0 mt-6 gap-2 pt-4
apps/frontend/src/features/services/components/service-metadata-sheet.tsx:225: gap-1
apps/frontend/src/features/services/components/service-metadata-sheet.tsx:226: h-4 w-4
apps/frontend/src/features/services/components/services-components.tsx:15: gap-2
apps/frontend/src/features/services/components/services-components.tsx:16: h-4 w-4 rounded-sm
apps/frontend/src/features/services/components/services-components.tsx:17: h-3 w-3
apps/frontend/src/features/services/components/services-components.tsx:19: text-sm
apps/frontend/src/features/services/components/services-components.tsx:29: gap-2
apps/frontend/src/features/services/components/services-components.tsx:31: h-3 w-3
apps/frontend/src/features/services/components/services-components.tsx:41: text-sm
apps/frontend/src/features/services/components/services-components.tsx:51: h-4 w-4
apps/frontend/src/features/services/components/services-components.tsx:59: gap-1
apps/frontend/src/features/services/components/services-components.tsx:60: h-4 w-4
apps/frontend/src/features/services/components/services-components.tsx:61: h-4 w-4
apps/frontend/src/features/services/components/services-components.tsx:71: text-xs px-2 py-0.5 rounded
apps/frontend/src/features/services/components/services-metadata-sheet.tsx:110: w-full max-w-2xl
apps/frontend/src/features/services/components/services-metadata-sheet.tsx:112: mb-6
apps/frontend/src/features/services/components/services-metadata-sheet.tsx:113: gap-2
apps/frontend/src/features/services/components/services-metadata-sheet.tsx:114: h-5 w-5
apps/frontend/src/features/services/components/services-metadata-sheet.tsx:124: mb-6 gap-2 rounded-lg p-3
apps/frontend/src/features/services/components/services-metadata-sheet.tsx:126: mb-1 text-xs
apps/frontend/src/features/services/components/services-metadata-sheet.tsx:148: gap-1
apps/frontend/src/features/services/components/services-metadata-sheet.tsx:150: h-4 w-4
apps/frontend/src/features/services/components/services-metadata-sheet.tsx:157: h-4 w-4
apps/frontend/src/features/services/components/services-metadata-sheet.tsx:164: space-y-4
apps/frontend/src/features/services/components/services-metadata-sheet.tsx:168: rounded-lg p-4 w-sm
apps/frontend/src/features/services/components/services-metadata-sheet.tsx:170: mb-3
apps/frontend/src/features/services/components/services-metadata-sheet.tsx:171: gap-2
apps/frontend/src/features/services/components/services-metadata-sheet.tsx:172: h-4 w-4 rounded-sm
apps/frontend/src/features/services/components/services-metadata-sheet.tsx:173: h-3 w-3
apps/frontend/src/features/services/components/services-metadata-sheet.tsx:175: text-sm
apps/frontend/src/features/services/components/services-metadata-sheet.tsx:181: h-7 w-7 p-0
apps/frontend/src/features/services/components/services-metadata-sheet.tsx:183: h-4 w-4
apps/frontend/src/features/services/components/services-metadata-sheet.tsx:187: gap-3
apps/frontend/src/features/services/components/services-metadata-sheet.tsx:188: space-y-1
apps/frontend/src/features/services/components/services-metadata-sheet.tsx:189: text-xs gap-1
apps/frontend/src/features/services/components/services-metadata-sheet.tsx:190: h-3 w-3
apps/frontend/src/features/services/components/services-metadata-sheet.tsx:198: h-8 text-sm
apps/frontend/src/features/services/components/services-metadata-sheet.tsx:219: space-y-1
apps/frontend/src/features/services/components/services-metadata-sheet.tsx:220: text-xs gap-1
apps/frontend/src/features/services/components/services-metadata-sheet.tsx:221: h-3 w-3
apps/frontend/src/features/services/components/services-metadata-sheet.tsx:224: h-8 text-sm
apps/frontend/src/features/services/components/services-metadata-sheet.tsx:233: space-y-1
apps/frontend/src/features/services/components/services-metadata-sheet.tsx:234: text-xs gap-1
apps/frontend/src/features/services/components/services-metadata-sheet.tsx:235: h-3 w-3
apps/frontend/src/features/services/components/services-metadata-sheet.tsx:238: h-8 text-sm
apps/frontend/src/features/services/components/services-metadata-sheet.tsx:247: space-y-1
apps/frontend/src/features/services/components/services-metadata-sheet.tsx:248: text-xs gap-1
apps/frontend/src/features/services/components/services-metadata-sheet.tsx:249: h-3 w-3
apps/frontend/src/features/services/components/services-metadata-sheet.tsx:252: h-8 text-sm
apps/frontend/src/features/services/components/services-metadata-sheet.tsx:265: space-y-1
apps/frontend/src/features/services/components/services-metadata-sheet.tsx:266: text-xs gap-1
apps/frontend/src/features/services/components/services-metadata-sheet.tsx:267: h-3 w-3
apps/frontend/src/features/services/components/services-metadata-sheet.tsx:270: h-8 text-sm
apps/frontend/src/features/services/components/services-metadata-sheet.tsx:279: space-y-1
apps/frontend/src/features/services/components/services-metadata-sheet.tsx:280: text-xs gap-1
apps/frontend/src/features/services/components/services-metadata-sheet.tsx:281: h-3 w-3
apps/frontend/src/features/services/components/services-metadata-sheet.tsx:289: h-8 text-sm
apps/frontend/src/features/services/components/services-metadata-sheet.tsx:307: m-0 mt-6 gap-2 pt-4
apps/frontend/src/features/services/components/services-metadata-sheet.tsx:311: gap-1
apps/frontend/src/features/services/components/services-metadata-sheet.tsx:312: h-4 w-4
apps/frontend/src/features/services/components/services-view.tsx:69: p-0
apps/frontend/src/features/services/components/services-view.tsx:91: h-8 w-8
apps/frontend/src/features/services/components/services-view.tsx:94: text-sm
apps/frontend/src/features/services/service-detail-page.tsx:82: gap-4 pb-0
apps/frontend/src/features/services/service-detail-page.tsx:83: gap-2
apps/frontend/src/features/services/service-detail-page.tsx:85: h-8 w-8 ml-2
apps/frontend/src/features/services/service-detail-page.tsx:87: h-4 w-4
apps/frontend/src/features/services/service-detail-page.tsx:90: gap-3
apps/frontend/src/features/services/service-detail-page.tsx:91: text-2xl tracking-tight
apps/frontend/src/features/services/service-detail-page.tsx:92: rounded-full px-2.5 py-0.5 text-xs
apps/frontend/src/features/services/service-detail-page.tsx:97: gap-2
apps/frontend/src/features/services/service-detail-page.tsx:98: w-48
apps/frontend/src/features/services/service-detail-page.tsx:102: h-6 mx-1
apps/frontend/src/features/services/service-detail-page.tsx:108: gap-2
apps/frontend/src/features/services/service-detail-page.tsx:110: h-4 w-4
apps/frontend/src/features/services/service-detail-page.tsx:118: h-9 w-9
apps/frontend/src/features/services/service-detail-page.tsx:121: h-4 w-4
apps/frontend/src/features/services/service-detail-page.tsx:129: p-0
apps/frontend/src/features/services/service-detail-page.tsx:133: space-y-6
apps/frontend/src/features/services/service-detail-page.tsx:135: gap-4
apps/frontend/src/features/services/service-detail-page.tsx:136: gap-4 p-4
apps/frontend/src/features/services/service-detail-page.tsx:137: p-2 rounded-full
apps/frontend/src/features/services/service-detail-page.tsx:138: h-4 w-4
apps/frontend/src/features/services/service-detail-page.tsx:141: text-xl
apps/frontend/src/features/services/service-detail-page.tsx:144: text-xs tracking-wider
apps/frontend/src/features/services/service-detail-page.tsx:149: gap-4 p-4
apps/frontend/src/features/services/service-detail-page.tsx:150: p-2 rounded-full
apps/frontend/src/features/services/service-detail-page.tsx:151: h-4 w-4
apps/frontend/src/features/services/service-detail-page.tsx:154: text-xl
apps/frontend/src/features/services/service-detail-page.tsx:157: text-xs tracking-wider
apps/frontend/src/features/services/service-detail-page.tsx:162: gap-4 p-4
apps/frontend/src/features/services/service-detail-page.tsx:163: p-2 rounded-full
apps/frontend/src/features/services/service-detail-page.tsx:164: h-4 w-4
apps/frontend/src/features/services/service-detail-page.tsx:167: text-xl
apps/frontend/src/features/services/service-detail-page.tsx:170: text-xs tracking-wider
apps/frontend/src/features/services/service-detail-page.tsx:175: gap-4 p-4
apps/frontend/src/features/services/service-detail-page.tsx:176: p-2 rounded-full
apps/frontend/src/features/services/service-detail-page.tsx:177: h-4 w-4
apps/frontend/src/features/services/service-detail-page.tsx:180: text-xl
apps/frontend/src/features/services/service-detail-page.tsx:183: text-xs tracking-wider
apps/frontend/src/features/services/service-detail-page.tsx:191: gap-4
apps/frontend/src/features/services/service-detail-page.tsx:193: pb-2
apps/frontend/src/features/services/service-detail-page.tsx:194: text-base
apps/frontend/src/features/services/service-detail-page.tsx:195: text-xs
apps/frontend/src/features/services/service-detail-page.tsx:199: pt-0
apps/frontend/src/features/services/service-detail-page.tsx:200: <ResponsiveContainer width="100%" height={200}>
apps/frontend/src/features/services/service-detail-page.tsx:213: fontSize={11}
apps/frontend/src/features/services/service-detail-page.tsx:219: fontSize={11}
apps/frontend/src/features/services/service-detail-page.tsx:229: border: '1px solid hsl(var(--border))',
apps/frontend/src/features/services/service-detail-page.tsx:241: maxBarSize={60}
apps/frontend/src/features/services/service-detail-page.tsx:249: pb-2
apps/frontend/src/features/services/service-detail-page.tsx:250: text-base
apps/frontend/src/features/services/service-detail-page.tsx:253: text-xs
apps/frontend/src/features/services/service-detail-page.tsx:257: pt-2
apps/frontend/src/features/services/service-detail-page.tsx:258: space-y-4
apps/frontend/src/features/services/service-detail-page.tsx:267: text-sm
apps/frontend/src/features/services/service-detail-page.tsx:280: space-y-0 pb-4
apps/frontend/src/features/services/service-detail-page.tsx:281: space-y-1
apps/frontend/src/features/services/service-detail-page.tsx:282: text-base
apps/frontend/src/features/services/service-detail-page.tsx:283: text-xs
apps/frontend/src/features/services/service-detail-page.tsx:292: mr-2 h-8 gap-1
apps/frontend/src/features/services/service-detail-page.tsx:294: h-3 w-3
apps/frontend/src/features/services/service-detail-page.tsx:300: gap-y-6 gap-x-4
apps/frontend/src/features/services/service-detail-page.tsx:302: h-3.5 w-3.5
apps/frontend/src/features/services/service-detail-page.tsx:307: h-3.5 w-3.5
apps/frontend/src/features/services/service-detail-page.tsx:312: h-3.5 w-3.5
apps/frontend/src/features/services/service-detail-page.tsx:317: h-3.5 w-3.5
apps/frontend/src/features/services/service-detail-page.tsx:321: pt-2
apps/frontend/src/features/services/service-detail-page.tsx:323: h-3.5 w-3.5
apps/frontend/src/features/services/service-detail-page.tsx:331: gap-1.5
apps/frontend/src/features/services/service-detail-page.tsx:334: h-3 w-3
apps/frontend/src/features/services/service-detail-page.tsx:344: gap-3 py-8 rounded-lg
apps/frontend/src/features/services/service-detail-page.tsx:345: p-3 rounded-full w-sm
apps/frontend/src/features/services/service-detail-page.tsx:346: h-5 w-5
apps/frontend/src/features/services/service-detail-page.tsx:348: space-y-1
apps/frontend/src/features/services/service-detail-page.tsx:349: text-sm
apps/frontend/src/features/services/service-detail-page.tsx:350: text-xs max-w-[250px]
apps/frontend/src/features/services/service-detail-page.tsx:364: text-xs
apps/frontend/src/features/services/service-detail-page.tsx:388: space-y-1
apps/frontend/src/features/services/service-detail-page.tsx:389: text-[11px] tracking-wider gap-1.5
apps/frontend/src/features/services/service-detail-page.tsx:392: text-sm
apps/frontend/src/features/traces/components/traces-components.tsx:26: text-xs tracking-tight
apps/frontend/src/features/traces/components/traces-components.tsx:47: max-w-xl text-xs tracking-tight
apps/frontend/src/features/traces/components/traces-components.tsx:60: max-w-xl text-xs tracking-tight
apps/frontend/src/features/traces/components/traces-components.tsx:71: text-xs
apps/frontend/src/features/traces/components/traces-components.tsx:82: text-xs
apps/frontend/src/features/traces/components/traces-components.tsx:93: text-xs
apps/frontend/src/features/traces/components/traces-components.tsx:114: w-11 py-3
apps/frontend/src/features/traces/components/traces-components.tsx:120: h-8 w-8
apps/frontend/src/features/traces/components/traces-components.tsx:122: h-4 w-4
apps/frontend/src/features/traces/components/traces-components.tsx:129: w-64 w-72 min-h-0
apps/frontend/src/features/traces/components/traces-components.tsx:132: px-3 py-2
apps/frontend/src/features/traces/components/traces-components.tsx:133: text-[10px] tracking-wide
apps/frontend/src/features/traces/components/traces-components.tsx:141: h-7 w-7
apps/frontend/src/features/traces/components/traces-components.tsx:143: h-3.5 w-3.5
apps/frontend/src/features/traces/components/traces-components.tsx:150: min-h-0
apps/frontend/src/features/traces/components/traces-view.tsx:67: min-w-0
apps/frontend/src/features/traces/components/traces-view.tsx:69: mb-4
apps/frontend/src/features/traces/components/traces-view.tsx:93: max-w-md space-y-3
apps/frontend/src/features/traces/components/traces-view.tsx:94: text-sm
apps/frontend/src/index.css:8: --background: 0 0% 100%;
apps/frontend/src/index.css:9: --foreground: 222.2 84% 4.9%;
apps/frontend/src/index.css:12: --card: 0 0% 100%;
apps/frontend/src/index.css:13: --card-foreground: 222.2 84% 4.9%;
apps/frontend/src/index.css:14: --popover: 0 0% 100%;
apps/frontend/src/index.css:15: --popover-foreground: 222.2 84% 4.9%;
apps/frontend/src/index.css:18: --primary: 221.2 83.2% 53.3%;
apps/frontend/src/index.css:19: --primary-foreground: 210 40% 98%;
apps/frontend/src/index.css:20: --secondary: 210 40% 96%;
apps/frontend/src/index.css:21: --secondary-foreground: 222.2 84% 4.9%;
apps/frontend/src/index.css:22: --muted: 210 40% 96%;
apps/frontend/src/index.css:23: --muted-foreground: 215.4 16.3% 46.9%;
apps/frontend/src/index.css:24: --accent: 210 40% 96.1%;
apps/frontend/src/index.css:25: --accent-foreground: 222.2 47.4% 11.2%;
apps/frontend/src/index.css:26: --destructive: 0 72.2% 50.6%;
apps/frontend/src/index.css:27: --destructive-foreground: 210 40% 98%;
apps/frontend/src/index.css:28: --success: 142 72% 29%;
apps/frontend/src/index.css:29: --success-foreground: 0 0% 100%;
apps/frontend/src/index.css:30: --warning: 32 95% 36%;
apps/frontend/src/index.css:31: --warning-foreground: 0 0% 100%;
apps/frontend/src/index.css:32: --chart-1: 221 83% 53%;
apps/frontend/src/index.css:33: --chart-2: 160 70% 35%;
apps/frontend/src/index.css:34: --chart-3: 32 95% 44%;
apps/frontend/src/index.css:35: --chart-4: 270 65% 55%;
apps/frontend/src/index.css:36: --chart-5: 340 75% 48%;
apps/frontend/src/index.css:39: --border: 214.3 31.8% 91.4%;
apps/frontend/src/index.css:40: --input: 214.3 31.8% 91.4%;
apps/frontend/src/index.css:41: --ring: 221.2 83.2% 53.3%;
apps/frontend/src/index.css:44: --radius: 0.5rem;
apps/frontend/src/index.css:49: --background: 220 20% 5.882%;
apps/frontend/src/index.css:50: --foreground: 210 40% 98%;
apps/frontend/src/index.css:53: --card: 222 21.739% 9.02%;
apps/frontend/src/index.css:54: --card-foreground: 210 40% 98%;
apps/frontend/src/index.css:55: --popover: 222.2 84% 4.9%;
apps/frontend/src/index.css:56: --popover-foreground: 210 40% 98%;
apps/frontend/src/index.css:59: --primary: 217.2 91.2% 59.8%;
apps/frontend/src/index.css:60: --primary-foreground: 222.2 84% 4.9%;
apps/frontend/src/index.css:61: --secondary: 217.2 32.6% 17.5%;
apps/frontend/src/index.css:62: --secondary-foreground: 210 40% 98%;
apps/frontend/src/index.css:63: --muted: 217.2 32.6% 17.5%;
apps/frontend/src/index.css:64: --muted-foreground: 215 20.2% 65.1%;
apps/frontend/src/index.css:65: --accent: 217.2 32.6% 17.5%;
apps/frontend/src/index.css:66: --accent-foreground: 210 40% 98%;
apps/frontend/src/index.css:67: --destructive: 0 72% 65%;
apps/frontend/src/index.css:68: --destructive-foreground: 222.2 84% 4.9%;
apps/frontend/src/index.css:69: --success: 142 69% 58%;
apps/frontend/src/index.css:70: --success-foreground: 222.2 84% 4.9%;
apps/frontend/src/index.css:71: --warning: 43 96% 64%;
apps/frontend/src/index.css:72: --warning-foreground: 222.2 84% 4.9%;
apps/frontend/src/index.css:73: --chart-1: 217 91% 65%;
apps/frontend/src/index.css:74: --chart-2: 160 65% 55%;
apps/frontend/src/index.css:75: --chart-3: 43 96% 64%;
apps/frontend/src/index.css:76: --chart-4: 270 80% 75%;
apps/frontend/src/index.css:77: --chart-5: 340 85% 68%;
apps/frontend/src/index.css:80: --border: 223.333 20% 17.647%;
apps/frontend/src/index.css:81: --input: 223.333 20% 17.647%;
apps/frontend/src/index.css:82: --ring: 224.3 76.3% 94.1%;
apps/frontend/src/index.css:187: width: 8px;
apps/frontend/src/index.css:188: height: 8px;
apps/frontend/src/index.css:197: border-radius: 4px;
apps/frontend/src/index.css:218: --sidebar: hsl(0 0% 98%);
apps/frontend/src/index.css:219: --sidebar-foreground: hsl(240 5.3% 26.1%);
apps/frontend/src/index.css:220: --sidebar-primary: hsl(240 5.9% 10%);
apps/frontend/src/index.css:221: --sidebar-primary-foreground: hsl(0 0% 98%);
apps/frontend/src/index.css:222: --sidebar-accent: hsl(240 4.8% 95.9%);
apps/frontend/src/index.css:223: --sidebar-accent-foreground: hsl(240 5.9% 10%);
apps/frontend/src/index.css:224: --sidebar-border: hsl(220 13% 91%);
apps/frontend/src/index.css:225: --sidebar-ring: hsl(217.2 91.2% 59.8%);
apps/frontend/src/index.css:230: --sidebar-foreground: hsl(240 4.8% 95.9%);
apps/frontend/src/index.css:231: --sidebar-primary: hsl(224.3 76.3% 48%);
apps/frontend/src/index.css:232: --sidebar-primary-foreground: hsl(0 0% 100%);
apps/frontend/src/index.css:233: --sidebar-accent: hsl(240 3.7% 15.9%);
apps/frontend/src/index.css:234: --sidebar-accent-foreground: hsl(240 4.8% 95.9%);
apps/frontend/src/index.css:236: --sidebar-ring: hsl(217.2 91.2% 59.8%);
apps/frontend/src/index.css:263: --color-chart-1: hsl(var(--chart-1));
apps/frontend/src/index.css:264: --color-chart-2: hsl(var(--chart-2));
apps/frontend/src/index.css:265: --color-chart-3: hsl(var(--chart-3));
apps/frontend/src/index.css:266: --color-chart-4: hsl(var(--chart-4));
apps/frontend/src/index.css:267: --color-chart-5: hsl(var(--chart-5));
apps/frontend/src/index.css:268: --radius-sm: calc(var(--radius) - 4px);
apps/frontend/src/index.css:269: --radius-md: calc(var(--radius) - 2px);
apps/frontend/src/index.css:271: --radius-xl: calc(var(--radius) + 4px);
apps/frontend/src/shared/components/data-table.tsx:129: w-full min-w-0 max-w-full text-xs tracking-tight
apps/frontend/src/shared/components/data-table.tsx:131: min-w-0 gap-2 px-0 py-2
apps/frontend/src/shared/components/data-table.tsx:140: min-w-0 max-w-sm rounded-md
apps/frontend/src/shared/components/data-table.tsx:173: w-full min-w-0 max-w-full rounded-md
apps/frontend/src/shared/components/data-table.tsx:174: text-xs tracking-tight
apps/frontend/src/shared/components/data-table.tsx:180: h-8
apps/frontend/src/shared/components/data-table.tsx:183: min-w-0 px-2 py-0
apps/frontend/src/shared/components/data-table.tsx:206: px-2 py-1
apps/frontend/src/shared/components/data-table.tsx:207: min-w-0 max-w-full
apps/frontend/src/shared/components/data-table.tsx:221: h-24
apps/frontend/src/shared/components/data-table.tsx:231: gap-2 py-4
apps/frontend/src/shared/components/data-table.tsx:233: text-sm
apps/frontend/src/shared/components/data-table.tsx:238: gap-2
apps/frontend/src/shared/components/data-table.tsx:239: text-sm
apps/frontend/src/shared/components/data-table.tsx:247: h-8 w-[70px]
apps/frontend/src/shared/components/data-table.tsx:258: text-sm
apps/frontend/src/shared/components/data-table.tsx:262: gap-2
apps/frontend/src/shared/components/data-table.tsx:299: h-8
apps/frontend/src/shared/components/data-table.tsx:310: h-8 w-full min-w-0 rounded-none px-0 py-1 text-xs
apps/frontend/src/shared/components/data-table.tsx:314: min-w-0
apps/frontend/src/shared/components/data-table.tsx:315: ml-1.5 h-3.5 w-3.5
apps/frontend/src/shared/components/data-table.tsx:335: h-8 w-8 p-0
apps/frontend/src/shared/components/data-table.tsx:337: h-4 w-4
apps/frontend/src/shared/components/data-table.tsx:345: mr-2 h-4 w-4
apps/frontend/src/shared/components/environment-filter.tsx:18: space-y-2 px-0 py-2
apps/frontend/src/shared/components/environment-filter.tsx:20: text-xs
apps/frontend/src/shared/components/environment-filter.tsx:21: text-xs
apps/frontend/src/shared/components/environment-filter.tsx:22: text-xs
apps/frontend/src/shared/components/facet-explorer.tsx:32: h-full
apps/frontend/src/shared/components/facet-explorer.tsx:33: px-3 py-2
apps/frontend/src/shared/components/facet-explorer.tsx:34: text-[10px] tracking-wide
apps/frontend/src/shared/components/facet-explorer.tsx:38: min-h-0
apps/frontend/src/shared/components/facet-explorer.tsx:39: space-y-2 p-2
apps/frontend/src/shared/components/facet-explorer.tsx:62: py-4 text-xs
apps/frontend/src/shared/components/facet-explorer.tsx:96: gap-1
apps/frontend/src/shared/components/facet-explorer.tsx:101: px-2 py-1.5
apps/frontend/src/shared/components/facet-explorer.tsx:104: gap-2 text-xs
apps/frontend/src/shared/components/facet-explorer.tsx:105: h-3.5 w-3.5
apps/frontend/src/shared/components/facet-explorer.tsx:108: px-1.5 py-0 text-[10px]
apps/frontend/src/shared/components/facet-explorer.tsx:114: h-3.5 w-3.5
apps/frontend/src/shared/components/facet-explorer.tsx:115: h-3.5 w-3.5
apps/frontend/src/shared/components/facet-explorer.tsx:121: h-7 px-2 text-[10px] tracking-wide
apps/frontend/src/shared/components/facet-explorer.tsx:129: ml-2 mt-1 space-y-1
apps/frontend/src/shared/components/facet-explorer.tsx:131: px-1
apps/frontend/src/shared/components/facet-explorer.tsx:132: p-2 h-3.5 w-3.5
apps/frontend/src/shared/components/facet-explorer.tsx:137: h-7 pl-8 text-xs
apps/frontend/src/shared/components/facet-explorer.tsx:141: max-h-56 pl-1
apps/frontend/src/shared/components/facet-explorer.tsx:143: py-1 text-xs
apps/frontend/src/shared/components/facet-explorer.tsx:148: gap-2 py-1
apps/frontend/src/shared/components/facet-explorer.tsx:156: min-w-0 text-xs
apps/frontend/src/shared/components/facet-explorer.tsx:159: ml-2 px-1.5 py-0 text-[10px]
apps/frontend/src/shared/components/facet-explorer.tsx:169: mt-2
apps/frontend/src/shared/components/facet-query-bar.tsx:32: gap-1 rounded-full px-2.5 py-1 text-xs
apps/frontend/src/shared/components/facet-query-bar.tsx:38: ml-0.5 rounded-full p-0.5
apps/frontend/src/shared/components/facet-query-bar.tsx:41: h-3 w-3
apps/frontend/src/shared/components/facet-query-bar.tsx:139: left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
apps/frontend/src/shared/components/facet-query-bar.tsx:207: w-full min-w-0 max-w-full
apps/frontend/src/shared/components/facet-query-bar.tsx:209: min-h-9 w-full min-w-0 max-w-full gap-1.5 rounded-md px-2 py-1.5
apps/frontend/src/shared/components/facet-query-bar.tsx:220: min-w-0 gap-1.5
apps/frontend/src/shared/components/facet-query-bar.tsx:245: h-7 px-1 text-xs w-none
apps/frontend/src/shared/components/facet-query-bar.tsx:260: rounded-md w-lg
apps/frontend/src/shared/components/facet-query-bar.tsx:273: w-full px-3 py-1.5 text-xs
apps/frontend/src/shared/components/facet-query-bar.tsx:279: min-w-0 gap-2
apps/frontend/src/shared/components/facet-query-bar.tsx:280: text-[10px] tracking-wide
apps/frontend/src/shared/components/facet-query-bar.tsx:283: min-w-0
apps/frontend/src/shared/components/facet-query-bar.tsx:287: text-[10px]
apps/frontend/src/shared/components/feature-actions.tsx:17: size-8
apps/frontend/src/shared/components/feature-actions.tsx:23: size-4
apps/frontend/src/shared/components/feature-actions.tsx:43: gap-1.5 text-xs
apps/frontend/src/shared/components/feature-actions.tsx:45: size-4
apps/frontend/src/shared/components/feature-layout.tsx:15: min-w-0
apps/frontend/src/shared/components/feature-layout.tsx:35: gap-3 pb-3
apps/frontend/src/shared/components/feature-layout.tsx:36: min-h-10 min-w-0 gap-3
apps/frontend/src/shared/components/feature-layout.tsx:38: gap-1
apps/frontend/src/shared/components/feature-layout.tsx:40: size-5
apps/frontend/src/shared/components/feature-layout.tsx:41: min-w-0
apps/frontend/src/shared/components/feature-layout.tsx:42: text-base tracking-tight
apps/frontend/src/shared/components/feature-layout.tsx:44: text-xs
apps/frontend/src/shared/components/feature-layout.tsx:51: min-h-9 max-w-full gap-2
apps/frontend/src/shared/components/feature-layout.tsx:63: min-h-0 min-w-0 gap-3
apps/frontend/src/shared/components/feature-layout.tsx:79: min-h-0 min-w-0 max-w-full space-y-4
apps/frontend/src/shared/components/feature-layout.tsx:94: w-full max-w-full min-w-0
apps/frontend/src/shared/components/feature-layout.tsx:109: min-w-0 gap-3 space-y-0 pb-3
apps/frontend/src/shared/components/feature-layout.tsx:127: const desktop = window.matchMedia("(min-width: 1024px)");
apps/frontend/src/shared/components/feature-layout.tsx:141: if (window.matchMedia("(min-width: 1024px)").matches) return;
apps/frontend/src/shared/components/feature-layout.tsx:150: w-[min(20rem,calc(100vw-2rem))] #242936 p-0
apps/frontend/src/shared/components/feature-layout.tsx:152: p-4
apps/frontend/src/shared/components/feature-layout.tsx:158: min-h-0 p-3
apps/frontend/src/shared/components/feature-layout.tsx:166: min-h-0 px-2 w-64
apps/frontend/src/shared/components/feature-layout.tsx:169: min-h-0
apps/frontend/src/shared/components/feature-layout.tsx:177: space-y-3 p-4
apps/frontend/src/shared/components/feature-layout.tsx:178: h-8 w-48
apps/frontend/src/shared/components/feature-layout.tsx:180: h-9 w-full
apps/frontend/src/shared/components/feature-layout.tsx:188: min-h-64 gap-3 p-6 text-sm
apps/frontend/src/shared/components/feature-layout.tsx:201: p-1 size-4
apps/frontend/src/shared/components/feature-layout.tsx:206: pl-9
apps/frontend/src/shared/components/filter-multiselect.tsx:12: h-8 w-full min-w-0 rounded-sm px-2 text-xs
apps/frontend/src/shared/components/filter-multiselect.tsx:13: ml-1 size-3.5
apps/frontend/src/shared/components/filter-multiselect.tsx:16: max-h-72 w-64 max-w-[calc(100vw-2rem)]
apps/frontend/src/shared/components/telemetry-detail.tsx:39: h-7 gap-1.5 px-2 text-xs
apps/frontend/src/shared/components/telemetry-detail.tsx:47: h-3.5 w-3.5
apps/frontend/src/shared/components/telemetry-detail.tsx:49: h-3.5 w-3.5
apps/frontend/src/shared/components/telemetry-detail.tsx:74: min-w-0 py-2.5
apps/frontend/src/shared/components/telemetry-detail.tsx:78: text-[11px] tracking-wide
apps/frontend/src/shared/components/telemetry-detail.tsx:81: mt-1 min-w-0 gap-2 text-sm
apps/frontend/src/shared/components/telemetry-detail.tsx:82: min-w-0 text-xs
apps/frontend/src/shared/components/telemetry-detail.tsx:110: mb-2 gap-3
apps/frontend/src/shared/components/telemetry-detail.tsx:111: text-xs
apps/frontend/src/shared/components/telemetry-detail.tsx:112: text-xs
apps/frontend/src/shared/components/telemetry-detail.tsx:117: rounded-md
apps/frontend/src/shared/components/telemetry-detail.tsx:121: px-3 py-2 text-xs
apps/frontend/src/shared/components/telemetry-detail.tsx:133: rounded-md px-3 py-6 text-xs
apps/frontend/src/shared/components/telemetry-detail.tsx:150: rounded-md
apps/frontend/src/shared/components/telemetry-detail.tsx:154: p-2
apps/frontend/src/shared/components/telemetry-detail.tsx:156: p-4 pr-20 text-xs leading-5
apps/frontend/src/shared/components/unified-filter-sidebar.tsx:9: text-[11px] tracking-wider
apps/frontend/src/shared/components/unified-filter-sidebar.tsx:37: min-w-0 space-y-3 px-2 py-3
apps/frontend/src/shared/components/unified-filter-sidebar.tsx:68: text-[11px]
apps/frontend/src/shared/components/unified-filter-sidebar.tsx:74: text-[11px]
apps/frontend/src/shared/components/unified-filter-sidebar.tsx:80: text-[11px]
apps/frontend/src/shared/components/unified-filter-sidebar.tsx:86: text-[11px]
apps/frontend/src/shared/components/unified-filter-sidebar.tsx:94: h-7 w-full text-xs
apps/frontend/src/shared/components/unified-filter-sidebar.tsx:107: text-xs
apps/frontend/src/shared/components/unified-filter-sidebar.tsx:130: space-y-1
apps/frontend/src/shared/lib/trace-waterfall.ts:12: return { offset: 0, width: 0 };
```

</details>

# 5. Cross-cutting patterns

| Recurring pattern | Evidence | One product fix that solves many |
| --- | --- | --- |
| Apparent time scope differs from actual scope | Traces uses a recent bounded batch; Services requests environment only; Monitors timeRange is local state. [use-traces.tsx:57](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/traces/hooks/use-traces.tsx:57), [api.ts:5](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/api.ts:5), [use-monitors.tsx:34](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/hooks/use-monitors.tsx:34) | Adopt one visible time-scope contract: every displayed picker either changes the displayed query interval or is absent. |
| Missing data looks healthy/empty | Infrastructure load falls back to zero; service values fall back to zero; monitors lack evaluator data yet imply OK. [infrastructure-dashboard.tsx:219](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/infrastructure/infrastructure-dashboard.tsx:219), [service-detail-page.tsx:48](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/service-detail-page.tsx:48), [monitors-components.tsx:578](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-components.tsx:578) | Make unavailable a first-class value state everywhere, distinct from measured zero and empty results. |
| Background refresh disrupts reading | Trace loading clears rows; logs refetch on stream changes and clear on error. [use-traces.tsx:55](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/traces/hooks/use-traces.tsx:55), [use-logs.tsx:49](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/logs/hooks/use-logs.tsx:49), [use-logs.tsx:68](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/logs/hooks/use-logs.tsx:68) | Retain the current reading snapshot during background requests and identify its freshness. |
| Pointer-first detail entry | Shared table rows power Logs/Traces; MonitorRow repeats div-onClick. [data-table.tsx:199](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/data-table.tsx:199), [monitors-components.tsx:370](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-components.tsx:370) | Make the primary identifying cell a named native detail action. |
| Success feedback stronger than failure feedback | CopyButton reports success but not clipboard failure; metadata team-load recovery requires reopening. [telemetry-detail.tsx:27](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/telemetry-detail.tsx:27), [service-metadata-sheet.tsx:58](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/components/service-metadata-sheet.tsx:58) | Place a recoverable failure state next to the action that failed. |
| Operational information is too quiet | Stream state is hidden; evaluator disclosure is 10px muted; unknown-load caveat is a footnote. [feature-actions.tsx:41](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/feature-actions.tsx:41), [monitors-components.tsx:578](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-components.tsx:578), [infrastructure-dashboard.tsx:219](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/infrastructure/infrastructure-dashboard.tsx:219) | Promote trust-affecting state to the same visual tier as the value/status it qualifies. |
| Language changes during one task | Logout is German; main navigation English; monitor evaluator disclosure German. [global-header.tsx:31](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/app/components/global-header.tsx:31), [monitors-components.tsx:578](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-components.tsx:578) | Choose one UI locale per session, including validation and operational-state copy. |

### State coverage, explicitly

| Surface | Loading | Empty/no results | Error/retry | Partial/stale | Permission / invalid link |
| --- | --- | --- | --- | --- | --- |
| Metrics | Chart uses card-shaped skeleton. [metrics-view.tsx:330](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/metrics/components/metrics-view.tsx:330) | Distinguishes missing metric/filtered/hidden series. [metrics-view.tsx:344](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/metrics/components/metrics-view.tsx:344) | QueryError with retry. [metrics-view.tsx:156](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/metrics/components/metrics-view.tsx:156) | Auto label lacks last-success time. [metrics-view.tsx:115](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/metrics/components/metrics-view.tsx:115) | Wildcard falls to Metrics. [app.tsx:73](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/app/app.tsx:73) |
| Logs | Table skeleton. [logs-view.tsx:69](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/logs/components/logs-view.tsx:69) | Scoped empty copy. [logs-view.tsx:86](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/logs/components/logs-view.tsx:86) | Alert; toolbar refresh rather than inline Retry. [logs-view.tsx:62](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/logs/components/logs-view.tsx:62) | Stream state hidden. [feature-actions.tsx:41](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/feature-actions.tsx:41) | Session gate; no page-specific permission state. [app.tsx:34](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/app/app.tsx:34) |
| Traces | Rows cleared on load. [use-traces.tsx:55](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/traces/hooks/use-traces.tsx:55) | Historical empty copy overclaims absence. [traces-view.tsx:95](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/traces/components/traces-view.tsx:95) | Drawer retry for expired/unavailable trace. [trace-detail-sheet.tsx:330](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/components/shared/trace-detail-sheet.tsx:330) | Hidden stream indication. [feature-actions.tsx:41](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/feature-actions.tsx:41) | Same shared route/session handling. [app.tsx:34](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/app/app.tsx:34) |
| Services | List skeleton. [services-view.tsx:65](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/components/services-view.tsx:65) | Search miss uses ingestion-empty wording. [services-view.tsx:89](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/components/services-view.tsx:89) | QueryError retry. [services-view.tsx:71](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/components/services-view.tsx:71) | No last-success marker. [services-view.tsx:42](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/components/services-view.tsx:42) | Detail back link exists; no catalog-specific 404. [service-detail-page.tsx:85](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/service-detail-page.tsx:85) |
| Service detail | ViewSkeleton. [service-detail-page.tsx:128](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/service-detail-page.tsx:128) | Missing metrics branch is blank. [service-detail-page.tsx:362](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/service-detail-page.tsx:362) | Summary and metadata retry are separate. [service-detail-page.tsx:131](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/service-detail-page.tsx:131) | Missing values become zero. [service-detail-page.tsx:48](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/service-detail-page.tsx:48) | Unknown service is not a designed detail-empty surface. [service-detail-page.tsx:362](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/service-detail-page.tsx:362) |
| Monitors | List skeleton. [monitors-view.tsx:259](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-view.tsx:259) | Promises notification despite config-only state. [monitors-view.tsx:263](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-view.tsx:263) | Generic action error; guarded Save. [use-monitors.tsx:144](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/hooks/use-monitors.tsx:144) | Evaluator unavailable is a detail footnote. [monitors-components.tsx:578](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-components.tsx:578) | Shared session gate. [app.tsx:34](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/app/app.tsx:34) |
| Infrastructure | Explicit initial load. [infrastructure-dashboard.tsx:40](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/infrastructure/infrastructure-dashboard.tsx:40) | No hosts and select-a-host states. [infrastructure-dashboard.tsx:212](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/infrastructure/infrastructure-dashboard.tsx:212) | Automatic retry message. [use-infrastructure.ts:65](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/infrastructure/use-infrastructure.ts:65) | Keeps snapshot with stale alert. [infrastructure-dashboard.tsx:40](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/infrastructure/infrastructure-dashboard.tsx:40) | Explicit admin-only surface. [infrastructure-page.tsx:9](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/infrastructure/infrastructure-page.tsx:9) |
| Admin | No initial loading distinction. [admin-page.tsx:23](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/admin/admin-page.tsx:23) | Initial empty arrays look like zero. [admin-page.tsx:23](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/admin/admin-page.tsx:23) | Error copy without Retry. [admin-page.tsx:30](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/admin/admin-page.tsx:30) | Busy/saved notices, not dataset freshness. [admin-page.tsx:30](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/admin/admin-page.tsx:30) | Non-admin silently redirects. [admin-page.tsx:36](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/admin/admin-page.tsx:36) |
| Login | Pending submit with spinner. [login-page.tsx:86](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/auth/login-page.tsx:86) | Empty inputs are ordinary form state. [login-page.tsx:49](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/auth/login-page.tsx:49) | Alert and resubmit. [login-page.tsx:85](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/auth/login-page.tsx:85) | No telemetry freshness applicable. [login-page.tsx:36](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/auth/login-page.tsx:36) | Authentication entry, not a 404 screen. [app.tsx:20](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/app/app.tsx:20) |

No request correlation ID is rendered alongside the inspected operator query errors; do not pretend the generic retry copy explains a root cause. [logs-view.tsx:62](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/logs/components/logs-view.tsx:62), [service-detail-page.tsx:131](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/service-detail-page.tsx:131)

### Responsive inference by requested viewport

No breakpoint screenshots were rendered. These are risks deduced from declared layout, not confirmed clipping measurements.

| Width | Expected behavior / first pressure point | Evidence |
| --- | --- | --- |
| 1920 | Plenty of room, but Metrics still uses a 220px chart; many hosts remain anonymous without search. | [metrics-view.tsx:330](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/metrics/components/metrics-view.tsx:330), [infrastructure-dashboard.tsx:128](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/infrastructure/infrastructure-dashboard.tsx:128) |
| 1440 | Core shell/table layout should remain readable; long operation and metric names rely on truncation. | [traces-components.tsx:45](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/traces/components/traces-components.tsx:45), [metrics-view.tsx:169](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/metrics/components/metrics-view.tsx:169) |
| 1280 | Expanded navigation plus filter sidebar reduces chart/table working area; table scroll is the fallback. | [data-table.tsx:175](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/data-table.tsx:175), [table.tsx:9](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/components/ui/table.tsx:9) |
| 1024 | lg filter panels occupy meaningful width; monitor secondary content depends on container width, not viewport alone. | [monitors-components.tsx:371](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-components.tsx:371) |
| 768 | Infrastructure's 760px stack rule has not yet fired; service-detail header's non-wrapping outer row is a likely first pressure point. | [infrastructure.css:198](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/infrastructure/infrastructure.css:198), [service-detail-page.tsx:83](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/service-detail-page.tsx:83) |
| Below 768 | Mobile navigation exists; map stacks at 760px, but fixed 320px time popup can overflow its placement. | [app-sidebar.tsx:187](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/app/components/app-sidebar.tsx:187), [timer-range.picker.tsx:85](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/app/components/timer-range.picker.tsx:85) |

Horizontal table scroll exists; there are no sticky identifying columns in the inspected table. That is a reasonable first version, but tracking a host/service while reading far-right columns costs mental effort. [table.tsx:9](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/components/ui/table.tsx:9), [data-table.tsx:175](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/data-table.tsx:175)

# 6. Interaction & flow review

These are source-walked journeys, not timed user tests.

### Journey 1 — Investigate a latency spike

1. Open Services, find a service, follow its native link. This path works and preserves filter search context. The catalog's time picker is misleading because inventory fetching does not use the selected interval. [services-components.tsx:78](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/components/services-components.tsx:78), [api.ts:5](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/api.ts:5)
2. Choose the incident window in Service detail. Summary requests include the bounds, which is good. The visible P50/P95/P99 bar comparison shows magnitudes, not when the spike happened. Rename it to percentiles; a temporal investigation must continue elsewhere. [use-service-summary.ts:30](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/hooks/use-service-summary.ts:30), [service-detail-page.tsx:196](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/service-detail-page.tsx:196)
3. Try to open traces from a high-latency KPI. There is no local drilldown; the engineer must navigate and re-establish service context. Add a same-service/range trace action at the latency evidence. [service-detail-page.tsx:135](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/service-detail-page.tsx:135)
4. In Traces, choose the historical interval. The UI filters a fetched recent batch rather than requesting that interval. This is the journey's trust-breaking point: an empty result can mean “not fetched.” Query the chosen interval before claiming absence. [use-traces.tsx:57](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/traces/hooks/use-traces.tsx:57), [use-traces.tsx:128](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/traces/hooks/use-traces.tsx:128)
5. Open a trace and inspect nested spans. Timing ratios and attributes are useful; without a ruler the engineer mentally estimates overlaps. Add a common ruler, keeping the compact rows. [trace-detail-sheet.tsx:382](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/components/shared/trace-detail-sheet.tsx:382)
6. Look for associated logs. There is no reverse correlation action in trace detail; Logs offers trace navigation only in its list. Add a trace-ID-filtered log destination in trace detail. [trace-detail-sheet.tsx:439](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/components/shared/trace-detail-sheet.tsx:439), [logs-components.tsx:8](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/logs/components/logs-components.tsx:8)

Outcome: useful evidence is present, but the user pays navigation/context costs and cannot safely interpret a historical empty trace result.

### Journey 2 — Triage a new incident

There is no Incident screen. The real available journey starts at Monitors, not an invented incident inbox. [app.tsx:61](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/app/app.tsx:61)

1. Scan alert counts and status badges. The interface suggests evaluated monitor health. The detail then says no evaluator is connected; supplied series/events are empty. The primary surface must identify configuration-only status immediately. [monitors-view.tsx:94](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-view.tsx:94), [use-monitors.tsx:85](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/hooks/use-monitors.tsx:85), [monitors-components.tsx:578](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-components.tsx:578)
2. Open a row. A pointer works, keyboard row activation does not. Make the monitor name an explicit detail action. [monitors-components.tsx:370](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-components.tsx:370)
3. Inspect graph and state history. “No data in range” and “No state changes yet” sound like evaluated negatives, not unavailable evaluation. Name the unavailability rather than implying a calm history. [monitors-components.tsx:575](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-components.tsx:575), [monitors-components.tsx:594](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-components.tsx:594)
4. Mute or delete configuration. Delete confirmation is already correct. Mute waits for a request without a local pending state; show Muting… on the affected action, not a global frozen surface. [use-monitors.tsx:137](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/hooks/use-monitors.tsx:137), [use-monitors.tsx:147](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/hooks/use-monitors.tsx:147)
5. Move to evidence in Metrics/Logs/Traces. Monitor detail has no evaluated breach datapoint to anchor that move. Do not invent incident triage or claim detection/notification works; make the current scope explicit. [monitors-components.tsx:578](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-components.tsx:578)

Outcome: operational incident triage cannot be completed honestly in the current monitor surface. It is a saved-rule editor, not yet a trustworthy alert inbox.

### Journey 3 — Add a new monitor

1. Click New monitor. Clear entry point and titled sheet: good. [monitors-view.tsx:130](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-view.tsx:130), [monitors-view.tsx:300](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-view.tsx:300)
2. Enter name and query. A long Datadog-like expression goes into a one-line input, then separate comparator/threshold/window controls also define the condition. Show one human-readable rule preview so the author knows exactly what was configured. [monitors-components.tsx:779](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-components.tsx:779), [monitors-components.tsx:866](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-components.tsx:866)
3. Choose targets and message. The form claims template syntax support; this is not evidence of an operational delivery channel. Distinguish message configuration from validated notification delivery. [monitors-components.tsx:922](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-components.tsx:922)
4. Save. Duplicate saves are guarded, but the action label remains Create/Save while pending. Change it to Saving… for clear immediate feedback. [use-monitors.tsx:156](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/hooks/use-monitors.tsx:156), [monitors-components.tsx:717](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-components.tsx:717)
5. Inspect the new monitor. A new rule is locally assigned OK, which the operator can mistake for evaluated health. Show Not evaluated instead. [use-monitors.tsx:183](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/hooks/use-monitors.tsx:183)
6. If the engineer closes midway, there is no draft-loss confirmation. Ask only for genuinely dirty drafts. [monitors-view.tsx:300](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-view.tsx:300)

Outcome: configuration can be saved, but the author cannot verify rule meaning or operational evaluation/delivery from this experience. Don't call a saved configuration a working monitor.

# 7. Accessibility findings

This is source-backed accessibility triage, not a WCAG certification. Contrast and rendered focus visibility require browser measurement. Concrete missing semantics are stronger evidence than speculative visual failures.

| Failure / risk | Evidence | Single corrective action |
| --- | --- | --- |
| Log/trace detail cannot be opened through row keyboard activation | [data-table.tsx:199](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/data-table.tsx:199) | Add a named native detail button/link in the identifying cell. |
| Monitor detail row is a div with onClick only | [monitors-components.tsx:370](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-components.tsx:370) | Make the monitor name a native detail action. |
| Log severity has no visible text or accessible name in its empty badge | [logs-components.tsx:28](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/logs/components/logs-components.tsx:28) | Include the severity label, visually or with an accessible text companion. |
| Time picker trigger exposes no expanded/popup state | [timer-range.picker.tsx:76](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/app/components/timer-range.picker.tsx:76) | Add expanded and popup semantics matching the actual popup behavior. |
| Time entry has only a placeholder; parse error is not associated/announced | [timer-range.picker.tsx:88](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/app/components/timer-range.picker.tsx:88), [timer-range.picker.tsx:99](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/app/components/timer-range.picker.tsx:99) | Give the field a persistent accessible label and described error state. |
| Monitor form labels are not associated with their inputs | [monitors-components.tsx:734](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-components.tsx:734) | Pair each visible label and field by id/for. |
| On-call/contact/repository metadata labels are not associated | [service-metadata-sheet.tsx:165](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/components/service-metadata-sheet.tsx:165) | Pair the label and field identifiers. |
| Service back icon has no explicit accessible name | [service-detail-page.tsx:85](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/service-detail-page.tsx:85) | Name the link Back to services. |
| Service refresh icon has no title/aria-label | [service-detail-page.tsx:113](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/service-detail-page.tsx:113) | Name the button Refresh service metrics. |
| Chart-type/group/legend toggles rely on visual selection | [metrics-view.tsx:312](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/metrics/components/metrics-view.tsx:312), [metrics-components.tsx:80](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/metrics/components/metrics-components.tsx:80) | Expose the chosen/hidden state with suitable pressed/selection semantics. |
| Waterfall expand/collapse omits expanded state | [trace-detail-sheet.tsx:218](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/components/shared/trace-detail-sheet.tsx:218) | Set aria-expanded on the hierarchy toggle. |
| Charts do not offer equivalent focusable sample inspection | [metrics-view.tsx:461](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/metrics/components/metrics-view.tsx:461), [service-detail-page.tsx:200](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/service-detail-page.tsx:200) | Provide a reachable textual/data-table representation of the displayed values; Metrics already has raw rows, Service detail has percentile text. |
| Essential evaluator disclosure is 10px muted text | [monitors-components.tsx:578](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-components.tsx:578) | Move evaluator availability into the primary status, not only a caption. |
| Fixed dark Login uses theme-dependent muted text — contrast risk, not measured failure | [login-page.tsx:36](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/auth/login-page.tsx:36), [login-page.tsx:107](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/auth/login-page.tsx:107) | Put Login surface/text on the same theme token pair. |
| Global smooth scrolling lacks an inspected reduced-motion override | [index.css:110](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/index.css:110) | Disable smooth scrolling under reduced-motion preference. |
| Facet chip remove icon has a very small visible target — target-risk inference | [facet-query-bar.tsx:38](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/facet-query-bar.tsx:38) | Expand its hit area while preserving compact visual dimensions. |

The host tiles are **not** a blanket color-only or undersized-target failure: they are 24px native buttons, include warning/critical symbols, descriptive aria-labels, pressed state and focus styling. Trace drawer opener-focus restoration and FacetQueryBar combobox keyboard handling are also good and should be preserved. [infrastructure.css:92](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/infrastructure/infrastructure.css:92), [infrastructure-dashboard.tsx:166](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/infrastructure/infrastructure-dashboard.tsx:166), [trace-detail-sheet.tsx:284](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/components/shared/trace-detail-sheet.tsx:284), [facet-query-bar.tsx:174](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/facet-query-bar.tsx:174)

No live-region announcement guarantees were verified. Copy success changes the button's name/text; error alerts exist on several screens, but dynamic list refresh should not announce every incoming telemetry row. Announce state changes (paused/disconnected/stale), not a stream of raw events. [telemetry-detail.tsx:43](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/telemetry-detail.tsx:43), [feature-actions.tsx:41](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/feature-actions.tsx:41)
# 8. Prioritized backlog

Ranked by operator impact, not implementation elegance. Effort: S = localized UX correction; M = coordinated interaction/data-scope work; L = new substantial product capability. These are relative estimates, not delivery promises. Each line names one problem and one corresponding product fix.

1. [P0] Unevaluated monitors imply healthy/notifying operation — Replace primary operational status with configuration-only/Not evaluated until evidence exists; a false OK hides a response gap — S — Touches: [monitors-components.tsx:578](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-components.tsx:578) **FE-A3: fixed client fallback: absent/invalid lastEvaluatedAt yields Unknown; evaluator remains blocked-on-backend. Tests: monitors-truthfulness.test.tsx / monitors.browser.test.mjs.**
2. [P0] Historical trace selection queries only a recent batch — Request the selected interval so an empty result is trustworthy — M — Touches: [use-traces.tsx:57](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/traces/hooks/use-traces.tsx:57) **Deferred / blocked-on-backend: the trace-list route has no historical time-window contract. Not claimed resolved by this frontend pass.**
3. [P0] Unknown CPU/RAM looks like measured zero — Expose metric availability and show unavailable instead of reassuring 0% — M — Touches: [infrastructure-dashboard.tsx:219](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/infrastructure/infrastructure-dashboard.tsx:219) **FE-A2: missing/null CPU/RAM render unobserved; backend placeholder-zero ambiguity remains blocked-on-backend. Test: infrastructure.test.tsx.**
4. [P0] Metrics connects missing observations — Show gaps rather than implying measured continuity — S — Touches: [metrics-view.tsx:501](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/metrics/components/metrics-view.tsx:501) **FE-A1: client gap rendering fixed; API zero/missing distinction blocked-on-backend. Tests: metrics-truthfulness.test.tsx / metrics.browser.test.mjs.**
5. [P0] Current value is not necessarily the latest observation — Use timestamp-defined current value with explicit group/aggregation scope — M — Touches: [use-metrics.tsx:302](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/metrics/hooks/use-metrics.tsx:302) **FE-A7 resolved: newest finite timestamped visible observation, explicit group/time, deterministic ties. Tests: metrics-truthfulness.test.tsx / metrics.browser.test.mjs.**
6. [P0] Core log/trace details are pointer-only — Make each primary cell a native Open detail action so keyboard investigation works — M — Touches: [data-table.tsx:199](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/data-table.tsx:199) **FE-B1 resolved in Phase A: keyboard row activation with nested-action isolation and focus rings. Tests: data-table-layout.test.tsx / keyboard-details.browser.test.mjs.**
7. [P0] Metric sample spacing is categorical instead of elapsed time — Use a temporal axis so irregular sampling cannot distort spike duration — M — Touches: [metrics-view.tsx:471](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/metrics/components/metrics-view.tsx:471) **FE-A8 resolved: numeric epoch/time axes in Line/Area/Bar; actual dot-distance ratio tested in browser. Test: metrics.browser.test.mjs.**
8. [P1] Logs cannot pause live reading — Add pause/resume preserving reading position — M — Touches: [use-logs.tsx:68](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/logs/hooks/use-logs.tsx:68)
9. [P1] Stream connected/disconnected state is hidden — Show a compact visible stream-state indicator — S — Touches: [feature-actions.tsx:41](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/feature-actions.tsx:41)
10. [P1] Monitor rows cannot be opened by keyboard — Make monitor names native detail actions — S — Touches: [monitors-components.tsx:370](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-components.tsx:370) **FE-B1 resolved in Phase A: keyboard row activation with nested-action isolation and focus rings. Tests: data-table-layout.test.tsx / keyboard-details.browser.test.mjs.**
11. [P1] Query text and separate threshold controls have unclear combined meaning — Show one human-readable rule preview — M — Touches: [monitors-components.tsx:779](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-components.tsx:779)
12. [P1] Services time picker has no effect — Remove the picker and identify the catalog as environment-wide — S — Touches: [services-view.tsx:42](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/components/services-view.tsx:42)
13. [P1] Monitors period picker has no effect — Remove the inactive picker while evaluation history is unavailable — S — Touches: [use-monitors.tsx:34](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/hooks/use-monitors.tsx:34)
14. [P1] CSV button does nothing — Hide it until actual export exists — S — Touches: [metrics-view.tsx:565](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/metrics/components/metrics-view.tsx:565)
15. [P1] Raw-data Filter button does nothing — Remove it and keep the functioning facet controls — S — Touches: [metrics-view.tsx:562](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/metrics/components/metrics-view.tsx:562)
16. [P1] Log severity is an unnamed empty badge — Render readable severity labels — S — Touches: [logs-components.tsx:28](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/logs/components/logs-components.tsx:28)
17. [P1] Service latency has no trace drilldown — Add same-service/same-range trace navigation at latency evidence — M — Touches: [service-detail-page.tsx:135](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/service-detail-page.tsx:135) **FE-B5 resolved on the client: the link preserves service/range/environment; historical server querying remains blocked-on-backend and is disclosed in the UI.**
18. [P1] Anonymous host map lacks hostname lookup — Add hostname search with matching selection/highlight — M — Touches: [infrastructure-dashboard.tsx:128](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/infrastructure/infrastructure-dashboard.tsx:128)
19. [P1] Monitor authoring fields lack associated labels — Pair each visible field label with its input identifier — S — Touches: [monitors-components.tsx:734](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-components.tsx:734)
20. [P1] Login ignores selected light theme — Use theme-matched surface and text tokens — S — Touches: [login-page.tsx:36](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/auth/login-page.tsx:36) **FE-C2a resolved: semantic surfaces plus the existing three-way theme control are available before authentication.**
21. [P1] Missing service summary leaves a blank body — Show an explicit no-summary state with retry/context — S — Touches: [service-detail-page.tsx:362](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/service-detail-page.tsx:362) **FE-B5 resolved: explicit no-summary context and Retry; unavailable KPI values no longer become zero.**
22. [P1] Closing monitor authoring silently loses edits — Confirm dismissal only for dirty drafts — M — Touches: [monitors-view.tsx:300](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-view.tsx:300)
23. [P1] Every service receives identical telemetry icons — Hide coverage indicators until they carry real coverage evidence — S — Touches: [services-components.tsx:58](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/components/services-components.tsx:58)
24. [P1] Global-filter changes reset investigation context — Retain compatible selection/detail state across filter changes — M — Touches: [app.tsx:47](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/app/app.tsx:47) **FE-A6 resolved: no filter-key remount, trace scope pinned for retry, log selection retained; org/auth changes reset intentionally. Tests: app-shell.browser.test.mjs / platform-filters.test.ts.**
25. [P2] Service heading prints a stray 12 — Remove the stray text so the heading no longer looks corrupted — S — Touches: [service-detail-page.tsx:92](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/service-detail-page.tsx:92)

Other lower-ranked findings remain in Sections 2–7; this list intentionally caps the focus at 25 improvements. Missing incident management, service maps and dashboard builders are not smuggled into a cosmetic backlog.
# 9. What to NOT change

- Do not replace the compact host map with a bulky chart wall. Count bar → tile → selected-host evidence is a strong density pattern. [infrastructure-dashboard.tsx:106](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/infrastructure/infrastructure-dashboard.tsx:106)
- Do not restore a forced dark wrapper on Infrastructure. Its surfaces now follow the selected theme correctly in source. [infrastructure.css:8](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/infrastructure/infrastructure.css:8)
- Do not fabricate Disk/Network values or sparklines just to fill four metric slots. The current unavailable labels are honest. [infrastructure-dashboard.tsx:216](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/infrastructure/infrastructure-dashboard.tsx:216)
- Do not discard stale infrastructure snapshots on transient failures. Keeping evidence with a clear stale warning is better than a blank panel. [infrastructure-dashboard.tsx:40](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/infrastructure/infrastructure-dashboard.tsx:40)
- Do not remove raw telemetry/attribute views. They are the escape hatch when polished summaries are insufficient. [trace-detail-sheet.tsx:439](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/components/shared/trace-detail-sheet.tsx:439), [log-detail-sheet.tsx:138](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/logs/components/log-detail-sheet.tsx:138)
- Do not flatten the trace hierarchy or replace proportional span timing with generic cards. Preserve nested evidence; add temporal orientation around it. [trace-detail-sheet.tsx:166](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/components/shared/trace-detail-sheet.tsx:166), [trace-detail-sheet.tsx:255](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/components/shared/trace-detail-sheet.tsx:255)
- Do not replace native service links with clickable rows. They already support keyboard, browser navigation and preserved context. [services-components.tsx:78](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/services/components/services-components.tsx:78)
- Do not remove FacetQueryBar's arrow/Enter/Escape behavior, portal positioning or selected-filter retention in the multiselect. These are working interactions, not styling accidents. [facet-query-bar.tsx:174](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/facet-query-bar.tsx:174), [facet-query-bar.tsx:128](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/facet-query-bar.tsx:128), [filter-multiselect.tsx:9](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/filter-multiselect.tsx:9)
- Do not weaken delete confirmations or pending-save guards while polishing monitor forms. [use-monitors.tsx:147](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/hooks/use-monitors.tsx:147), [use-monitors.tsx:156](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/hooks/use-monitors.tsx:156)
- Do not rebuild the token foundation, font family or icon library. Fix specific semantic gaps and theme leaks within the established vocabulary. [index.css:94](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/index.css:94), [index.css:239](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/index.css:239)
- Do not make dense tables uniformly spacious just to look more premium. Keep compact data rows and reserve comfortable spacing for authoring forms. [data-table.tsx:204](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/shared/components/data-table.tsx:204), [monitors-components.tsx:631](C:/Users/burak/source/repos/telemetry-hub/apps/frontend/src/features/monitors/components/monitors-components.tsx:631)

The goal is a more trustworthy investigation tool, not a prettier imitation of Datadog. Preserve working density and evidence access; stop controls and status labels from promising information they do not have.

# 10. Frontend fix pass — Phase A

TASK-FE-FIX-1 · 2026-10-13. Original review ratings/evidence above describe the original baseline; the inline backlog annotations and this section describe the fixes. Backend and deployment code were not changed. No dependencies were added. Phase B was authorized later and is recorded in Section 11.

| Finding | Status | Commit | Test | Verification |
| --- | --- | --- | --- | --- |
| FE-A1 — chart gaps | Client fixed; zero/missing API ambiguity blocked-on-backend | 91f89e4 | metrics-truthfulness.test.tsx; metrics.browser.test.mjs | Null fixture breaks the real SVG line; warning remains visible. |
| FE-A2 — infrastructure unknown | Client fixed; backend placeholder zero blocked-on-backend | f2df8ee | infrastructure.test.tsx | Missing CPU renders — / unobserved; real zero retains its progress bar. |
| FE-A3 — monitor evidence | Client fixed; real evaluator blocked-on-backend | 5e21287 | monitors-truthfulness.test.tsx; monitors.browser.test.mjs | Missing/invalid evaluation time yields Unknown, not OK. |
| FE-A4 — parent navigation | Fixed | 4ea6df7 | navigation.browser.test.mjs | Services stays active on service detail in desktop/mobile; false prefixes do not match. |
| FE-A5 — invalid routes | Fixed | 96482e9 | navigation.browser.test.mjs | Invalid global/org URLs show Route not found; root/auth redirects still work. |
| FE-A6 — investigation context | Fixed | a9cfed2 | app-shell.browser.test.mjs; platform-filters.test.ts | Trace remains open after env change; retry uses original scope; lists refetch with new filters. |
| FE-A7 — Current | Fixed | 649d9d4 | metrics-truthfulness.test.tsx; metrics.browser.test.mjs | Newest timestamp wins across visible groups, with explicit group/time. |
| FE-A8 — sample spacing | Fixed | 9b1dfc9 | metrics.browser.test.mjs | One-minute/nine-minute intervals produce a 1:9 SVG dot-distance ratio. |
| FE-B1 — keyboard rows, promoted P0 | Fixed in this finding's commit | git log --grep=FE-B1 -1 | data-table-layout.test.tsx; keyboard-details.browser.test.mjs | Tab + Enter/Space opens log/trace/monitor details; nested trace/mute/delete actions do not open parent details. |

Each finding's regression was observed failing before its correction. The combined runner uses existing node:test/tsx plus an isolated installed Chromium browser; it never contacts the backend or restores a production mock-data feature.

Phase test command (repository root):

```powershell
node apps/frontend/tests/run-phase-a.mjs
```

Frontend typecheck and production build passed using installed local TypeScript/Vite executables. Yarn/Corepack could not download its executable in this environment; no package installation or lockfile change was made. Vite still warns about a minified chunk over 500 kB; no chunking redesign or warning suppression was included. No lint script/configured lint runner was available, so lint is not claimed passed. git diff --check passed.

Manual smoke path: open Traces, Tab to a row and press Enter; change the environment query parameter through browser navigation, confirm the same trace remains open and lists refresh; visit an invalid org route and confirm Route not found.

Remaining work is explicit:

- Historical trace search: blocked-on-backend and deferred, not solved by frontend filtering.
- FE-B2: absent-time fallback is implemented by FE-A3; stale-age policy/real evaluation timestamps remain deferred to the next approved pass.
- FE-B3 complete: the global logout action and its failure message now use the shell's English UI language; verified by the existing auth-reset browser path.
- FE-B4 complete: compact theme controls remain reachable in the collapsed desktop sidebar and the mobile rail; both responsive paths have browser coverage.
- FE-C2a complete: Login now uses semantic light/dark surface tokens and exposes the existing theme control; a browser test verifies both themes. Organization-field guidance remains deferred as FE-C2b.
- FE-B5 complete on the client: unavailable service KPIs render as unavailable, absent summaries have retry/context, and latency evidence links to traces with service/range/environment scope. Historic server-side trace-range correctness remains backend-dependent and visibly disclosed.
- FE-B6 complete: Admin has a distinct initial skeleton, recoverable load errors, and retry keeps the mounted form and entered values intact.
- FE-C1 complete: the intentional purple identity color now comes from a shared semantic brand token without changing its visual hue.
- FE-C2b complete: the tenant field explains which organization slug is expected and exposes that help through `aria-describedby`.
- FE-C5 complete: Services uses one search control and distinguishes a query with no matches from a genuinely empty ingestion result. FE-C4 is already covered by FE-A4 and will not be implemented twice.
- FE-C3 unit correction: invalid as stated; no concrete FacetQueryBar unit defect was identified in the review.
- All approved-list items are complete. Live logs now expose connection state and pause/resume without replacing the current reading snapshot; Infrastructure supports hostname lookup with matching selection/highlight; monitor authoring has associated core-field labels, a readable rule preview, and confirmation before discarding dirty drafts. Inert Services/Monitors time controls, CSV/Filter false affordances, unreadable log severity badges, unsupported service coverage icons, and the stray service-heading text are also resolved.

Protect unchanged: infrastructure themes/stale snapshots/unsupported Disk and Network, nested spans and raw/attribute evidence, native service links, facet keyboard controls, destructive confirmations, pending-save guards, compact density and the existing token/font/icon system.

# 11. Frontend fix pass — Phase B

TASK-FE-FIX-2 · 2026-10-14. Backend and deployment code were not changed. No dependency or lockfile changes were made.

| Finding | Status | Commit | Test | Verification |
| --- | --- | --- | --- | --- |
| FE-B3 — logout language | Fixed | 0e8887a | app-shell.browser.test.mjs | Auth reset path finds and executes the English Log out action. |
| FE-B4 — compact theme access | Fixed | 5357a67 | theme-navigation.browser.test.mjs | Theme control remains visible in collapsed desktop and mobile navigation. |
| FE-C2a — login theme, promoted | Fixed | eb39e39 | theme-navigation.browser.test.mjs | Login switches between light/dark and its surface matches the selected theme. |
| FE-B5 — service KPI evidence | Client fixed; historic trace query blocked-on-backend | d14660f | service-detail.browser.test.mjs | Unknown KPIs remain unavailable; empty summary retries; trace link preserves scope. |
| FE-B6 — Admin load recovery | Fixed | `git log --grep=FE-B6 -1` | admin.browser.test.mjs | Initial skeleton prevents false zero state; retry preserves entered form data. |

All five findings were observed failing before their corrections. The combined frontend runner passes 34/34 tests. TypeScript and the Vite production build pass; Vite retains the pre-existing warning for a minified chunk over 500 kB.

