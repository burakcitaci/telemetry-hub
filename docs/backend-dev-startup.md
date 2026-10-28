# TASK-BACKEND-DEV-1 — Preserve Nest runtime metadata (2026-10-28)

- [x] Inspected the graph's shared logger, store and ClickHouse provider boundaries and their current module registrations. CentralLoggerService and ConfigService are concrete runtime imports and their modules are registered.
- [x] Reproduced the missing constructor metadata using the old tsx source runner from apps/backend: ClickhouseService had no design:paramtypes, while self:paramtypes contained only the explicit PlatformStore injection at index 2. Nest therefore could not identify arguments 0 and 1.
- [x] Changed the backend dev script to run its existing Yarn build and start scripts. TypeScript emits decorator metadata before esbuild bundles the JavaScript. This fixes the launch path for all providers and preserves DTO metadata without adding scattered injection annotations or changing runtime dependencies.
- [x] Added workspace-root environment fallbacks after the backend-local paths. Yarn Classic runs workspace scripts from `apps/backend`; the root `.env.local` is now loaded without weakening secret validation or duplicating secrets.
- [x] Updated both READMEs: yarn dev:backend compiles once and starts the compiled backend; rerun after backend source changes. Automatic watch/restart is not enabled (the former tsx invocation did not use watch either).
- [x] Added a process-level bootstrap integration test. It launches the actual bundled backend, resolves the full real provider graph, initializes ClickhouseService against a loopback fixture and serves HTTP /health. Auth uses in-memory SQLite; ClickHouse and OTel traffic stay within local test fixtures. The child process and fixture server are closed afterward.
- [x] Backend production build, all **151** source/HTTP integration tests and git diff --check passed. Frontend code was unchanged, so the frontend build was not repeated.
- [ ] Exactly one manual Graphify refresh was attempted; the installed CLI failed because no semantic backend is configured for the document corpus. The graph remains stale; no repeat or hook was run. Generated artifacts remain excluded from commits.

No live backend, database or deployment was changed. The fix remains uncommitted. Restart local development from the repository root with yarn dev:backend.
