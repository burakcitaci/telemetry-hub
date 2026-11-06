# UI and backend improvement plan

**Task:** TASK-REPO-PLAN-1

**Date:** 2026-11-06

**Reviewed commit:** 45317816d42fbd0eb8c5a0d93aa2662b63e1683c

**Scope:** Completed behavior-preserving UI/backend implementation following the audit below. Business rules, existing data, API query semantics, and monitor evaluation are preserved.

The best next investment is a reliable UI regression baseline, consistent workspace tooling, and smaller presentation/infrastructure modules. This repository already has a coherent stack and useful regression tests; it does not need a framework rewrite, another HTTP client, or a new state-management system.

## Implementation status — TASK-REPO-PLAN-1

The audit and original roadmap below remain as the before-change baseline. Current operation and verification commands are in [operations.md](operations.md).

| Task | Implemented result |
| --- | --- |
| TASK-PLAN-01 | Root suite entry points, one-build verification sequence, GitHub CI for app checks and container smoke tests |
| TASK-PLAN-02 | Generated graphs, diagnostics and the runtime database removed from Git's index and ignored; files preserved locally; frontend graph archived outside source |
| TASK-MONO-3.1 | Root base/browser/Node TS policy, strict backend, shared ESLint/Prettier policy, one Node 24 type declaration; documented TS 6 API + TS 7 compiler compatibility |
| TASK-PLAN-03 | Readable severity labels, current preview assertions, accurate mute fixtures/route expectations, key-form selectors and more isolated browser fixtures |
| TASK-PLAN-04 | Common configurable HTTP/SSE origin, configurable CORS and dev hosts, numeric startup validation, route error recovery, key loading/retry/copy feedback |
| TASK-MONO-3.2 / 3.3 | One shared presentation folder/header, shared admin styles/error parsing/team type, accessible confirmation UI, obsolete metadata editor removed, unused Datadog examples moved to fixtures |
| TASK-PLAN-05 | All 21 strict backend diagnostics resolved; production backend now inherits strict root policy |
| TASK-PLAN-06 | Monitor graph and metric columns extracted into small presentation helpers; monitor controller moved to monitors; narrow store-read interface; backend metric/query wire types and transport URL helper extracted |
| TASK-PLAN-07 | Stable framework chunk split; largest frontend chunk 477.28 kB versus 528.20 kB; no increased warning threshold and no claimed runtime speedup |
| TASK-PLAN-08 | Production-dependency runtime stage, non-root image and backend Helm settings, container smoke verification and schema/backup/restore/capacity runbook |
| TASK-MONO-3.4 | One successful manual code-only Graphify update for this block; 34 documentation files skipped, no model key or hook required |

### TASK-MONO-4.3 — Implementation evidence

- [x] Both production applications and Vite configuration pass their typechecks; backend strict checks are enabled.
- [x] Both production builds pass. The frontend chunk warning is eliminated; framework code is separately cacheable. Total initial transfer was not benchmarked.
- [x] Final frontend suite: 64 pass, 0 failures, 0 cancellations, including clipboard success/failure, error-boundary recovery, confirmation/cancellation, keyboard navigation and investigation-scope preservation. Total distinct suite tests: 226 pass, 6 live ClickHouse skips.
- [x] Backend source tests: 146 pass (including two deployment-config tests). Isolated HTTP suite: 8 pass, 6 opt-in live ClickHouse tests skipped.
- [x] Onboarding: 3 pass. Infrastructure/restore drill: 5 pass, including WAL snapshot, checksum/conflict rejection and restoration checks.
- [x] Backend V8 coverage reporting is available through `yarn test:coverage`: 83.18% lines, 79.42% branches and 79.58% functions across loaded files. No arbitrary threshold was introduced.
- [x] Production container build and isolated startup smoke pass: UID 1000, read-only root, writable SQLite, compiler/lint/bundle tools excluded. Swagger's optional TypeScript API may remain in the dependency tree.
- [x] Helm lint and template rendering pass; no deployment performed.
- [x] All 32 SQL template expressions in MetricsService/ClickhouseService match the pre-change source after line-ending normalization. Monitor chart markup matches the original in 50 status/data/gap/render comparisons.
- [x] Current static local import scan finds no cycles; source graph coverage is 130/130 frontend and 108/108 backend files. Refreshed graph: 2,724 nodes and 6,985 edges. More complete coverage prevents a valid numeric complexity comparison against the stale graph.
- [x] Frontend production source decreases from 13,892 to 12,969 physical lines (923 fewer), including relocation of 517 example-data lines and removal of the unused 319-line metadata editor and duplicate header implementation. This is a source-size measure, not a duplication percentage.
- [x] Original runtime database checksum is unchanged; local artifacts remain on disk and no business data was migrated.
- [x] Shared lint gate passes without warnings; formatting/whitespace checks pass. Historical source formatting remains incremental as documented.

The explicit behavior decisions under TASK-DEFER-1 remain outside this implementation: historical trace completeness, SSE reconnection scope, polling cadence, real notification delivery, storage/scaling changes, and production quota/access policy.

## 1. Ist-Analyse & Audit (Phase 1)

### TASK-PRE.1 / TASK-MONO-1.1 — Architecture and dependency baseline

- [x] Read the existing Graphify graph and query its actual vocabulary.
- [x] Verify important graph findings against current source and module wiring.
- [x] Scan current local source imports for cycles and heavily shared files.
- [x] Inspect UI routes, shared components, request hooks, backend modules, storage, tests, and deployment configuration.

The graph has **2,158 nodes and 5,430 edges**, was last written on 2026-10-14, and records commit 374a9cb19d57b682c0cbc864df61bef4fd05affb. Only **122/126 frontend** and **72/103 backend** current production TypeScript source files appear in its source-file inventory. The missing backend files include most of the newer signal-monitoring implementation. Graph results are orientation, not proof that newer modules are absent.

The vocabulary-expanded BFS query used `frontend shared component api backend auth tenant ingestion clickhouse monitoring config test`. It reached 918 nodes; the CLI displayed 68 under a 2,500-token output budget. No graph rebuild was performed: this task contains no refactoring block. Graph inspection/reflect are deterministic local operations and required no separate model API calls; CLI token budgets describe output truncation, not measured model-token savings.

Current source inventory, excluding tests, generated graph folders, dependencies, and build outputs:

| Area | TypeScript files | Physical lines | Main concentration |
| --- | ---: | ---: | --- |
| Frontend | 126 | 13,892 | Monitor model 1,067; monitor components 834; UI sidebar 772; metrics view 595; metrics hook 452 |
| Backend | 103 | 6,808 | Metrics service 986; ClickHouse service 720; platform store 248 |

Line counts include comments and blank lines; they indicate review scope, not defect counts. A static local import scan, resolving relative imports and the frontend `@/` alias, found **no file-level cycles**. This scan is not a complete runtime/dependency-injection or computed-import analysis.

The most widely imported current files include Button and `cn` (31 imports each), backend auth types (25), and the API client, PlatformStore, and ClickhouseService (16 each). Treat these as shared foundations requiring broader regression checks. High fan-in is expected for primitives; it is not by itself a reason to split them.

Architecture today:

```text
apps/frontend/src
  app                      routes, auth/theme providers, navigation
  features                 services, metrics, logs, traces, monitors, admin, infrastructure
  components/ui            Radix-based UI primitives
  components/shared        shell/header/filter/presentation primitives
  shared                   API transport, hooks, types, filters, layout, tables

apps/backend/src
  main / app.module        bootstrap, validation, HTTP policies, module composition
  modules/auth             sessions, admin, metadata, shared SQLite control-plane store
  modules/ingestion        API-key identity and OTLP gateway
  modules/telemetry        tenant-scoped ClickHouse reads and live invalidation
  modules/monitors         scheduler, signal adapters, state, persistence, notifications
  modules/infrastructure   Kubernetes inventory and usage
  modules/health           liveness and ClickHouse readiness

infra                      local Kind workflow and Helm chart
```

There is **one frontend application**, not several isolated frontend stacks. Browser/backend separation is intentional. Existing feature boundaries are a useful starting point.

### TASK-MONO-1.2 / TASK-MONO-1.3 — Technology and configuration alignment

| Concern | Current evidence | Assessment |
| --- | --- | --- |
| Workspace | Root Yarn 1.22.22 workspaces include `apps/*`; one lockfile | Preserve this unless a separate package-manager migration is justified. |
| UI | React 19, Router 7, Tailwind 4, Radix, TanStack Table, Recharts | One coherent stack; no competing frontend framework found. |
| Requests/state | One Axios instance, EventSource, React hooks/context, URL filters | Preserve shared transport and URL scope. No evidence warrants adding another state library. |
| Backend | NestJS core/common/platform-express all declared at 12.1.2 | Core Nest declarations are aligned. Different OTel package version families alone do not prove drift. |
| TypeScript | Root and backend declare `^7.0.2`; frontend inherits tool availability through hoisting | Tool ownership can be clearer; no declared TypeScript version conflict. |
| Node types | Root `@types/node ^24.9.1`; backend `^26.6.4`; runtime reviewed on Node 24.19.0 | Real major-version drift; installed root resolution is 26.6.4. Align declarations with the supported runtime. |
| TS configuration | Frontend main config does not extend root; backend extends root but disables strict/null/implicit-any checks | Root strictness is not an enforced baseline. Root also mixes browser JSX/DOM options and backend decorator options. |
| Lint/format | No tracked ESLint/Prettier configuration or scripts found | Add shared configuration with staged enforcement. Existing lint-disable comments currently have no root lint gate. |
| Test entry points | Frontend has tests but no package test script; backend default test glob covers `src`, not `tests` | Important suites are easy to omit. No tracked CI workflow was found. |

Evidence: [root manifest](../package.json), [frontend manifest](../apps/frontend/package.json), [backend manifest](../apps/backend/package.json), [base TS config](../tsconfig.base.json), [frontend TS config](../apps/frontend/tsconfig.json), [backend TS config](../apps/backend/tsconfig.json).

Declared ranges and locally installed versions are different concepts. For example, React is declared as `^19.2.0` and locally resolves to 19.3.0; Vite is declared as `^7.1.12` and resolves to 7.3.6. This is permitted by the declarations and is not evidence of multiple conflicting installations. A clean frozen-lockfile install was not verified.

### TASK-UI-AUDIT-1 — UI findings

Priority P1 means address before broad structural work; P2 means follow after a trustworthy baseline. These are engineering priorities, not measured usability scores.

| ID | Priority | Finding and impact | Source evidence |
| --- | --- | --- | --- |
| UI-01 | P1 | Log severity badges render empty, rotated badges without severity text or an accessible label. Operators and assistive technology lose an important distinction. Restore readable text/accessibility while preserving severity mapping. | [logs-components.tsx](../apps/frontend/src/features/logs/components/logs-components.tsx), `severityBadge`, line 32; failing truthful-affordances test |
| UI-02 | P1 | The API and SSE origin is hard-coded to localhost despite `VITE_BACKEND_URL` typing and error text. A deployed browser would contact its own localhost. Make transport configuration explicit, preserving local defaults, credentials, filters, and paths. | [client.ts](../apps/frontend/src/shared/api/client.ts), line 12; [event-stream.ts](../apps/frontend/src/shared/api/event-stream.ts), line 7; [vite-env.d.ts](../apps/frontend/src/vite-env.d.ts) |
| UI-03 | P1 | The router uses Suspense but has no React error boundary. The keyboard test demonstrates a MonitorRow render exception can blank its fixture page. Add route-level recovery without swallowing diagnostics. The particular test exception follows an incorrect fixture response, so it does not prove valid production mute responses crash. | [app.tsx](../apps/frontend/src/app/app.tsx); [browser-fixture.tsx](../apps/frontend/tests/browser-fixture.tsx), monitor response branch; [monitors-components.tsx](../apps/frontend/src/features/monitors/components/monitors-components.tsx), comparator rendering |
| UI-04 | P2 | Ingestion-key loading initially resembles an empty list; its clipboard promise has no success/failure feedback. This is weaker than the shared retry/status pattern used elsewhere. | [ingestion-keys-panel.tsx](../apps/frontend/src/features/admin/ingestion-keys-panel.tsx), lines 23–27, 57, 68 |
| UI-05 | P2 | Shared presentation is split between `components/shared` and `shared/components`; both export a different FeatureHeader. Two service metadata sheets export the same component name; the plural-file version has no source importer in this scan. This increases maintenance ambiguity. | [feature-layout.tsx](../apps/frontend/src/shared/components/feature-layout.tsx), line 27; [feature-header.tsx](../apps/frontend/src/shared/components/feature-header.tsx), line 20; service feature `components/*metadata-sheet.tsx` |
| UI-06 | P2 | Admin and ingestion-key panels duplicate error parsing/style strings, mix German and English, and use native confirm dialogs alongside existing Radix dialogs elsewhere. Standardize presentation and focus behavior without changing mutation payloads or confirmation requirements. | [admin-page.tsx](../apps/frontend/src/features/admin/admin-page.tsx), lines 87, 103, 111; [ingestion-keys-panel.tsx](../apps/frontend/src/features/admin/ingestion-keys-panel.tsx), lines 43, 73; [errors.ts](../apps/frontend/src/shared/lib/errors.ts) |
| UI-07 | P2 | Large monitor/metrics files combine forms, charts, mapping, request state, and presentation. The 1,067-line monitor model also exports Datadog example records with no source reference found. Extract presentation and relocate confirmed-unused examples to test fixtures after usage verification. | [monitor model](../apps/frontend/src/features/monitors/model.ts), line 86; [monitor components](../apps/frontend/src/features/monitors/components/monitors-components.tsx); [metrics hook](../apps/frontend/src/features/metrics/hooks/use-metrics.tsx) |
| UI-08 | P2 | Production build reports a 528.20 kB JS chunk and a 346.56 kB chart chunk (171.79/102.79 kB gzip). Routes are already lazy-loaded. Measure import composition and loading before choosing additional splits. | Actual Vite build; [app.tsx](../apps/frontend/src/app/app.tsx), lines 19–29 |

UI conclusions are based on source and the existing isolated Chromium suite. No manual screenshot review, assistive-technology session, contrast measurement, or production latency measurement was performed. Mobile/theme/navigation coverage exists and several tests pass; do not infer pixel-level polish from that alone.

### TASK-BACKEND-AUDIT-1 — Backend and operations findings

| ID | Priority | Finding and impact | Source evidence |
| --- | --- | --- | --- |
| BE-01 | P1 | Backend disables several core strict checks. An explicit diagnostic-only strict run reports **21 diagnostics**, including nullable configuration, DTO initialization, JWT claims, cached infrastructure, and Kubernetes clients. Passing today's typecheck does not establish strict type safety. | [backend TS config](../apps/backend/tsconfig.json), lines 17–20; audit command in Phase 4 |
| BE-02 | P1 | Test discoverability is incomplete and CI is absent from tracked files. Decorator-sensitive source tests require backend cwd/config; HTTP integration tests require a compiled build. Encode that ordering in scripts. | [backend manifest](../apps/backend/package.json), line 10; [bootstrap integration](../apps/backend/tests/bootstrap.integration.test.ts); [frontend runner](../apps/frontend/tests/run-phase-a.mjs) |
| BE-03 | P1 | `apps/backend/data/platform.sqlite` is tracked. Root ignore patterns do not remove an already tracked file. Its contents were not inspected; sensitivity is unverified. Establish provenance, preserve the local database, and replace tracked runtime state with synthetic fixtures where needed. | Git tracked-file inventory; [.gitignore](../.gitignore); [PlatformStore](../apps/backend/src/modules/auth/platform-store.service.ts), line 35 |
| BE-04 | P2 | MetricsService and ClickhouseService combine transport, schema preparation, query construction, normalization, discovery, and aggregation. PlatformStore also covers several control-plane domains. Extract transport/row types first; leave SQL, tenant predicates, aggregation, and state transitions intact. | [metrics.service.ts](../apps/backend/src/modules/telemetry/services/metrics.service.ts); [clickhouse.service.ts](../apps/backend/src/modules/telemetry/services/clickhouse.service.ts); [platform-store.service.ts](../apps/backend/src/modules/auth/platform-store.service.ts) |
| BE-05 | P2 | MonitorsModule owns a controller physically stored under auth, while auth's store depends on monitor persistence. There is no detected import cycle, but physical ownership obscures boundaries. Relocate the controller and add explicit store interfaces before considering a larger storage split. | [monitors.module.ts](../apps/backend/src/modules/monitors/monitors.module.ts), line 4; [platform-store.service.ts](../apps/backend/src/modules/auth/platform-store.service.ts), lines 10–11 |
| BE-06 | P2 | App/ClickHouse numeric config uses `parseInt(...) || default`, CORS has a fixed development-origin list, and Vite allows every host. Configuration should validate and distinguish local from deployment settings. Preserve documented defaults and test malformed settings. | [app.config.ts](../apps/backend/src/config/app.config.ts); [clickhouse.config.ts](../apps/backend/src/config/clickhouse.config.ts); [cors.config.ts](../apps/backend/src/config/cors.config.ts); [vite.config.ts](../apps/frontend/vite.config.ts) |
| BE-07 | P2 | The backend runtime image copies the entire builder node_modules tree; it has no USER directive. Helm defaults allow root and writable root filesystems. Produce a reproducible, production-dependency-only image, then verify non-root execution and PVC ownership before tightening deployment settings. | [Dockerfile](../apps/backend/Dockerfile), runtime stage; [values.yaml](../infra/charts/observability/values.yaml), lines 75–79 |
| BE-08 | P2 | SQLite schemas are established in constructors and ClickHouse tenant columns are added lazily on reads. Existing migration/history tests and backup tooling are useful, but schema lifecycle and restore guarantees need an explicit inventory/runbook. Plan this first; moving DDL out of reads is a separate higher-risk change. | [PlatformStore](../apps/backend/src/modules/auth/platform-store.service.ts), line 38; [clickhouse.service.ts](../apps/backend/src/modules/telemetry/services/clickhouse.service.ts), lines 622–638; [migration tool](../infra/kind/migrate-platform-store.mjs) |

Additional operational constraints are real, but should not trigger unsolicited architecture replacements: SQLite uses synchronous operations and the chart explicitly enforces one backend replica with Recreate for persistent storage. The SSE controller runs two ClickHouse signal queries per connection every three seconds. Measure event-loop delay, connection counts, query duration, and scheduler cycle time under expected load before changing storage or scheduling.

### TASK-AUDIT-HYGIENE-1 — Generated artifacts and stale documentation

- Graphify snapshots/memory are already tracked, including a second graph under frontend source. A Vite test scan actually discovered `apps/frontend/src/graphify-out/graph.html` as an HTML entry. Generated graph output should be outside source and ignored by normal build/test discovery. Apply AGENTS.md's local-only policy; do not add generated files to future commits by default.
- `apps/frontend/errors.txt` is tracked. Classify it as historical diagnostics before retaining it as a source artifact.
- Earlier `UI_REVIEW.md` and `BACKEND_REVIEW.md` are historical reviews. Some findings have been fixed; update their status links rather than treating every old finding as open.
- Existing duplicate list-limit normalization is similar but **not identical**: ClickhouseService explicitly handles non-finite numbers, while MetricsService uses a simpler clamp. Do not blindly deduplicate these helpers and accidentally alter behavior.

### Improvements already present — preserve them

- Shared Axios transport, canonical URL filter helpers, feature layouts, reusable tables, theme tokens, and lazy routes.
- Explicit missing-data handling and live-log pause/resume; useful keyboard/mobile/theme regression tests.
- Mandatory organization-scoped query checks, parameterization, query budgets, session revocation, origin checks, and trusted ingestion identity headers.
- Actual `/health/ready` database check wired into Helm, distinct from liveness.
- Weighted histogram calculations with explicit overflow uncertainty; tests confirm no per-observation expansion.
- An operating monitor scheduler, injected signal adapters, persistence/concurrency tests, transition history, and retention. The configured notifier is deliberately a DummyNotifier; it is not an external delivery system.

## 2. Harmonisierungs-Strategie (Phase 2)

### TASK-MONO-2.1 — Target architecture

Keep React/Vite, NestJS, Axios, URL-driven filters, ClickHouse, and the existing single-node control plane. Establish these dependency directions:

```text
frontend app -> feature pages -> feature views/hooks/API -> shared browser transport
                           -> shared presentation -> UI primitives

backend controllers -> existing domain services -> narrow persistence/transport interfaces
backend composition root -> concrete implementations and lifecycle wiring
```

Use one frontend ownership convention: primitives under `components/ui`, reusable presentation under `shared/components`, browser utilities/hooks/transport under `shared`, and feature-specific behavior under `features`. Business mappers and monitor parsers stay in their feature/domain.

Split root TypeScript policy into an environment-neutral base plus browser and Node/Nest variants. Apps extend the appropriate variant. Keep frontend `@/` local; use explicit workspace names for future packages rather than exposing the same alias across applications. Root lint/format configurations should be shared; intentional environment-specific rules remain explicit.

### TASK-MONO-2.3 — Shared package decision

Do not create three speculative packages for a single UI. First consolidate within the existing shared folders. If a second genuine consumer appears, extend workspaces to `packages/*` and consider:

| Candidate | Extraction trigger | Boundary |
| --- | --- | --- |
| `packages/ui` | A second UI consumes the same stable primitives | Pure components/tokens; no app router, auth, tenant, or telemetry rules |
| `packages/contracts` | Repeated API shape drift is demonstrated by contract tests | Wire types/schema only; no Nest runtime, SQLite, or monitor evaluation logic |
| `packages/api-client` | A second browser consumer needs the same transport | Injectable base URL, credentials, scope, and redirect handling; avoid global window access in the package |
| `packages/shared-utils` | Identical pure helpers have multiple consumers | Environment-neutral functions; no SQL/auth/time-window semantics without equivalence tests |

The current dependency drift should be fixed in the existing workspace manifests; package creation is not a prerequisite.

### TASK-MONO-2.2 — Ordered roadmap

Effort is an initial engineering estimate, not a delivery commitment. Execute each row as a small reviewable change, with lower-regression-risk work first. Rows do not authorize business-rule changes.

| Order / task | Work and linked findings | Effort | Risk | Depends on | Done when |
| --- | --- | --- | --- | --- | --- |
| 1 — TASK-PLAN-01 | Expose frontend, backend unit, compiled HTTP, infrastructure, and opt-in ClickHouse test commands; record known UI failures; establish CI. BE-02 | 1–2 days | Low | None | One documented root check sequence covers every suite; skipped/live requirements are explicit. |
| 2 — TASK-PLAN-02 | Classify tracked SQLite/diagnostics/graph output; preserve data, move generated output outside source, update ignore and discovery rules. BE-03, HYGIENE-1 | 0.5–1 day | Low–medium | None | No runtime DB/generated graph is in outgoing changes; local data remains intact; Vite scans only intended entries. |
| 3 — TASK-MONO-3.1 | Align Node type declarations, centralize lint/format and base/browser/backend TS config, retain current strictness until diagnosed fixes land. BE-01 | 1–2 days | Low–medium | 1 | Equivalent builds; shared policy inherited; no duplicate core type declaration ranges; CI checks actual configured projects. |
| 4 — TASK-PLAN-03 | Triage UI failures; correct demonstrably stale fixtures/assertions, preserve keyboard checks and add readable severity text. UI-01 | 1–2 days | Low–medium | 1 | Preview/dirty-draft behavior is tested through controls; mute mock matches current POST response; severity is readable; unresolved failures have reproductions. |
| 5 — TASK-PLAN-04 | Configure API/SSE origin and deployment CORS; add route error recovery and key-loading/copy feedback. UI-02–04, BE-06 | 1–2 days | Medium | 1, 3, 4 | Local behavior preserved; alternate-origin HTTP and SSE tests pass; error/retry states work without dropping scope. |
| 6 — TASK-MONO-3.2 / 3.3 | Consolidate headers, error presentation, metadata sheets, styles and confirmation UI; remove verified dead examples; update imports. UI-05–07 | 2–3 days | Medium | 3, 4 | One canonical implementation per verified duplicate; no mutation/API changes; focus, keyboard, theme, and mobile checks pass. |
| 7 — TASK-PLAN-05 | Resolve 21 backend strict diagnostics with types, explicit initialization, or equivalent narrowing; enable strict checks. BE-01 | 1–2 days | Medium | 1, 3 | Strict backend check passes without broad any/suppression workarounds; output and validation contracts remain unchanged. |
| 8 — TASK-PLAN-06 | Split UI presentation and backend transport/config types; move monitor controller to its owning folder; retain all domain implementations. UI-07, BE-04–05 | 2–4 days | Medium | 4, 5, 7 | Public exports/DI resolve; exact SQL, parameters, response shapes, state transitions, and lifecycle behavior are preserved. |
| 9 — TASK-PLAN-07 | Establish bundle/load baseline; split verified expensive imports; self-host font assets if deployment requires it. UI-08 | 1–2 days | Low–medium | 4, 6 | Measured initial JS improves; chart rendering/routes stay correct; no warning-threshold-only workaround. |
| 10 — TASK-PLAN-08 | Optimize runtime image; verify non-root deployment/PVC access; document backups, restore, schema ownership, capacity and local-vs-production values. BE-07–08 | 2–3 days | Medium | 1, 7, 8 | Container smoke tests and isolated restore drill pass; deployment rollback and single-replica constraints are documented. |

## 3. Inkrementelle Ausführung & Refactoring (Phase 3)

### TASK-SCOPE-1 — Business-logic preservation contract

This document is the only intended deliverable change. Implementation tasks above are proposals. Future refactoring must preserve:

- Authentication, roles, session duration/revocation, organization isolation, and optional team/service/environment/status filtering.
- API routes, status codes, envelope shapes, DTO validation, numeric units, missing-data semantics, ordering, limits, and pagination.
- SQL text/predicates/parameters and query budgets when moving query code.
- Monitor parsing, thresholds, evaluation windows, state transitions, muting, notification policy, persistence atomicity, historical migration, and scheduler timing.
- Existing user data, secrets, local cluster configuration, and database files.

### TASK-DEFER-1 — Findings requiring a separate behavior decision

These deserve follow-up but are excluded from the behavior-preserving refactoring sequence:

| Topic | Verified current behavior | Separate decision needed |
| --- | --- | --- |
| Trace history completeness | `getTraces` sends a recent-record limit without from/to; `useTraces` filters the returned list by time locally | Define historical server query/pagination/search semantics before promising complete time-range results. |
| Filter changes and SSE | EventSource scope is constructed at connection creation; `useTelemetryStream` mounts it once while filter-dependent lists can refresh | Decide reconnection/scope invalidation behavior and characterize cross-filter updates; changing it affects request behavior. |
| Polling/cancellation | Logs/traces use request IDs and metrics uses cancellation booleans; several newer hooks use AbortController; backend SSE polls per connection | Preserve correctness now. Changes to cancellation, refresh cadence, hidden-tab behavior or shared fan-out need explicit behavior/performance tests. |
| Notification delivery | DummyNotifier is the configured notifier | Adding durable retries or real external delivery changes operational semantics. |
| Persistence/scaling | Single-replica synchronous SQLite and lazy ClickHouse schema preparation | External database, asynchronous storage, more replicas or migration orchestration need a dedicated design and data-migration plan. |
| Production access/capacity | Chart explicitly configures passwordless local ClickHouse; ingestion has a body limit and timeout but no general admission quota in inspected middleware | Define a production deployment/access/quota policy. Do not silently change local bootstrap or authorization rules in cleanup work. |

Evidence: [trace API](../apps/frontend/src/features/traces/api.ts), [trace hook](../apps/frontend/src/features/traces/hooks/use-traces.tsx), [stream hook](../apps/frontend/src/shared/hooks/use-telemetry-stream.ts), [events controller](../apps/backend/src/modules/telemetry/controllers/events.controller.ts), [monitor wiring](../apps/backend/src/modules/monitors/monitors.module.ts), [ClickHouse deployment](../infra/charts/observability/templates/clickhouse-deployment.yaml), [ingestion gateway](../apps/backend/src/modules/ingestion/ingestion.middleware.ts).

### Reusable refactoring block checklist

This is a reusable checklist for future blocks; the completed implementation evidence is recorded above.

- [ ] TASK-PRE.1: Read the graph once before each coherent implementation block, then verify newer relevant source.
- [ ] Establish characterization checks for the contracts touched by that block.
- [ ] Shared TS/lint configurations live at root; apps inherit environment-appropriate settings.
- [ ] Align genuine shared dependency versions; retain compatible intentionally different packages.
- [ ] Extract only verified duplicate logic; preserve edge-case behavior rather than assuming similarity means equivalence.
- [ ] Extracted UI is pure or receives explicit interfaces; feature/domain rules remain owned by their feature.
- [ ] New or extracted methods follow the repository's maximum-20-line guideline without obscuring the domain flow.
- [ ] Aliases remain unambiguous; no frontend-to-backend implementation imports are introduced.
- [ ] Run focused tests while editing and the complete relevant suites/build once at block end.
- [ ] TASK-MONO-3.4: Run exactly one manual `graphify . --update` at block end; no post-commit hook. Repeat within a block only for an otherwise unresolvable concrete dependency question.
- [ ] Review updated directed source dependencies for cycles. Do not demand a literal tree: intentional reuse makes this a directed acyclic graph, not a tree.
- [ ] Inspect complete diff and outgoing commit range; exclude generated Graphify output. Push only if separately requested and checks pass with a clean working tree.

## 4. Validierung & Qualitäts-Check (Phase 4)

### TASK-MONO-4.1 / TASK-MONO-4.2 — Initial audit checks (historical)

| Check | Observed result | Boundary |
| --- | --- | --- |
| Frontend TypeScript | PASS | Current configuration only; includes source, not frontend test files. |
| Backend TypeScript | PASS | Current config disables strict checks. |
| Diagnostic backend strict run | 21 diagnostics | No configuration or source changed for this check. |
| Backend TypeScript emit + esbuild bundle | PASS | Bundled app 257.5 kB; generated dist output only. |
| Frontend Vite production build | PASS with chunk warning | Largest emitted JS chunk 528.20 kB; no measured runtime performance claim. |
| Backend source tests | 144 passed, 0 failed | Correct backend cwd; local mock-server access required. |
| Backend tests-directory suite | 8 passed, 6 skipped, 0 failed | Includes compiled startup/DI and HTTP fixtures. Six live ClickHouse cases intentionally not enabled. |
| Frontend existing full runner | 62 tests: 56 passed, 5 failed, 1 cancelled | Failure triage below; this is not a green UI baseline. |
| Fresh install / vulnerability audit | Not performed | Corepack could not reach registry.yarnpkg.com in the restricted environment; installed dependencies were used directly. |
| Live cluster / real ClickHouse / deployed UI | Not exercised | No deployment or live-data mutation performed. |
| Coverage percentage | Not measured | Existing suite breadth does not establish line/branch coverage. |

An initial backend command run from repository root failed decorator transformation because tsx did not select the backend tsconfig. The corrected backend-cwd run resolved those errors. Sandboxed loopback access also initially caused EACCES; backend tests passed when rerun with local-server access. These initial environment/invocation failures are not counted as application defects. The initial restricted UI run was interrupted after similar harness failures; the table reports the later completed run.

Frontend failure interpretation:

| Test | Observed evidence | Next action |
| --- | --- | --- |
| Ingestion key generation | Timed out waiting for generated-key output; test waits for panel heading before filling its team select | Capture actual selected option, validation state and submitted request; check async teams readiness before blaming the API. |
| Keyboard detail/mute flow | Waits for `/monitors/monitor-a`, but app sends POST `/monitors/monitor-a/mute`; fixture only returns a single monitor for PUT and returns an array for POST, causing `comparator.replace` to throw | Fix response fixtures and request expectation; preserve real keyboard interaction checks. Production API returns a monitor for the legacy mute route. |
| Dirty-monitor browser test | Fails on old `Rule preview` text before reaching discard checks | Current UI says `Missing data and preview` and `Preview against real data`; test the actual preview/discard interaction. Dirty-draft confirmation code exists. |
| Monitor-authoring source test | Same obsolete text assertion and markup expectations | Replace brittle source-text checks with user-visible form/preview/dirty-state checks. |
| Service search browser test | Cancelled on test timeout | Reproduce in isolation and inspect browser startup/cleanup and page state; no root cause established. |
| Compact row source test | Expected severity text is missing; source contains empty rotated badges | Confirmed current UI accessibility/readability gap, UI-01. |

Historical audit commands below predate the compiler API alias. Use `yarn verify` and the operations runbook for the current implementation:

```powershell
# Repository root: type checks
node node_modules/typescript/bin/tsc --project apps/frontend/tsconfig.json --noEmit --incremental false
node node_modules/typescript/bin/tsc --project apps/backend/tsconfig.json --noEmit --incremental false

# apps/backend: current build and tests
node ../../node_modules/typescript/bin/tsc
node ../../node_modules/esbuild/bin/esbuild dist/main.js --bundle --platform=node --format=esm --packages=external --outfile=dist/app.js
node --import tsx --test "src/**/*.test.ts"
# Run after the build; TEST_KIND_CLICKHOUSE was set to 0 for this audit.
node --import tsx --test "tests/**/*.test.ts"

# apps/backend: diagnostic strictness check, no edits/emission
node ../../node_modules/typescript/bin/tsc --noEmit --incremental false --strict true --noImplicitAny true --strictNullChecks true --strictBindCallApply true

# apps/frontend: production bundling, following root frontend typecheck
node ../../node_modules/vite/bin/vite.js build

# Repository root: existing frontend suite
node apps/frontend/tests/run-phase-a.mjs
```

### TASK-MONO-4.3 — Original success measures and rollback

The completion evidence above records the achieved implementation results. Test fixtures continue to execute through tsx; strict checking applies to production and configuration projects.

- [ ] First make the frontend baseline green or explicitly quarantine only reproduced harness problems with owner, reason, and expiry; never remove a valid failing accessibility assertion to obtain green CI.
- [ ] Preserve backend's 144 passing source tests and 8 passing isolated integration tests; run opt-in ClickHouse tests in an isolated disposable environment before query-related work.
- [ ] Eliminate the 21 strict diagnostics and Node type declaration drift; typecheck test/config projects as well as production source.
- [ ] Record verified duplicate implementations removed, source import cycles, contract-test results, bundle bytes, and high-fan-in files before/after. No duplicate-reduction percentage is claimed without a detector baseline.
- [ ] Add focused behavior tests for API/SSE base configuration, error boundaries, key feedback and severity labels; use browser checks for focus/mobile/themes. Add coverage reporting for changed auth/tenant/monitor contracts before setting an informed threshold.
- [ ] Preserve exact request shapes and SQL/tenant bindings across structural extraction; characterize legacy and unified monitor responses independently.
- [ ] Compare graph metrics only after equivalent corpus coverage. The current stale graph is not a valid numerical complexity-reduction baseline.
- [ ] Keep each change independently revertible. Revert code/config separately from data; never roll back by deleting runtime databases or rewriting monitor history.

**Recommended starting slice:** TASK-PLAN-01 through TASK-PLAN-03. This exposes regressions, removes source-tree noise, aligns policy, and fixes the verified severity presentation issue before touching shared foundations. No business-logic redesign is required for that slice.
