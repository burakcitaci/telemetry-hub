# Telemetry Hub

Telemetry Hub is a local OpenTelemetry playground for exploring application traces and logs. A NestJS backend emits telemetry, an OpenTelemetry Collector writes it to ClickHouse, and a React dashboard queries it through the backend.

The infrastructure runs in a local [Kind](https://kind.sigs.k8s.io/) cluster. The Vite frontend runs on the host for fast iteration.

## What is real today

- **Traces** come from instrumented backend requests and are stored in ClickHouse.
- **Logs** are emitted by the backend, exported over OTLP, and stored in ClickHouse.
- **Services** are aggregates derived from stored spans; they are not a separate metrics signal.
- `GET /api/data` is the built-in telemetry generator. Each request performs sample work and emits spans and correlated logs.
- Logs and traces keep service, severity or status, time-range, and text-search filters in the URL so filtered views can be bookmarked or shared.

Metrics and tasks are not implemented or exposed. There is no OTLP metrics pipeline or tasks API in this repository.

## Data flow

```text
curl /api/data
      |
      v
NestJS backend -- OTLP/HTTP --> OpenTelemetry Collector
      ^                                  |
      |                                  v
React dashboard <-- query API/SSE -- ClickHouse
```

ClickHouse uses ephemeral `emptyDir` storage in this local setup. Telemetry is discarded when its pod or the cluster is removed. The collector-created trace and log tables retain rows for seven days while the pod exists.

## Prerequisites

- Docker Desktop or another Docker-compatible daemon
- Node.js 24 LTS or newer
- Yarn 1.22.22 (the version is pinned in `package.json`)
- Kind, Helm 3, and kubectl

With a standard Node.js 24 installation, enable the pinned Yarn version with Corepack:

```bash
corepack enable
yarn install --frozen-lockfile
```

## Quick start

Install dependencies once:

```bash
corepack enable
yarn install --frozen-lockfile
```

Start or update the cluster:

```bash
yarn cluster:up
```

This command creates the `observability` Kind cluster when necessary, builds and loads the backend image, deploys the self-contained Helm chart into the `telemetry-hub` namespace, restarts the backend with the loaded image, and waits for its rollout.

In a second terminal, expose the backend:

```bash
yarn port:backend
```

In a third terminal, start the frontend:

```bash
yarn dev:frontend
```

Vite is configured to prefer [http://localhost:5000](http://localhost:5000). If that port is already in use, it will print the next available local URL, such as `http://localhost:5003`. Open the URL printed by Vite, then generate telemetry:

```bash
curl http://localhost:3001/api/data
```

The collector batches exports, so allow a few seconds for new traces and logs to appear.

The frontend accepts backend API calls from the common Vite fallback ports `5000` through `5003`. If Vite chooses a higher port, either free one of those ports or add the new local origin to `apps/backend/src/config/cors.config.ts` and reload the backend.

## Common commands

| Task | Command |
| --- | --- |
| Build both apps | `yarn build` |
| Type-check both apps | `yarn typecheck` |
| Show cluster pods | `yarn status` |
| Follow backend logs | `yarn logs:backend` |
| Follow collector logs | `yarn logs:collector` |
| Rebuild and roll out the backend | `yarn backend:reload` |
| Apply Helm changes and reload the backend | `yarn cluster:restart` |
| Forward ClickHouse HTTP to port 8123 | `yarn port:clickhouse` |
| Delete the release and cluster | `yarn cluster:down` |

See [DEPLOYMENT.md](DEPLOYMENT.md) for verification and troubleshooting.

## Repository layout

```text
apps/backend/                    NestJS API and OpenTelemetry instrumentation
apps/frontend/                   React and Vite dashboard
  src/app/                       Application shell, routing, navigation, and theme
  src/features/                  Logs, traces, and services feature modules
  src/shared/                    Cross-feature API, telemetry, and UI utilities
  src/components/ui/             Reusable UI primitives
infra/charts/observability/      Self-contained local Helm chart
infra/kind/                      Kind configuration and lifecycle scripts
```

Each frontend feature owns its API adapter, domain types, page, and feature-specific components. Features expose a small `index.ts` entry point to the app router. Route components are loaded with static dynamic imports, so Vite produces a separate chunk for each feature. Shared code should only move into `src/shared` after it is used by more than one feature.

## Scope

This is a local learning and development environment, not a production deployment. It intentionally uses a passwordless ClickHouse user inside the isolated Kind network, ephemeral storage, one replica per component, and port forwarding instead of ingress.

ClickHouse stores telemetry timestamps in UTC. The dashboard treats ClickHouse timestamp strings as UTC and renders them in the browser's local timezone.
