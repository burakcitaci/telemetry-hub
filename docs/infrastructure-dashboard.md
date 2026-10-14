# TASK-INFRA-UI-1 — Compact infrastructure dashboard

## Implementation

- [x] TASK-PRE.1: Graphify precheck identifies App routing, ThemeProvider and the shared Axios client as integration points.
- [x] Reuse React/Vite, Tailwind theme variables and Radix tooltips; no new runtime dependencies.
- [x] Admin-only navigation at `/org/:tenant/infrastructure`, matching the cluster-wide backend access rule.
- [x] Compact resource totals and dense 24px square host map with 4px gaps.
- [x] Namespace-filtered Workloads, Pods/Containers and Services inventory tables.
- [x] Mouse hover and keyboard focus tooltips; buttons expose status and selection without relying on color alone.
- [x] Responsive host details: CPU and Memory use 3px progress bars; Disk and Network explicitly remain unavailable.
- [x] Three-second polling through the existing authenticated API client, single in-flight request, cleanup cancellation, hidden-tab pause and stale-snapshot warning.
- [x] CSS transitions on real updates, stable host IDs, memoized tiles and reduced-motion support.

## Data contract

Uses the cluster snapshot from `GET /api/v1/infrastructure/status`. It renders
real Nodes, Namespaces, Workloads, Pods/Containers and Services without seed
data, generated history, or synthetic sparklines.

Unavailable CPU, RAM and disk values are `null` and render as unobserved. Network
is absent from the contract. Tenant telemetry filters do not scope this
cluster-wide operator view.

The dashboard inherits the global light/dark/system theme, including tooltip surfaces and status text. The three host-map colors are scoped to the feature, as requested; dark glyphs stay readable in both themes. Selection follows UID; removed hosts fall back to the first available host and an empty snapshot clears the details.

- [x] TASK-INFRA-UI-1.2: Remove the local dark override and fixed tooltip colors; add a regression test for theme inheritance and shared tooltip tokens.

## Validation

Run workspace typechecks, the monorepo build, frontend tests, and `git diff --check`. A live Kubernetes cluster is required to verify real polling and permissions end-to-end. The unit/render tests use isolated fixtures only; no runtime demo functionality exists.

- [x] `yarn check:all`: backend and frontend typechecks pass.
- [x] `yarn build`: both apps compile; the existing main-chunk size warning remains. Dashboard JS is approximately 6.6 kB minified, 2.6 kB gzip.
- [x] All 12 frontend tests pass, including theme inheritance, polling, cancellation, malformed payloads, selection, accessibility markup and empty/stale states.
- [x] `git diff --check`: no whitespace errors.
- [x] Graphify updated: 1,652 nodes / 4,322 edges, including 28 infrastructure frontend source nodes. Community names were mechanically refreshed after the community set changed; no semantic extraction was performed for this document.
- [ ] Live browser and Kubernetes end-to-end verification (requires a running backend/cluster and an admin session).

## TASK-INFRA-UI-2 — Dashboard hierarchy

- [x] Replace the host map with a compact Node Overview card and polling-based CPU/Memory sparklines.
- [x] Use a responsive 70/30 core/details layout with sticky Host Details.
- [x] Consolidate Workloads, Pods and Services into one namespace-filtered tabbed table.
- [x] Remove nested horizontal scrolling and truncate long resource names.
- [x] Expand workload details from link-styled names instead of adding columns.
- [x] Keep missing Metrics API guidance inside Host Details.
