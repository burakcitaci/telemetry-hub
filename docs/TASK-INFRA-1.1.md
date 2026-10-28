# TASK-INFRA-1.1 — Automatic platform SQLite migration

## Implementation

- [x] Reload automatically checks the actual database path AND PVC mount.
- [x] Freeze the old Node writer while creating a WAL-aware VACUUM INTO snapshot.
- [x] Keep a private, gitignored local backup and SHA-256 recovery receipt.
- [x] Restore and integrity-check the snapshot on the PVC before terminating the old pod.
- [x] Refuse overwriting a different existing PVC database or orphaned WAL sidecars.
- [x] Patch only backend storage; preserve service name, environment, secrets, unrelated volumes and other deployments.
- [x] Retain backup on success/failure and provide an explicit recovery command.
- [x] Validate snapshot WAL contents and storage configuration with Node tests.
- [x] Run reload orchestration directly through Node on Windows, Linux and macOS; Bash/WSL is not required.
- [ ] Live migration/rollout: not executed as part of implementing this automation.

## Usage

```bash
yarn cluster:reload-backend
```

The first run briefly interrupts the backend. Later runs skip migration if storage is already persistent. Requires Docker, kind, kubectl, local Node 24, one running backend replica with Node as PID 1 and the fixed kind-observability context / telemetry-hub namespace. Bash and WSL are not required. A missing PVC is created with 1Gi/default StorageClass and Helm ownership matching the existing observability chart. Existing PVC configuration is retained.

Backups contain credential hashes and platform settings: keep data/platform-backups private (POSIX modes 0700/0600; on Windows also rely on your user-directory ACLs). They are not removed automatically.

If failure occurs before scaling down, the original process is resumed. After scaling down, the backend stays stopped rather than booting an empty ephemeral database. Follow the printed command:

```bash
node infra/kind/migrate-platform-store.mjs --resume "ABSOLUTE_BACKUP_DIRECTORY"
```

No team assignments are guessed and no ClickHouse records are rewritten. This only preserves records that still exist in the current SQLite database; previously lost metadata cannot be recovered from an empty source.

## Dependency validation

Graphify skill used. The existing graph's migration/storage community and direct script dependencies were inspected. The single refresh attempt stopped because the document corpus has no configured semantic backend; no retry or hook was run and generated artifacts remain excluded.
