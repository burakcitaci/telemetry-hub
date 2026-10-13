---
type: "query"
date: "2026-10-13T20:13:59.306817+00:00"
question: "Prompt: Fix the Frontend Findings From UI_REVIEW.md First\r\nRole\r\nYou are the engineer who wrote this codebase, now acting as the one fixing the frontend only. You have full knowledge of the repo — tree, dependencies, patterns, and both review documents (UI_REVIEW.md, BACKEND_REVIEW.md). Do not ask me to re-paste them; read them.\r\n\r\nScope of this pass: frontend only. Backend fixes are explicitly out of scope here — they will come in a later pass. Where a frontend fix depends on a backend change, either (a) stub the client side so it degrades gracefully when the backend hasn't changed yet, or (b) defer the fix and mark it blocked-on-backend. Never silently edit backend code to unblock a frontend fix.\r\n\r\nGoal: Resolve the frontend findings — starting with P0 correctness — with surgical, minimal, reversible changes. Fix the system. Don't rewrite it. Don't refactor for taste.\r\n\r\nThe UI review's thesis: the interface speaks with more confidence than its data supports. At 2am, a falsely reassuring result is worse than an ugly panel. Every fix below serves that thesis.\r\n\r\nNon-Negotiable Rules\r\nFix in priority order. P0 → P1 → P2. Do not interleave.\r\n\r\nOne finding = one change. Never bundle. Never \"while I'm here.\"\r\n\r\nNo behavior change outside the finding's scope. If a fix touches unrelated code, stop and report.\r\n\r\nNo new dependencies unless the UI review explicitly required one — and justify in the commit.\r\n\r\nNo renames, no file moves, no folder reshuffling. Separate work.\r\n\r\nNo UI redesign. Fix the truthful-presentation issue, not aesthetics.\r\n\r\nPreserve every \"What to NOT change\" item from the UI review. It names specific things to protect — read it and honor them.\r\n\r\nEvery fix ships with a test that fails before and passes after.\r\n\r\nEvery fix is verifiable from the outside. State the exact click path or component test a reviewer uses to confirm it.\r\n\r\nIf a review finding is wrong or already fixed, say so and skip — don't invent a fix to satisfy the doc.\r\n\r\nDo not touch backend. If a UI fix needs backend data that doesn't exist, stub client-side and mark blocked-on-backend.\r\n\r\nWork Order — Frontend Only\r\nPhase A — P0 truthfulness\r\nFE-A1 · Metrics chart bridges gaps — metrics-view.tsx:501\r\n\r\nCurrently, missing observations are plotted as continuous data. UI review: \"presents continuity that was not measured.\"\r\n\r\nFix: consume null from the API as gaps. If the API returns 0 today (backend issue), do not fabricate a gap in the client — instead render a warning strip on the chart: \"0 values cannot be distinguished from missing data until backend returns null.\" Mark blocked-on-backend for full resolution.\r\n\r\nTest: fixture with a gap → tooltip says \"no data\" or the warning strip renders.\r\n\r\nFE-A2 · Infrastructure unknown ≠ 0 — infrastructure-dashboard.tsx:219, infrastructure.model.ts:29\r\n\r\nCurrently 0% is shown when measurement is unknown — idle vs unobserved indistinguishable.\r\n\r\nFix: render — with an \"unobserved\" tooltip when the source value is missing/undefined. Same blocked-on-backend note as A1 for the case where the API actually sends 0 for unknown.\r\n\r\nTest: host with no CPU observation renders —, not 0%.\r\n\r\nFE-A3 · Monitor status must not imply healthy without evaluation — monitors-components.tsx:578, monitors-components.tsx:370\r\n\r\nUI review top issue: \"Monitors imply healthy, notifying operation without evaluation data.\"\r\n\r\nFix client-side: if the status response lacks lastEvaluatedAt (backend will add it later), render Unknown for any monitor whose evaluation age is unknown. Demote the small disclosure to a visible state. Do not show \"OK\" without a timestamp.\r\n\r\nTest: monitor response without lastEvaluatedAt renders Unknown, never OK.\r\n\r\nFE-A4 · Services detail route must not silently lose Services nav highlight — app-sidebar.tsx:139\r\n\r\nActive matching is exact; /services/:id leaves Services unhighlighted.\r\n\r\nFix: prefix-match for parent routes.\r\n\r\nTest: navigate to /services/foo → Services highlighted.\r\n\r\nFE-A5 · Unknown routes must not silently redirect to Metrics — app.tsx:73\r\n\r\nWildcard lands on Metrics; a bad investigative link looks like a healthy dashboard.\r\n\r\nFix: explicit not-found state with a clear \"route not found\" message and a link back.\r\n\r\nTest: navigate to /does-not-exist → not-found screen, not Metrics.\r\n\r\nFE-A6 · Global filter change must not remount the page and active-trace provider — app.tsx:47\r\n\r\nUI review: \"Investigation context is disposable rather than stable.\"\r\n\r\nFix: preserve open investigation (selected trace, open drawer) across compatible global filter changes. Incompatible changes (e.g., org switch) may still reset — that's acceptable and should be documented in the fix template.\r\n\r\nTest: open trace detail, change env filter → trace detail remains open.\r\n\r\nPhase B — P1 usability & accessibility\r\nFE-B1 · Row-level keyboard access — data-table.tsx:199, monitors-components.tsx:370\r\n\r\nCore flows (logs, traces, monitors) are pointer-only at row level. Keyboard users can't complete the same investigation.\r\n\r\nFix: tabIndex=0, role=\"button\", Enter/Space opens detail. Preserve visual focus ring.\r\n\r\nTest: Tab into table, Enter on a row → detail opens.\r\n\r\nFE-B2 · Monitor stale evaluation shows \"unknown\", not \"OK\" — coordinate with FE-A3\r\n\r\nOnce backend exposes lastEvaluatedAt (later pass), client renders \"unknown\" for stale. For now, if the field is absent, apply the FE-A3 fallback.\r\n\r\nFE-B3 · Logout copy in English — global-header.tsx:31\r\n\r\nCurrently German copy inside English navigation.\r\n\r\nFix: replace with the English label used elsewhere. Do not touch layout.\r\n\r\nFE-B4 · Theme control in collapsed/mobile rail — app-sidebar.tsx:202\r\n\r\nCurrently missing in collapsed state — dark-only users on mobile can't switch.\r\n\r\nFix: add the existing theme toggle to the collapsed rail. Reuse the component, don't build a new one.\r\n\r\nFE-B5 · Service detail drilldown + ambiguous empty values — service-detail-page.tsx:48\r\n\r\nMissing drilldown from KPI → filtered view; empty values ambiguous.\r\n\r\nFix: KPIs link to the corresponding filtered metric/log/trace view. Empty values render as —, not blank.\r\n\r\nTest: click a KPI → filtered view opens with expected facets.\r\n\r\nFE-B6 · Admin initial-loading & recovery are weak — admin-page.tsx:23\r\n\r\nFix: skeleton matching final layout (not spinner); retry affordance on error; preserve entered state on recoverable failures.\r\n\r\nPhase C — P2 polish & consistency\r\nFE-C1 · Brand purple as a token — app-sidebar.tsx:94\r\n\r\nReplace the raw palette value with a --brand token. Do not change the color.\r\n\r\nIf --brand doesn't exist yet, add it to globals.css.\r\n\r\nFE-C2 · Login: theme + explain organization field — login-page.tsx:36\r\n\r\nAllow theme on login (currently forced dark). Add a short helper line explaining the organization field.\r\n\r\nDo not restructure the form.\r\n\r\nFE-C3 · Filter bar copy & unit consistency — audit facet-query-bar.tsx:240\r\n\r\nEnsure units (ms, %, req/s) render consistently across facets. No copy changes beyond what the UI review explicitly flagged.\r\n\r\nFE-C4 · Sidebar active state for parent routes across the app — extend FE-A4\r\n\r\nAudit all nav items for prefix matching, not just Services.\r\n\r\nFE-C5 · Empty / error / loading state consistency audit\r\n\r\nWalk every data view flagged in the UI review. Replace spinners with skeletons matching layout. Add retry on every error state. Do not redesign — normalize.\r\n\r\nThis is the one P2 that may legitimately touch many files; emit a fix template listing them before editing.\r\n\r\nExplicitly Out of Scope (this pass)\r\nAny backend change. Backend P0s (ClickHouse persistence, histogram corruption, tenant attribution, metrics statistics blowup, trace historical window) are handled in a later pass. If a UI fix needs backend data, stub client-side and mark blocked-on-backend.\r\n\r\nProduction deployment items (Helm, PVC, collector queue). Captured in a separate PRODUCTION_GAPS.md, not this pass.\r\n\r\nComponent API redesign, folder reshuffling, module boundary changes.\r\n\r\nAnything the UI review listed under \"What to NOT change.\"\r\n\r\nFix Template (use for every finding)\r\nBefore writing code, emit this block. Wait for approval if effort is L or the change touches >2 files.\r\n\r\ntext\r\nFinding:   <FE-A6 — filter change remounts page and active-trace provider>\r\nSource:    UI_REVIEW.md §2 Shell\r\nFiles:     src/app/app.tsx:47\r\nChange:    Do not key the routing subtree by filter state. Move filter\r\n           state into a Zustand slice; subscribe per-feature. Incompatible\r\n           changes (org switch) still reset — document as intentional.\r\nProof:     New test `app-shell.test.tsx > filter change preserves open\r\n           trace detail`. Fails before, passes after.\r\nRisk:      If a feature relies on remount for reset, that feature must\r\n           be identified first. Grep for useEffect on mount that resets\r\n           per-filter state.\r\nRollback:  Single commit, no route changes.\r\nPer-Fix Verification\r\nEvery fix must be confirmable by a reviewer without reading the diff:\r\n\r\nA named component test, or\r\n\r\nA click path + the visible state change, or\r\n\r\nA screenshot-diff if available (otherwise describe in words).\r\n\r\nIf you can't describe verification in one sentence, the fix isn't done.\r\n\r\nWhat NOT to Touch (from the UI review)\r\nShared investigation vocabulary: environment/service/host facets, common headers, dense tables.\r\n\r\nTrace span nesting, raw payloads, attribute panels, log-to-trace navigation.\r\n\r\nInfrastructure staleness display and honest unsupported-measurement handling.\r\n\r\nAnything the UI review explicitly listed under \"What to NOT change.\"\r\n\r\nDo not let the fixes above regress any of these.\r\n\r\nProcess\r\nConfirm the frontend fix list. Walk UI_REVIEW.md's prioritized backlog. Output a checkbox list; strike through anything already fixed or invalid, with a one-line reason. Mark anything blocked-on-backend. Wait for my go.\r\n\r\nEmit fix templates for each Phase A item. Wait for my go again.\r\n\r\nExecute Phase A as small commits, one per finding. After each: verification line + test name.\r\n\r\nPause. Report Phase A results. Ask before Phase B.\r\n\r\nRepeat for B and C.\r\n\r\nFinal report — table: Finding | Status (fixed/deferred/blocked-on-backend/invalid) | Commit | Test | Verification.\r\n\r\nUpdate UI_REVIEW.md — mark resolved findings inline. Do not rewrite the doc.\r\n\r\nDefinition of Done\r\nEvery frontend P0 resolved with a test that would have caught the original bug.\r\n\r\nEvery frontend P1 resolved or explicitly deferred with a written reason.\r\n\r\nP2 items resolved or scheduled; not silently dropped.\r\n\r\nBackend-dependent fixes stubbed client-side and marked blocked-on-backend; no backend code touched.\r\n\r\nNo regressions: existing tests still pass, no new lint/type errors, no behavior change outside listed findings.\r\n\r\nUI_REVIEW.md updated to reflect reality.\r\n\r\nA reviewer can run one command per phase and one manual click path per phase to confirm the fix."
contributor: "graphify"
outcome: "useful"
---

# Q: Prompt: Fix the Frontend Findings From UI_REVIEW.md First
Role
You are the engineer who wrote this codebase, now acting as the one fixing the frontend only. You have full knowledge of the repo — tree, dependencies, patterns, and both review documents (UI_REVIEW.md, BACKEND_REVIEW.md). Do not ask me to re-paste them; read them.

Scope of this pass: frontend only. Backend fixes are explicitly out of scope here — they will come in a later pass. Where a frontend fix depends on a backend change, either (a) stub the client side so it degrades gracefully when the backend hasn't changed yet, or (b) defer the fix and mark it blocked-on-backend. Never silently edit backend code to unblock a frontend fix.

Goal: Resolve the frontend findings — starting with P0 correctness — with surgical, minimal, reversible changes. Fix the system. Don't rewrite it. Don't refactor for taste.

The UI review's thesis: the interface speaks with more confidence than its data supports. At 2am, a falsely reassuring result is worse than an ugly panel. Every fix below serves that thesis.

Non-Negotiable Rules
Fix in priority order. P0 → P1 → P2. Do not interleave.

One finding = one change. Never bundle. Never "while I'm here."

No behavior change outside the finding's scope. If a fix touches unrelated code, stop and report.

No new dependencies unless the UI review explicitly required one — and justify in the commit.

No renames, no file moves, no folder reshuffling. Separate work.

No UI redesign. Fix the truthful-presentation issue, not aesthetics.

Preserve every "What to NOT change" item from the UI review. It names specific things to protect — read it and honor them.

Every fix ships with a test that fails before and passes after.

Every fix is verifiable from the outside. State the exact click path or component test a reviewer uses to confirm it.

If a review finding is wrong or already fixed, say so and skip — don't invent a fix to satisfy the doc.

Do not touch backend. If a UI fix needs backend data that doesn't exist, stub client-side and mark blocked-on-backend.

Work Order — Frontend Only
Phase A — P0 truthfulness
FE-A1 · Metrics chart bridges gaps — metrics-view.tsx:501

Currently, missing observations are plotted as continuous data. UI review: "presents continuity that was not measured."

Fix: consume null from the API as gaps. If the API returns 0 today (backend issue), do not fabricate a gap in the client — instead render a warning strip on the chart: "0 values cannot be distinguished from missing data until backend returns null." Mark blocked-on-backend for full resolution.

Test: fixture with a gap → tooltip says "no data" or the warning strip renders.

FE-A2 · Infrastructure unknown ≠ 0 — infrastructure-dashboard.tsx:219, infrastructure.model.ts:29

Currently 0% is shown when measurement is unknown — idle vs unobserved indistinguishable.

Fix: render — with an "unobserved" tooltip when the source value is missing/undefined. Same blocked-on-backend note as A1 for the case where the API actually sends 0 for unknown.

Test: host with no CPU observation renders —, not 0%.

FE-A3 · Monitor status must not imply healthy without evaluation — monitors-components.tsx:578, monitors-components.tsx:370

UI review top issue: "Monitors imply healthy, notifying operation without evaluation data."

Fix client-side: if the status response lacks lastEvaluatedAt (backend will add it later), render Unknown for any monitor whose evaluation age is unknown. Demote the small disclosure to a visible state. Do not show "OK" without a timestamp.

Test: monitor response without lastEvaluatedAt renders Unknown, never OK.

FE-A4 · Services detail route must not silently lose Services nav highlight — app-sidebar.tsx:139

Active matching is exact; /services/:id leaves Services unhighlighted.

Fix: prefix-match for parent routes.

Test: navigate to /services/foo → Services highlighted.

FE-A5 · Unknown routes must not silently redirect to Metrics — app.tsx:73

Wildcard lands on Metrics; a bad investigative link looks like a healthy dashboard.

Fix: explicit not-found state with a clear "route not found" message and a link back.

Test: navigate to /does-not-exist → not-found screen, not Metrics.

FE-A6 · Global filter change must not remount the page and active-trace provider — app.tsx:47

UI review: "Investigation context is disposable rather than stable."

Fix: preserve open investigation (selected trace, open drawer) across compatible global filter changes. Incompatible changes (e.g., org switch) may still reset — that's acceptable and should be documented in the fix template.

Test: open trace detail, change env filter → trace detail remains open.

Phase B — P1 usability & accessibility
FE-B1 · Row-level keyboard access — data-table.tsx:199, monitors-components.tsx:370

Core flows (logs, traces, monitors) are pointer-only at row level. Keyboard users can't complete the same investigation.

Fix: tabIndex=0, role="button", Enter/Space opens detail. Preserve visual focus ring.

Test: Tab into table, Enter on a row → detail opens.

FE-B2 · Monitor stale evaluation shows "unknown", not "OK" — coordinate with FE-A3

Once backend exposes lastEvaluatedAt (later pass), client renders "unknown" for stale. For now, if the field is absent, apply the FE-A3 fallback.

FE-B3 · Logout copy in English — global-header.tsx:31

Currently German copy inside English navigation.

Fix: replace with the English label used elsewhere. Do not touch layout.

FE-B4 · Theme control in collapsed/mobile rail — app-sidebar.tsx:202

Currently missing in collapsed state — dark-only users on mobile can't switch.

Fix: add the existing theme toggle to the collapsed rail. Reuse the component, don't build a new one.

FE-B5 · Service detail drilldown + ambiguous empty values — service-detail-page.tsx:48

Missing drilldown from KPI → filtered view; empty values ambiguous.

Fix: KPIs link to the corresponding filtered metric/log/trace view. Empty values render as —, not blank.

Test: click a KPI → filtered view opens with expected facets.

FE-B6 · Admin initial-loading & recovery are weak — admin-page.tsx:23

Fix: skeleton matching final layout (not spinner); retry affordance on error; preserve entered state on recoverable failures.

Phase C — P2 polish & consistency
FE-C1 · Brand purple as a token — app-sidebar.tsx:94

Replace the raw palette value with a --brand token. Do not change the color.

If --brand doesn't exist yet, add it to globals.css.

FE-C2 · Login: theme + explain organization field — login-page.tsx:36

Allow theme on login (currently forced dark). Add a short helper line explaining the organization field.

Do not restructure the form.

FE-C3 · Filter bar copy & unit consistency — audit facet-query-bar.tsx:240

Ensure units (ms, %, req/s) render consistently across facets. No copy changes beyond what the UI review explicitly flagged.

FE-C4 · Sidebar active state for parent routes across the app — extend FE-A4

Audit all nav items for prefix matching, not just Services.

FE-C5 · Empty / error / loading state consistency audit

Walk every data view flagged in the UI review. Replace spinners with skeletons matching layout. Add retry on every error state. Do not redesign — normalize.

This is the one P2 that may legitimately touch many files; emit a fix template listing them before editing.

Explicitly Out of Scope (this pass)
Any backend change. Backend P0s (ClickHouse persistence, histogram corruption, tenant attribution, metrics statistics blowup, trace historical window) are handled in a later pass. If a UI fix needs backend data, stub client-side and mark blocked-on-backend.

Production deployment items (Helm, PVC, collector queue). Captured in a separate PRODUCTION_GAPS.md, not this pass.

Component API redesign, folder reshuffling, module boundary changes.

Anything the UI review listed under "What to NOT change."

Fix Template (use for every finding)
Before writing code, emit this block. Wait for approval if effort is L or the change touches >2 files.

text
Finding:   <FE-A6 — filter change remounts page and active-trace provider>
Source:    UI_REVIEW.md §2 Shell
Files:     src/app/app.tsx:47
Change:    Do not key the routing subtree by filter state. Move filter
           state into a Zustand slice; subscribe per-feature. Incompatible
           changes (org switch) still reset — document as intentional.
Proof:     New test `app-shell.test.tsx > filter change preserves open
           trace detail`. Fails before, passes after.
Risk:      If a feature relies on remount for reset, that feature must
           be identified first. Grep for useEffect on mount that resets
           per-filter state.
Rollback:  Single commit, no route changes.
Per-Fix Verification
Every fix must be confirmable by a reviewer without reading the diff:

A named component test, or

A click path + the visible state change, or

A screenshot-diff if available (otherwise describe in words).

If you can't describe verification in one sentence, the fix isn't done.

What NOT to Touch (from the UI review)
Shared investigation vocabulary: environment/service/host facets, common headers, dense tables.

Trace span nesting, raw payloads, attribute panels, log-to-trace navigation.

Infrastructure staleness display and honest unsupported-measurement handling.

Anything the UI review explicitly listed under "What to NOT change."

Do not let the fixes above regress any of these.

Process
Confirm the frontend fix list. Walk UI_REVIEW.md's prioritized backlog. Output a checkbox list; strike through anything already fixed or invalid, with a one-line reason. Mark anything blocked-on-backend. Wait for my go.

Emit fix templates for each Phase A item. Wait for my go again.

Execute Phase A as small commits, one per finding. After each: verification line + test name.

Pause. Report Phase A results. Ask before Phase B.

Repeat for B and C.

Final report — table: Finding | Status (fixed/deferred/blocked-on-backend/invalid) | Commit | Test | Verification.

Update UI_REVIEW.md — mark resolved findings inline. Do not rewrite the doc.

Definition of Done
Every frontend P0 resolved with a test that would have caught the original bug.

Every frontend P1 resolved or explicitly deferred with a written reason.

P2 items resolved or scheduled; not silently dropped.

Backend-dependent fixes stubbed client-side and marked blocked-on-backend; no backend code touched.

No regressions: existing tests still pass, no new lint/type errors, no behavior change outside listed findings.

UI_REVIEW.md updated to reflect reality.

A reviewer can run one command per phase and one manual click path per phase to confirm the fix.

## Answer

TASK-FE-FIX-1 preflight only; awaiting user approval before fix templates or code. Expanded graph vocabulary: metrics infrastructure monitors services sidebar routes filter trace table theme admin login. BFS found 508 nodes; 36 shown and 472 cut at 1300 tokens. Direct sources confirm FE-A1 connectNulls in metrics-view and null gaps from use-metrics; FE-A2 MetricRow already shows dash for undefined, but model parser requires all numeric metrics and lacks unobserved semantics; backend zero ambiguity remains blocked. FE-A3 no lastEvaluatedAt handling in use-monitors. FE-A4 exact sidebar matching. FE-A5 wildcards redirect to metrics. FE-A6 app keys subtree by filterKey AND ActiveTraceProvider closes selection on env change: removing keys alone insufficient. FE-B1 keyboard row actions absent; B2 backend timestamp unavailable; B3 German logout; B4 no collapsed/mobile theme control; B5 lacks drilldown/unknown summary values, trace range blocked on backend; B6 admin initial loading/retry absent. FE-C1 raw purple; C2 login dark/helper absent; C3 no unit defect was identified in UI review FacetQueryBar, so no invented formatting fix; C4 overlaps A4 matching logic, separate audit/test only; C5 do not replace existing Services/service-detail skeleton/retry. Preserve infrastructure theme/stale snapshot/Disk-Network unknowns, raw telemetry, nested spans, links, keyboard facets, confirmations and tokens. Review backlog additionally contains historical traces backend-blocked, current value and temporal axis P0 missing from work order; recommend explicit approval to include frontend P0s and move keyboard B1 before P1. Other review issues not silently dropped: pause logs, visible stream status, monitor rule preview, inactive service/monitor time pickers, inert CSV/filter, log severity, hostname search, labels, empty summary, dirty drafts, decorative coverage and stray 12 all deferred until explicitly selected. No app/backend/deploy/review edits, tests, commits or push performed; Graphify only local query memory.

## Outcome

- Signal: useful