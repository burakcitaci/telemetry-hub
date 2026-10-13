# TASK-TELEMETRY-1.3 — Missing demo ownership and ephemeral storage

- [x] Inspect running backend without reading identity hashes or secrets.
- [x] Confirm service_metadata is empty and AUTH_DB_PATH/PVC configuration is not applied.
- [x] Stop demo export before any signal is sent when no team can be resolved; return actionable HTTP 400.
- [x] Validate resolved team belongs to the authenticated organization.
- [x] Prevent image-only reload from silently deleting ephemeral control-plane data.
- [ ] Migrate the running SQLite database to the chart PVC before another restart.
- [ ] Reassign demo/tenant-heavy to the intended team; no team was guessed.

The running pod uses data/platform.sqlite, OTEL_SERVICE_NAME=tenant-heavy and has no service metadata rows. Teams platform, backend and frontend exist in demo. Selecting one team or saving catalog ownership is required for newly ingested telemetry. Existing ClickHouse records are not rewritten.

Graphify graph has no backend store/generator nodes; direct imports were inspected. Graph refresh tooling is unavailable in this environment.
