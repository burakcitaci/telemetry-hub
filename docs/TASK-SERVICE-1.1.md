# TASK-SERVICE-1.1 — Persistent service catalog metadata

- [x] Store ownership settings in SQLite table `service_metadata`, keyed by organization and service name.
- [x] Authenticate GET/PUT/DELETE `/api/service-metadata`; obtain organization from the validated JWT, never the payload.
- [x] Retain member editing behavior. The descriptive Team field does not alter telemetry access or team membership.
- [x] Replace browser-local persistence with the shared credentialed API client.
- [x] Show load/save failures and keep the sheet open until saving succeeds.
- [x] Test restart persistence, organization isolation, updates, deletes and DTO validation.

Existing unscoped localStorage values are not automatically imported: their organization is unknown. Re-enter and save them in the intended organization. Storage location and PVC lifecycle match the existing user/team store.

Graphify pre-check identified the detail page, metadata hook and sheet. The graph lacks the new backend auth store, and its CLI is unavailable; current source was inspected directly. This change is not deployed to the cluster automatically.
