# TASK-ADMIN-1.1 — Organization administration and unified filters

## Implemented

- [x] Org-admin-only team and user CRUD, role/team assignment and password resets.
- [x] Server-side scrypt hashes; responses never expose hashes or passwords.
- [x] Persistent SQLite control-plane database, seeded once from `AUTH_USERS_JSON`.
- [x] Deleted bootstrap users are not resurrected; environment changes do not overwrite managed passwords.
- [x] Versioned sessions: password resets, role changes and deletions revoke existing credentials; SSE checks revocation during each poll.
- [x] Last-admin protection and organization-bound team assignment.
- [x] Members and admins see their entire authenticated organization by default.
- [x] Optional team, service and environment filters shared by Metrics, Logs, Traces, Services and Monitors.
- [x] Mandatory parameterized `org_slug = {tenant:String}` in telemetry queries.
- [x] URL-backed filters survive explorer navigation and propagate to cookie-authenticated SSE.
- [x] Open trace detail state is reset at logout, organization changes and unified filter changes.
- [x] Persisted monitor CRUD with organization and optional scope filters; no fabricated evaluation data.
- [x] Theme-aware, compact admin panel at `/org/:tenant/admin`; unauthorized users cannot open it or call admin APIs.

## Configuration and rollout

`AUTH_JWT_SECRET` must contain at least 32 characters. Keep the existing bootstrap `AUTH_USERS_JSON` for the first database initialization. Afterwards, manage credentials through the admin panel. Newly assigned passwords require 12–128 characters; sign-in still accepts existing bootstrap passwords of at least eight characters.

`AUTH_DB_PATH` defaults to `data/platform.sqlite`. Back up the database using SQLite's backup mechanism, including a consistent treatment of its WAL. Do not delete this file to update application code.

The Helm chart mounts a retained PVC at `/var/lib/telemetry-hub`, reads `backend.authSecretName` (default `backend-auth`) and requires one backend replica when SQLite persistence is enabled. That Secret must already contain the existing authentication settings. `backend.persistence.enabled=false` explicitly opts into ephemeral storage; it is not suitable for production credentials. Multi-replica operation requires replacing this single-node store with a shared transactional database.

For the existing Kind environment, rebuild the image and apply the updated Helm chart. An image-only restart does not add the new persistent volume:

```bash
bash infra/kind/load-backend.sh
yarn cluster:deploy
```

After rollout, sign in again: tokens issued before the persistent identity/version migration are invalid. Open `/org/demo/admin` (or the matching authenticated organization) to manage users and teams.

## Verification

```powershell
.\node_modules\.bin\tsc.cmd -p apps/backend/tsconfig.json
.\node_modules\.bin\tsx.cmd --tsconfig apps/backend/tsconfig.json --test apps/backend/src/modules/auth/auth-admin.test.ts apps/backend/src/common/telemetry/tenant-metrics.test.ts apps/backend/src/modules/health/services/tenant-telemetry.service.test.ts
.\node_modules\.bin\tsx.cmd --tsconfig apps/backend/tsconfig.json --test apps/backend/tests/admin.integration.test.ts
.\node_modules\.bin\tsc.cmd -p apps/frontend/tsconfig.json --noEmit --incremental false
.\node_modules\.bin\tsx.cmd --tsconfig apps/frontend/tsconfig.json --test apps/frontend/tests/platform-filters.test.ts
helm lint infra/charts/observability
```

## Deliberate boundaries

- “Global” means all teams **inside the authenticated organization**, not a cross-organization super-admin.
- Team membership is metadata, not a read-security boundary under the updated requirements.
- Monitor scope fields are configuration metadata. Alert evaluation, notification delivery and evaluated time series remain separate features; new monitors honestly report `No Data`.
- Time ranges and local explorer facets still narrow results in addition to the unified filters.
- The built-in runtime OpenTelemetry signals retain their deployment ownership; login does not relabel process-wide telemetry.
- `all` is reserved for removing a filter. Organization slug is never accepted from filter headers or admin request bodies.
- No live cluster rollout is performed by these code changes.

## Validation result

- Backend and frontend TypeScript checks passed.
- Backend production bundle and frontend Vite production build passed. Vite retains its bundle-size warning for the main chunk.
- Eleven backend service/query tests, one real Nest HTTP integration test and three frontend filter/client tests passed.
- Helm lint passed; the referenced `backend-auth` Secret exists (existence only checked, no secret values accessed).
- Live ClickHouse ingestion and visual browser testing were not exercised during this change.

## TASK-PRE.1 — Graphify

The existing graph identifies the shared HTTP client, app routes, sidebar and monitor hook as central frontend change points. Backend auth/telemetry nodes are missing from that snapshot, so their dependencies were verified against source imports. `graphify . --update` was attempted, but the command is not installed on this host; the graph was not fabricated or manually rewritten.
