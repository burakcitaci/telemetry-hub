# Telemetry Hub

[English](README.md) · [Deutsch](README.de.md)

A local observability platform for **logs, traces, metrics, services, and monitors**.
Connect applications using standard OpenTelemetry and manage users, teams, and ingestion keys in the dashboard.

## First installation

Install [Git](https://git-scm.com/downloads), [Node.js 24+](https://nodejs.org/en/download/), and
[Docker Desktop](https://www.docker.com/products/docker-desktop/) with Linux containers.
On Linux, Docker Engine with the Docker Compose v2 plugin also works. Start Docker before continuing.

**No Yarn, Kubernetes, Kind, Helm, or Bash is needed.** These commands work in PowerShell, macOS Terminal, and Linux terminals:

```sh
git clone https://github.com/burakcitaci/telemetry-hub.git
cd telemetry-hub
node scripts/setup.mjs
docker compose up --build -d --wait
```

The first start downloads images and builds the applications; allow several minutes.
When it finishes, open **[http://localhost:5000](http://localhost:5000)**.

<a id="first-admin"></a>

### Create your first administrator

The setup wizard asks for:

| Prompt                    | What to enter                                                  |
| ------------------------- | -------------------------------------------------------------- |
| Organization URL slug     | A lowercase name such as `my-company`; Enter selects `demo`    |
| Administrator email       | The email you will sign in with; no verification email is sent |
| First team                | Enter selects `backend`, or choose your own team slug          |
| Password and confirmation | Your own password, 12–128 characters; input is hidden          |

There is **no default password and no public sign-up form**. The first backend start creates this
administrator and team. The wizard generates internal secrets and saves a **password hash**, not
your plaintext password, in the ignored local `.env` file. Keep that file private.

<a id="first-login"></a>

### First sign-in

Enter the **organization slug, email, and password you chose** in the wizard. Use the localhost URL printed by setup. The Docker frontend also redirects `127.0.0.1` visits to
`localhost`, preserving the port and investigation URL.

1. Open **Administration**. Your first administrator and team should already be listed.
2. Create additional teams, then users, and choose their role/team.
3. Under **Ingestion-Keys**, select a team and generate a client key for an application.
4. Copy the key immediately: its plaintext is displayed only once.

An empty dashboard is normal until applications send telemetry. No example account or customer data
is silently created. The Infrastructure view requires Kubernetes; the other views work with Compose.

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
supported, or attach the application to this Compose network and use `http://backend:3001/api/ingest`.
The [detailed integration guide](docs/advanced-setup.en.md#3-how-to-integrate-a-new-backend-plug--play)
includes a C# example and signal-specific endpoints.

## Everyday commands

Run these from the repository root:

| Action                  | Command                                  |
| ----------------------- | ---------------------------------------- |
| Start again             | `docker compose up -d --wait`            |
| Stop, keeping data      | `docker compose down`                    |
| Check service status    | `docker compose ps`                      |
| Follow logs             | `docker compose logs -f --tail=100`      |
| Read API logs           | `docker compose logs --tail=100 backend` |
| Rebuild after an update | `docker compose up --build -d --wait`    |

Accounts, teams, keys, and monitors live in the `platform-data` volume; telemetry lives in
`clickhouse-data`, with the configured seven-day telemetry retention. Stop/start and rebuilds preserve
these volumes. **Do not add `-v` or `--volumes` to `docker compose down` unless you intend to delete data.**

### Updating

For an unmodified clone:

```sh
git pull --ff-only
node scripts/setup.mjs
docker compose up --build -d --wait
```

Keep `.env`. Rerunning setup refreshes the generated Collector configuration, without overwriting `.env` or resetting accounts. Use **Administration** for new
users and password changes. Changing the bootstrap password hash in `.env` does not reset an existing
account. There is no automated password reset; save your password and consider adding a second administrator. Back up installations you depend on before upgrading; see [operations](docs/operations.md).

## Troubleshooting

| Problem                       | What to do                                                                                                                                                                                                      |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `node` is not recognized      | Install Node 24+, reopen the terminal, and check `node --version`.                                                                                                                                              |
| Docker is not ready           | Start Docker Desktop in Linux-container mode. Check `docker info` and `docker compose version`.                                                                                                                 |
| Compose says to run setup     | Run `node scripts/setup.mjs` from the repository root.                                                                                                                                                          |
| `.env` already exists         | Setup never overwrites files. If it belongs to another workflow, use `node scripts/setup.mjs --output .env.compose`, then `docker compose --env-file .env.compose …` for every Compose command.                 |
| A port is already in use      | Before first setup, use `node scripts/setup.mjs --port 5050 --api-port 3002`. For an existing setup, change `HUB_PORT`, `API_PORT`, and matching `HUB_PUBLIC_URL` in `.env`, then rebuild and open the new URL. |
| A service is unhealthy        | Check `docker compose ps` and `docker compose logs --tail=100`; check Docker memory/disk and allow time for first-run downloads.                                                                                |
| Login fails                   | Use the organization/email/password you chose and the exact localhost URL. An existing volume may contain an earlier account; setup does not reset it.                                                          |
| Forgot the password           | Ask another organization administrator to change it in Administration. Do not delete volumes as a password-recovery procedure.                                                                                  |
| Dashboard is empty            | Generate an ingestion key, configure actual OpenTelemetry instrumentation, exercise your application, and check filters.                                                                                        |
| Infrastructure is unavailable | Compose does not include Kubernetes. Use the advanced Kind guide for cluster inventory.                                                                                                                         |

Do not paste `.env`, rendered Compose configuration, passwords, or ingestion keys into GitHub issues.
Share service status and relevant logs with secrets removed.

## Development and advanced installation

- [Kubernetes/Kind setup, architecture, and detailed integration examples](docs/advanced-setup.en.md)
- [Local backend development](docs/backend-dev-startup.md)
- [Verification, containers, storage, backup and restore](docs/operations.md)
- [Monitor rule API](apps/backend/src/modules/monitors/README.md)

Developers can install Yarn 1.22.22, run `yarn install --frozen-lockfile`, then `yarn verify`.
This is not required for the Compose quickstart: Docker builds install their own dependencies.
The default setup is for your own machine, not a public SaaS deployment; it does not provide public HTTPS or production database authentication.

## What runs locally?

```text
Browser :5000 -> frontend + API proxy -> NestJS API :3001
Application -> authenticated OTLP gateway -> Collector -> ClickHouse
                                      API accounts/settings -> SQLite volume
```

Only the dashboard and API bind to your computer's loopback interface. Collector and ClickHouse stay
inside the Compose network. Setup generates the Collector configuration from the existing Helm template,
so both paths use the same authentication, ownership handling, table creation, and retention policy.
