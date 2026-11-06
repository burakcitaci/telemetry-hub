# Telemetry Hub

[English](README.md) · [Deutsch](README.de.md)

A local observability platform for **logs, traces, metrics, services, and monitors**.
Connect applications using standard OpenTelemetry and manage users, teams, and ingestion keys in the dashboard.

## First installation

Install [Git](https://git-scm.com/downloads), [Node.js 24+](https://nodejs.org/en/download/),
[Yarn 1.22.22](https://classic.yarnpkg.com/), [Docker](https://www.docker.com/products/docker-desktop/),
[Kind](https://kind.sigs.k8s.io/), `kubectl`, and [Helm](https://helm.sh/). Start Docker in Linux-container mode.

The normal deployment runs the backend, Collector, and ClickHouse in Kind. The React frontend runs separately:

```sh
git clone https://github.com/burakcitaci/telemetry-hub.git
cd telemetry-hub
yarn install --frozen-lockfile
yarn setup
yarn cluster:init
yarn ports:backend
```

In another terminal, start the frontend with `yarn dev:frontend`, then open the Vite URL, normally **[http://localhost:5000](http://localhost:5000)**.
The setup wizard creates your first administrator and local secrets. `yarn cluster:init` creates the
Kind cluster and namespace if needed, installs the metrics server, builds the backend image, and
deploys the platform; allow several minutes on the first run. No manual Kubernetes or secret
commands are needed.

<a id="first-admin"></a>

### Create your first administrator

The setup wizard asks for:

| Prompt                    | What to enter                                                  |
| ------------------------- | -------------------------------------------------------------- |
| Organization URL slug     | A lowercase name such as `my-company`; Enter selects `demo`    |
| Administrator email       | The email you will sign in with; no verification email is sent |
| First team                | Enter selects `backend`, or choose your own team slug          |
| Password and confirmation | Your own password, 12–128 characters; input is hidden          |

There is **no default password and no public sign-up form**. The setup wizard prepares the first
administrator and Kubernetes secrets. For a manually managed Helm installation, see the
[first-admin bootstrap](docs/advanced-setup.en.md#first-admin).

<a id="first-login"></a>

### First sign-in

Sign in with the **organization slug, email, and password you entered in setup**.

1. Open **Administration**. Your first administrator and team should already be listed.
2. Create additional teams, then users, and choose their role/team.
3. Under **Ingestion-Keys**, select a team and generate a client key for an application.
4. Copy the key immediately: its plaintext is displayed only once.

An empty dashboard is normal until applications send telemetry. No example account or customer data
is silently created.

## Connect your first application

Use your language's OpenTelemetry SDK or automatic instrumentation. For an application on the same machine, configure:

```dotenv
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:3001/api/ingest
OTEL_EXPORTER_OTLP_HEADERS=x-api-key=<key-generated-in-Administration>
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
OTEL_SERVICE_NAME=my-first-app
OTEL_RESOURCE_ATTRIBUTES=deployment.environment.name=local
```

These are settings, not shell commands. Put them in your application's launch settings, environment
loader, container configuration, or IDE. Instrumentation must read them; no proprietary SDK is required.
Run the application and generate requests/logs/measurements. Open **Services**, **Logs**, **Traces**, or
**Metrics**. Allow time for SDK export and Collector batching, and check time/environment filters.
Metrics alone do not create traces.

In another Docker container, `localhost` means that container. Use `host.docker.internal:3001` where
supported, or use the Kind backend's port-forward from the host.

## Deploy an instrumented backend to Kind

This is different from the earlier **Connect your first application** steps: those send telemetry
from an app running on your computer. This section deploys your app as a workload in the local Kind
cluster. It is intended for workers or services that do not need inbound connections.

Before you start:

1. Complete [First installation](#first-installation), and leave the Kind cluster running.
2. Sign in to the dashboard. Use the organization from setup and an existing team (the setup default
   is `backend`), or create a team in **Administration**.
3. Make sure your app has a Dockerfile and already uses OpenTelemetry OTLP over HTTP/protobuf. Its
   SDK or auto-instrumentation must read the standard `OTEL_*` variables.

From the repository root, preview the deployment plan. Replace the example values with your image,
organization slug, team slug, and environment:

```sh
yarn backend:deploy --name orders-api --image registry.example.com/orders-api:1.0 \
  --org demo --team backend --env dev
```

`--name` is the Kubernetes deployment name and defaults to the OpenTelemetry service name; use a
DNS-safe name. `--image` must be a container image the Kind node can pull. `--org` and `--team` must
match existing dashboard slugs, and `--env` is a label such as `dev`, `staging`, or `production`.
`--service` is optional and defaults to `--name`.

To build the image from your app's Dockerfile and load it into Kind, use a local tag and the path to
the Docker build context instead:

```sh
yarn backend:deploy --name orders-api --image orders-api:dev \
  --build-context <path-to-your-app> --org demo --team backend --env dev
```

The path must contain a `Dockerfile` (or pass `--dockerfile <file>`). The default command only prints
a plan; inspect it, then add `--apply` to the same command to build and deploy. Applying creates or
reuses a seven-day ingestion key in Kubernetes Secrets and restarts the Hub backend if the key changes.
The key is never printed. Do not commit credentials or paste them into logs.

The workload gets its OTLP endpoint, HTTP/protobuf protocol, service name, environment, team, and
key automatically. The key—not client-set organization/team attributes—determines its authorized
tenant. The app container must stay running; this tool does not create an inbound Service or Ingress.
Verify it with `kubectl --context kind-observability get pods -n telemetry-hub` and
`kubectl --context kind-observability logs -n telemetry-hub deployment/orders-api -c worker`.
Then generate telemetry and select the matching organization, team, service, and environment in the
dashboard. For key rotation, other options, and an external (non-Kind) app, see
[backend onboarding in the Kind guide](docs/advanced-setup.en.md#backend-onboarding).

## Everyday Kind commands

Run these from the repository root:

| Action               | Command                       |
| -------------------- | ----------------------------- |
| Check pod status     | `yarn cluster:status`         |
| Start the frontend   | `yarn dev:frontend`           |
| Backend port-forward | `yarn ports:backend`          |
| Backend logs         | `yarn logs:backend`           |
| Collector logs       | `yarn logs:collector`         |
| Reload backend image | `yarn cluster:reload-backend` |

Accounts, teams, keys, and monitors live in the backend PVC; telemetry lives in the ClickHouse PVC,
with the configured seven-day telemetry retention. Deleting the Kind cluster can delete local PVC data.

### Updating

For an unmodified clone:

```sh
git pull --ff-only
yarn install --frozen-lockfile
yarn cluster:reload-backend
```

Use **Administration** for new users and password changes. Back up installations you depend on before upgrading; see [operations](docs/operations.md).

## Troubleshooting

| Problem                       | What to do                                                                                                                       |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `node` is not recognized      | Install Node 24+, reopen the terminal, and check `node --version`.                                                               |
| Docker/Kind is not ready      | Start Docker Desktop in Linux-container mode and check `docker info`, `kind version`, and `kubectl version --client`.            |
| Helm release is unhealthy     | Run `yarn cluster:status` and inspect `yarn logs:backend` or `kubectl --context kind-observability get events -n telemetry-hub`. |
| Frontend cannot reach API     | Keep `yarn ports:backend` running while using `yarn dev:frontend`; verify `http://localhost:3001/health`.                        |
| Login fails                   | Use the organization/email/password chosen during setup and confirm the backend port-forward is running.                         |
| Forgot the password           | Ask another organization administrator to change it in Administration. Do not delete volumes as a password-recovery procedure.   |
| Dashboard is empty            | Generate an ingestion key, configure actual OpenTelemetry instrumentation, exercise your application, and check filters.         |
| Infrastructure is unavailable | Run `kubectl --context kind-observability get pods -n telemetry-hub` and check that the Kind cluster is running.                 |

Do not paste `.env`, rendered configuration, passwords, or ingestion keys into GitHub issues.
Share service status and relevant logs with secrets removed.

## Development and advanced installation

- [Kubernetes/Kind setup, architecture, and detailed integration examples](docs/advanced-setup.en.md)
- [Local backend development](docs/backend-dev-startup.md)
- [Verification, containers, storage, backup and restore](docs/operations.md)
- [Documentation index](docs/README.md)
- [Monitor rule API](apps/backend/src/modules/monitors/README.md)

Developers can install Yarn 1.22.22, run `yarn install --frozen-lockfile`, then `yarn verify`.
The default setup is for your own machine, not a public SaaS deployment; it does not provide public HTTPS or production database authentication.

## What runs locally?

```text
Browser :5000 -> Vite frontend -> port-forwarded NestJS API :3001
Application -> authenticated OTLP gateway -> Collector -> ClickHouse
                                      API accounts/settings -> SQLite volume
```

The dashboard runs locally; backend, Collector, and ClickHouse run in Kind. Collector and ClickHouse
remain internal cluster services. The Helm chart is the source of truth for cluster configuration.
