# TASK-TELEMETRY-1.2 — Trusted log context and service ownership

- [x] AsyncLocalStorage isolates telemetry context per HTTP request; only validated JWT claims populate it.
- [x] Response-finish logs explicitly re-enter their own request context, not whichever request happens to finish nearby.
- [x] OTel log processor captures organization and catalog-owned team at emission; exporter places these in per-record Resources for ClickHouse ResourceAttributes and materialized team_id.
- [x] Background logs retain deployment ownership. Neither user attributes nor UI filters can overwrite the trusted organization or rename the process service.
- [x] UI-generated traces/logs/metrics use catalog team ownership when available, including admins without team membership.
- [x] Existing ownership-aware queries continue to include historical empty-team records by service assignment; no historical ClickHouse rewrite is performed.
- [x] Test concurrent tenants, malicious attributes, asynchronous batch export, reassignment, immutable deployment Resource and all three generated signals.

Logger `context` remains a diagnostic label; it is not used as a tenant or team ID. Metadata ownership changes apply to subsequent emissions and current query-time filtering. Existing raw ResourceAttributes are not retrospectively changed.

Graphify map was checked; it lacks the new backend context/store nodes. CLI refresh is unavailable. Backend rebuild/redeploy is required; this task does not deploy the cluster.
