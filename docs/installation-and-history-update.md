# Installation guide and state history — 2026-10-15

## TASK-DOC-SETUP-1 — Correct first-install instructions

- [x] Both root READMEs now describe Yarn Classic 1.22.22 without unrelated pnpm or missing Compose commands. Added a top-level entry point and five ordered setup steps.
- [x] Documented prerequisites, Windows/Git Bash usage, first-admin preparation, password prompt, secret creation, backend startup, first login and subsequent user management. Explained that AUTH_USERS_JSON seeds SQLite once rather than providing a default password or resetting an existing account.
- [x] Kept advanced backend-environment and infrastructure-metrics material out of the German first-install sequence. Corrected storage guidance to match the chart's default 10-GiB ClickHouse PVC and 1-GiB backend PVC, with the Collector's seven-day telemetry TTL.
- [x] Checked package scripts, auth/password/bootstrap source, chart templates and the graph's shared auth/store entry points. Executed both README Node snippets with a mocked kubectl and in-memory SQLite: secret structure, client-key hash, seeded admin/team and successful real AuthService login verified. No real secrets, users or deployments were created.

## TASK-MON-UI.2 — Paginate state history

- [x] Extracted MonitorStateHistory with ten events per page, visible range/total, page count and accessible previous/next buttons. Navigation disables at each boundary; short/empty histories show no pager. Opening another monitor resets the page and shrinking event lists clamp it to a valid page.
- [x] Pagination operates on the events supplied to the current detail view and preserves their order. It does not change backend retention, fetch additional server history or change the existing /api/alerts pagination contract.
- [x] Preserved the existing removal of the Evaluate now button that was present when this follow-up began.
- [x] Added a 23-event browser fixture and verified first/middle/final pages, disabled navigation boundaries, returning to the prior page, reopening at page one and mobile horizontal overflow.

## TASK-VERIFY-SETUP-1 — Validation

- [x] Frontend build passed with the existing bundle-size warning; 10 render/contract tests and all 3 relevant browser tests passed (the new pagination test passed on its focused rerun after correcting its text-extraction assertion).
- [x] Both README setup sequences and first-install/admin/login anchors were checked; no pnpm references remain in either README. Backend application code was unchanged.
- [ ] Exactly one manual Graphify refresh was attempted. The installed CLI requires an unconfigured semantic backend for 42 document files and failed before extraction. The graph remains stale; no repeat or hook was run, and generated artifacts remain outside commits.

No push, installation or live bootstrap was performed as part of this work.
