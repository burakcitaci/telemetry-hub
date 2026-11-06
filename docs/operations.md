# Repository verification and runtime operations

For a first local installation, use the [Kind/Helm quickstart](../README.md). This runbook covers development checks and advanced operation.

## TASK-OPS-1 — Local checks and CI

Use Node 24 and the root package manager declaration (Yarn 1.22.22). Install with
`yarn install --frozen-lockfile`, then run `yarn verify`. This runs shared linting,
configuration formatting, strict production/config typechecks, both builds, backend
source/HTTP tests, the frontend browser suite, onboarding tests, and infrastructure
tests, plus the dependency-free first-user setup tests. Set `TEST_BROWSER` to an installed Chromium executable when automatic detection
is unavailable. CI installs Chrome explicitly. Tests use isolated mock servers and
synthetic/in-memory databases; ordinary verification does not deploy to Kubernetes.

The root `typescript` dependency is the TypeScript 6 compatibility API used by ESLint;
`@typescript/native` supplies the TypeScript 7 `tsc` executable used by builds. This is
the [documented side-by-side configuration](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-6-0),
not an application compiler downgrade. Node types are declared once at root for Node 24.
TypeScript policy lives in the root base/browser/Node configurations. Shared ESLint
policy applies to source and tests. Formatting is enforced for root configuration,
CI configuration, and this runbook; existing source formatting is adopted incrementally
to avoid rewriting source-based historical regression assertions in a single change.

The ClickHouse adapter tests remain explicit opt-ins. They require an isolated Kind
context named `kind-observability` and namespace `telemetry-hub`, with ClickHouse installed.
The adapter fixture creates and drops a randomly named database. Use a disposable cluster,
never an existing production context:

```powershell
$env:TEST_KIND_CLICKHOUSE = '1'
yarn test:integration
Remove-Item Env:TEST_KIND_CLICKHOUSE
```

## TASK-OPS-2 — Browser and server settings

`VITE_BACKEND_URL` is read at frontend build time and supplies the common HTTP/SSE
origin. The standalone development default remains `http://localhost:3001`. Docker uses `VITE_BACKEND_URL=/`
for relative HTTP/SSE paths through the frontend proxy. Trailing slashes are removed.
The proxy redirects `127.0.0.1` document visits to `localhost` with the published port, path and query preserved, avoiding split origins and keeping Secure-cookie behavior.
Deploy over HTTPS and rebuild the frontend when changing this value. Cookie settings,
paths, envelope handling, filter headers and query semantics are unchanged.

Backend `CORS_ORIGINS` optionally overrides the existing local-development origin list.
Supply comma-separated exact HTTP(S) origins without paths or trailing slashes, for
example `https://telemetry.example.test`. The same list drives guarded mutation-origin
checks. Preserve the existing list by omitting this variable in local development.
`PORT` and `CLICKHOUSE_PORT` must be integer ports; `CLICKHOUSE_TIMEOUT` must be a positive
integer in milliseconds. Omitted/empty/zero values retain their previous defaults;
malformed explicit settings fail startup instead of partially parsing.

Vite trusts its standard local hosts. To allow an additional development hostname,
set `VITE_ALLOWED_HOSTS` to a comma-separated hostname list. This setting is for the
development server, not public production hosting.

## TASK-OPS-3 — Image and deployment constraints

```powershell
docker build -f apps/backend/Dockerfile -t telemetry-hub-check .
node scripts/container-smoke.mjs telemetry-hub-check
```

The smoke check creates an isolated temporary container and mock upstream, verifies
compiled startup, UID 1000, read-only root operation, writable SQLite storage, and the
absence of the native compiler, bundler, formatter and linter. The TypeScript 6 API
may remain in the production dependency tree through optional peer resolution. It removes only its own uniquely named container.
No live collector, credentials, cluster, or database is used.

The runtime image installs only production dependencies and runs as the Node user.
Helm backend security settings use UID/GID/fsGroup 1000, disable privilege escalation,
drop capabilities and use a read-only root filesystem. SQLite storage remains mounted
at `/var/lib/telemetry-hub`; keep that path writable. Confirm that the CSI driver honors
fsGroup and that an existing PVC is group-writable before upgrading an old root-owned
deployment. If it does not, arrange an offline ownership migration after a verified
backup. Do not apply recursive ownership changes to an unrelated volume.

The backend remains **one replica** with persistent-storage Recreate deployment strategy.
Do not increase replica count: in-process scheduling and synchronous SQLite are part of
the current architecture. ClickHouse's passwordless configuration is explicitly for the
local Kind environment. A public deployment requires its own access/network/secret
policy and is outside this refactoring's scope.

## TASK-OPS-4 — Schema ownership, backup and restore

| Data                                                      | Current owner                                 | Existing lifecycle                                                      |
| --------------------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------------------- |
| Users, teams, ingestion keys, bootstrap markers, metadata | PlatformStore                                 | Idempotent SQLite schema setup during construction                      |
| Monitor records and transition history                    | SqliteMonitorRepository / MonitorAlertHistory | Transactional writes, first-read legacy migration, configured retention |
| Telemetry tables                                          | Collector ClickHouse exporter                 | Table creation and configured telemetry TTL                             |
| Materialized organization/team columns                    | ClickhouseService                             | Idempotent lazy schema preparation before tenant reads                  |

This change does not move DDL, change table layouts, rewrite JSON, or alter retention.
Back up the control-plane SQLite database and ClickHouse telemetry separately. A PVC
alone is persistence, not a backup. Keep snapshots and receipts outside Git and protect
them as credentials: the SQLite database contains password hashes and organization data.

For the existing local-cluster move from ephemeral storage to PVC, use the maintained
`infra/kind/migrate-platform-store.mjs` procedure after reviewing its selected context
and namespace. It takes a standalone `VACUUM INTO` snapshot (including committed WAL
pages), verifies integrity/checksum, retains a receipt, rejects conflicting destination
data, and can resume with `--resume BACKUP_DIRECTORY`. It changes a deployment and must
be run deliberately, not as part of checks or a general-purpose restore cron job.

The automated isolated restore drill is `yarn test:infra`: it checks WAL snapshot
completeness, integrity, checksums, byte-for-byte restoration, idempotent retry, rejection
of conflicting targets, and preservation of the synthetic source. For recovery of a
real installation: stop writers, take a current snapshot, verify the intended snapshot
and schema compatibility, restore to an empty isolated destination, validate organization
access and record counts there, then arrange cutover. Keep the old storage until verified.
Never copy a live SQLite database without its WAL or delete the database to roll back code.

## TASK-OPS-5 — Capacity, artifacts and rollback

Measure event-loop delay, request/query duration, active SSE connections, scheduler cycle
duration and SQLite busy time under expected load. SSE performs two signal queries per
connection approximately every three seconds. Record query budgets and test saturation
before changing cadence, shared fan-out, storage engines, notification delivery or quotas.

Graphify output and runtime databases are ignored local artifacts. The previously tracked
copies were removed from Git's index while preserved on disk; the frontend graph copy was
archived under `.codex-tools/archived-frontend-graph`. Earlier UI/backend reviews remain
historical; consult the current improvement plan for implementation status. Never include
`graphify-out/` in a commit or outgoing push by default. Refresh it manually once per
refactoring block; no automatic hook is installed.

Roll back application/configuration changes independently from data. The controller's
folder moved but its API routes and payloads did not. Monitor rules, tenant predicates,
session/role rules, aggregation, scheduler behavior, and notification semantics are
preserved. The deferred behavior decisions in the improvement plan remain deferred.
