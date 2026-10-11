# TASK-SERVICE-1.2 — Team selector and ownership-aware filters

- [x] Metadata Team dropdown loads current organization team IDs and names from authenticated `/api/service-metadata/teams`; Unassigned clears ownership.
- [x] Backend rejects assignments to nonexistent teams and prevents deleting teams with assigned services.
- [x] Selected team filters match services owned in SQLite; explicit ownership overrides stale telemetry `team.id` tags. Untagged services with ownership are included. Services without ownership fall back to telemetry tags.
- [x] Apply the same parameterized predicate to logs, traces, metrics, services and live signals; organization isolation remains mandatory.
- [x] Service-linked monitors use the same ownership precedence; monitors without assigned services retain their explicit team association.
- [x] Test generated SQL for ten telemetry queries, organization isolation, reassignment, validation and monitor filtering.

The graph pre-check covered metadata sheet imports and the existing ClickHouse query hub; the graph is stale for the new auth store. CLI refresh remains unavailable. No telemetry rewrite or historical backfill is required: current catalog ownership applies at query time. Ownership filtering is not a new role-based authorization boundary; members continue to see the organization when no team filter is selected.

Legacy free-text team names must be reselected using a valid team ID. Backend and frontend must be rebuilt/reloaded; no deployment is performed by this task.
