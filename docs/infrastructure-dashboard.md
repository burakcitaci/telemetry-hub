# TASK-INFRA-UI-1 — Compact infrastructure dashboard

## Implementation

- [x] TASK-PRE.1: Graphify precheck identifies App routing, ThemeProvider and the shared Axios client as integration points.
- [x] Reuse React/Vite, Tailwind theme variables and Radix tooltips; no new runtime dependencies.
- [x] Admin-only navigation at `/org/:tenant/infrastructure`, matching the cluster-wide backend access rule.
- [x] Slim Total Hosts / OK / Warn / Alert bar and dense 24px square host map with 4px gaps.
- [x] Mouse hover and keyboard focus tooltips; buttons expose status and selection without relying on color alone.
- [x] Responsive host details: CPU and Memory use 3px progress bars; Disk and Network explicitly remain unavailable.
- [x] Three-second polling through the existing authenticated API client, single in-flight request, cleanup cancellation, hidden-tab pause and stale-snapshot warning.
- [x] CSS transitions on real updates, stable host IDs, memoized tiles and reduced-motion support.

## Data contract

Uses the bare array from `GET /api/v1/infrastructure/status`: `id`, `hostname`, `status`, `metrics.cpu`, `metrics.ram`, `metrics.disk`. No seed data, generated history, or synthetic sparklines are introduced.

The backend returns zero CPU/RAM when Kubernetes metrics are unavailable, so the UI documents that ambiguity. Disk zero is a placeholder, not a disk measurement. Network is absent from the contract. Those two detail rows display an em dash with the reason rather than inventing values. Tenant telemetry filters do not scope this cluster-wide operator view.

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
