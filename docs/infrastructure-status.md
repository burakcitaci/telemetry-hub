# TASK-INFRA-STATUS-1.1 — Kubernetes infrastructure status

`GET /api/v1/infrastructure/status` returns one Kubernetes cluster snapshot.
It contains `nodes`, `namespaces`, `workloads` (Deployments, StatefulSets and
DaemonSets), `pods` with their containers, and `services`. `collectedAt` marks
the refresh time and `metricsAvailable` distinguishes missing Metrics API data
from measured zero utilization. The route requires an authenticated admin
session and is a cluster-wide, not tenant-scoped, operator view.

- CPU and RAM are rounded percentages of Node **capacity**, clamped to 0–100.
- Utilization >= 80% is `warning`; >= 95% is `critical`.
- `Ready=False` is `critical`. Unknown/missing readiness, resource pressure,
  network unavailability or an unschedulable Node is `warning`.
- The Metrics API is requested at `metrics.k8s.io/v1`, with a `v1beta1`
  fallback when the stable endpoint returns 404.
- If metrics are unavailable, CPU/RAM are `null` and status comes from Node
  conditions. Disk is `null` because the Metrics API only exposes CPU/memory.
- Results and failures are cached in memory for 2.5 seconds per backend
  replica; concurrent refresh requests share one Kubernetes query batch.
- A failed inventory query returns HTTP 503. Missing metrics alone does not
  prevent a snapshot. Empty resource categories return empty arrays.

Inside Kubernetes the official `@kubernetes/client-node` client uses the mounted
ServiceAccount credentials. Local development uses the default kubeconfig.
Client initialization is lazy, so a missing local kubeconfig does not prevent
the backend or health endpoints from starting.

The Helm chart provisions a dedicated backend ServiceAccount with read access
to Nodes, Namespaces, Pods, Services, Deployments, StatefulSets, DaemonSets and
`metrics.k8s.io/nodes`. Set
`backend.serviceAccount.create=false` and `backend.rbac.create=false` only when
equivalent permissions are managed externally.

Metrics freshness depends on your Metrics API provider's sampling interval;
the endpoint cache does not make those samples newer. No mock values are generated.

Validation:

```powershell
.\node_modules\.bin\tsx.cmd --tsconfig apps/backend/tsconfig.json --test apps/backend/src/modules/infrastructure/infrastructure.test.ts
yarn check:all
yarn build
```
