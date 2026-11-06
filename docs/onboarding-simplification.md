# TASK-ONBOARD-EASY-1 — GitHub newcomer setup

## Implementation

- [x] Make English the main GitHub README, provide a German quickstart, and retain the former detailed guides under `docs/advanced-setup.*.md`.
- [x] Replace the recommended Kind/Helm/Bash/manual-secret/port-forward workflow with Node 24 plus Docker Compose.
- [x] Provide a dependency-free interactive setup wizard with hidden password entry, confirmation, prerequisite checks, custom ports, and noninteractive password input through stdin.
- [x] Reuse the existing password hasher and first-user bootstrap. Generate fresh JWT/Collector secrets; write no plaintext password or usable default account into the repository.
- [x] Preserve existing environment files and accounts on repeat setup. Refresh generated Collector configuration from the existing Helm template.
- [x] Run frontend, backend, Collector and ClickHouse together with health checks, loopback-only application ports, internal storage/Collector networking and persistent data volumes.
- [x] Explain first login, additional users, ingestion keys, application instrumentation, ordinary stop/start, updates, data retention and common errors.
- [x] Add setup regression tests to the root verification command and format the new quickstart/configuration files.

## Validation

- [x] Nine setup tests pass, including startup without `node_modules`, compatible password hashes, Unicode length validation, preserved existing files, safe printed commands and prerequisite failures.
- [x] Interactive terminal check confirms that password and confirmation input are hidden.
- [x] Fresh isolated Compose installation builds both applications and starts all four services successfully.
- [x] Actual first-admin login, authenticated session, initial-team discovery, and additional-user creation succeed.
- [x] An Administration-generated key sends a real OTLP trace through the gateway and Collector into ClickHouse; an authenticated API query retrieves it.
- [x] The production dashboard signs in in a real browser on localhost, including its Secure-cookie session through the frontend proxy.
- [x] An added user can still sign in after full Compose down/up, demonstrating persistent account storage.
- [x] Only uniquely named test containers, networks and volumes are removed; existing databases and application business logic are unchanged.

See the [main README](../README.md) for user-facing instructions. Test credentials, generated configuration, build logs and local Graphify output are excluded from Git.

## TASK-LOGIN-ORIGIN-1: Consistent local authentication

- [x] Use relative API URLs in the Docker frontend so requests use the dashboard origin.
- [x] Redirect the loopback IP to localhost, preserving port, path and query, for the existing Secure-cookie session.
- [x] Keep the frontend health check valid with the canonical Host header.
- [x] Verify the redirect, browser login, authenticated session and same-origin API requests in an isolated container regression check; run it in CI.
- [x] Verify real Compose login, authenticated streaming and persistence without changing authentication business rules.
