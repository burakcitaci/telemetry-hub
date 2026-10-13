# TASK-INFRA-STATUS-1.1 — Kubernetes infrastructure status

`GET /api/v1/infrastructure/status` returns a bare JSON array of Kubernetes
Nodes with `id` (UID), `hostname` (Node name), `status`, and
`metrics: { cpu, ram, disk }`. Use the existing authenticated admin session
cookie. This is a cluster-wide operator view shared by organization admins;
it is not a tenant-scoped workload view.

- CPU and RAM are rounded percentages of Node **capacity**, clamped to 0–100.
- Utilization >= 80% is `warning`; >= 95% is `critical`.
- `Ready=False` is `critical`. Unknown/missing readiness, resource pressure,
  network unavailability or an unschedulable Node is `warning`.
- The Metrics API is requested at `metrics.k8s.io/v1`, with a `v1beta1`
  fallback when the stable endpoint returns 404.
- If metrics are unavailable, CPU/RAM are `0` and status comes from Node
  conditions. These zeros mean **unavailable**, not measured zero usage.
  The compact payload cannot express metric availability separately.
- Disk is always `0`: the resource Metrics API only exposes CPU and memory.
- Results and failures are cached in memory for 2.5 seconds per backend
  replica; concurrent refresh requests share one Kubernetes query batch.
- A failed core Node query returns HTTP 503. Missing metrics alone does not
  prevent a status response. Empty clusters return `[]`.

Inside Kubernetes the official `@kubernetes/client-node` client uses the mounted
ServiceAccount credentials. Local development uses the default kubeconfig.
Client initialization is lazy, so a missing local kubeconfig does not prevent
the backend or health endpoints from starting.

Required existing RBAC permissions: `list` on core `nodes`, and `list` on
`metrics.k8s.io/nodes`. Provision the ServiceAccount/ClusterRole bindings in
your cluster. No RBAC or deployment changes are made by this implementation.

Metrics freshness depends on your Metrics API provider's sampling interval;
the endpoint cache does not make those samples newer. No mock values are generated.

Validation:

```powershell
.\node_modules\.bin\tsx.cmd --tsconfig apps/backend/tsconfig.json --test apps/backend/src/modules/infrastructure/infrastructure.test.ts
yarn check:all
yarn build
```
