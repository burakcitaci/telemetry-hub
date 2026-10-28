# TASK-INGESTION-KEY-1 — Admin-managed ingestion keys (2026-10-28)

- [x] Added an organization-admin-only API to create, list and revoke ingestion keys.
- [x] Generate 256 bits of randomness server-side and return the plaintext exactly once.
- [x] Persist only SHA-256 digests and scoped metadata in the existing SQLite control plane.
- [x] Resolve both persistent UI-generated keys and bootstrap `INGESTION_KEYS_JSON` records in the ingestion middleware.
- [x] Enforce organization isolation, existing-team ownership, optional environment scope, 1–3650 day expiry and immediate revocation.
- [x] Added the Administration UI form, one-time copy display and status/revocation table.
- [x] Backend and frontend production builds passed. Ingestion unit tests and admin HTTP integration tests passed.
- [ ] The focused browser fixture timed out while launching its existing headless-browser harness on this host; the frontend production build covers TypeScript and bundling, but browser interaction verification remains pending.
- [ ] The single required Graphify refresh attempt stopped before extraction because 32 documents require an unconfigured semantic backend. No retry or hook was run; generated Graphify artifacts remain excluded.

The plaintext key is never written to SQLite, logs or list responses. Existing environment-provisioned keys remain compatible and read-only.
