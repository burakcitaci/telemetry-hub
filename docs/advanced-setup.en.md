> Advanced Kubernetes/Kind guide. Start with [the main README](../README.md) for the Helm/Kind quickstart.

# Telemetry Hub

**Language:** [Deutsch](advanced-setup.de.md) | English

**Telemetry Hub** brings together traces, logs, and metrics from arbitrary applications in a multi-tenant observability platform. Applications send standard OpenTelemetry Protocol (OTLP) data; an ingestion gateway assigns it to a verified organization and team. The dashboard helps investigate services, requests, errors, and measurements.

**Audience:** Developers integrate applications, administrators manage access and teams, and customers inspect their authorized data scope.

**Monitoring API:** [Unified rules for logs, metrics and traces](../apps/backend/src/modules/monitors/README.md) — JSON contract, configuration, alert history and legacy migration.

**Tools:** Yarn Classic **1.22.22**, Docker, Kind and Helm. This guide installs the backend in a local cluster and runs the dashboard locally.

**New here?** Start with [first installation](#first-installation): install dependencies → create the cluster → [prepare the first admin](#first-admin) → start the backend → [sign in](#first-login). Architecture and application onboarding are described below.

## 1. ARCHITECTURE & COMPONENTS

### Three ingestion layers and a separate read path

The telemetry pipeline has three layers: **Ingestion Gateway → Collector → Storage**. The UI is a separate, authenticated read-side layer.

```text
External backend: Go / Python / .NET / Java / ...
  OTLP HTTP/protobuf + X-API-Key
  Client attributes are NOT trusted
                    |
                    v
  [1] NestJS Ingestion Gateway :3001
      POST /api/ingest/v1/{traces,logs,metrics}
      SHA-256(Key) -> registry -> verified organization / team
      Fresh upstream headers; client headers are not forwarded
                    |
                    | internal bearer token
                    | X-Telemetry-Org / X-Telemetry-Team
                    v
  [2] OpenTelemetry Collector :4319 (internal)
      Bearer authentication + include_metadata
      memory_limiter -> resource/ingestion -> batch
      Delete client org/team; insert verified gateway values
                    |
                    v
  [3] ClickHouse :9000 / :8123 (internal)
      otel_traces / otel_logs / otel_metrics_*
      org_slug and team_id derived from ResourceAttributes
                    ^
                    | parameterized tenant/team queries
      NestJS Query API + user/team permissions
                    ^
                    | authenticated HTTP session
      React / Vite dashboard; preferred local port :5000
      Dynamic service discovery from stored telemetry
```

### Ingestion gateway and tenant isolation

The gateway expects a random client key in **`X-API-Key`**. It computes SHA-256 over the exact key and looks up the hexadecimal digest in the persistent admin key store or the bootstrap `INGESTION_KEYS_JSON`. A matching record supplies `orgSlug` and `teamId`. Unknown, expired, and revoked keys are rejected.

**Validation is synchronous:** Bootstrap keys are loaded into an in-memory map at startup; keys created in Administration are looked up in the persistent SQLite store. HTTP forwarding is asynchronous. UI-created key revocation takes effect immediately; changes to the bootstrap environment registry require a backend restart.

The middleware constructs a fresh upstream header set containing:

- The accepted request's `Content-Type`;
- `Authorization: Bearer <INGESTION_COLLECTOR_TOKEN>`;
- `X-Telemetry-Org` and `X-Telemetry-Team` from the verified identity.

Client cookies, client keys, client-supplied tenant headers, and other headers are **not forwarded**. The OTLP body is unchanged; the Collector sanitizes its resource attributes. The gateway accepts HTTP POST, bodies up to 8 MiB, and `application/x-protobuf` or `application/json`. SDK integrations use HTTP/protobuf.

| Secret                      | Purpose                                        | Recipient                                |
| --------------------------- | ---------------------------------------------- | ---------------------------------------- |
| Client key                  | Identifies a backend and its organization/team | That backend only                        |
| `INGESTION_COLLECTOR_TOKEN` | Authenticates trusted internal senders         | Gateway and internal platform components |

**Hashes are not decrypted.** Each incoming key is hashed again and compared with the registry. Keep digests in the server-side registry and plaintext keys in the application's secret store. Never distribute the internal Collector token to external backends.

`apps/backend/src/main.ts` registers ingestion middleware before ordinary NestJS controllers. Validation and forwarding live in `apps/backend/src/modules/ingestion/`. Ingestion deliberately bypasses ordinary JSON parsers and API response wrappers.

### OpenTelemetry Collector

The configuration is in `infra/charts/observability/templates/collector-config.yaml`. The ingestion receiver uses HTTP port 4319, bearer authentication, and `include_metadata: true`.

```yaml
processors:
  resource/ingestion:
    attributes:
      - key: org.slug
        action: delete
      - key: team.id
        action: delete
      - key: org.slug
        from_context: metadata.x-telemetry-org
        action: upsert
      - key: team.id
        from_context: metadata.x-telemetry-team
        action: upsert
  batch:
    timeout: 10s
    send_batch_size: 512

# For traces/ingestion, logs/ingestion, and metrics/ingestion:
# processors: [memory_limiter, resource/ingestion, batch]
```

Ordering matters: **sanitize resources before batching**, while request metadata is available. Client-supplied `org.slug` and `team.id` are removed and replaced by verified gateway values. Other resource and signal attributes remain intact.

Batching reduces small ClickHouse writes. Memory limiting, export queues, and retries improve resilience but do not guarantee lossless delivery: the current queue is not configured for persistence.

Ports 4317/4318 serve trusted internal OTLP pipelines and are **not onboarding endpoints**. Do not expose these paths to client keys. A NetworkPolicy additionally restricts Collector access; enforcement depends on the Kubernetes CNI.

### Storage and multi-tenancy

ClickHouse stores telemetry in column-oriented tables: `otel_traces`, `otel_logs`, and signal-specific `otel_metrics_*` tables. Resource attributes are maps. The query layer adds materialized `org_slug` and `team_id` columns derived from `ResourceAttributes['org.slug']` and `ResourceAttributes['team.id']`.

The query API derives the organization from the authenticated session and applies team/service permissions. Its query principle is:

```sql
SELECT DISTINCT ServiceName
FROM otel_traces
WHERE org_slug = {tenant:String};
-- tenant is a bound query parameter, not a freely chosen client header.
```

**Isolation model:** Shared tables with server-enforced tenant filters, not a separate database per customer or automatically enforced ClickHouse row-level security. Direct database access bypasses API checks and must be secured separately.

The chart enables persistent storage by default: a 10-GiB PVC for ClickHouse and a 1-GiB PVC for the backend SQLite database. Pod replacement retains these volumes; disabling persistence uses ephemeral pod storage. The Collector configures a seven-day TTL for its telemetry tables. PVCs are not backups; deleting the local Kind cluster can remove local storage. The shared SQLite file limits the backend to one replica.

### UI and dynamic service discovery

Tenant-scoped **`DISTINCT ServiceName`** queries discover services across traces, logs, and supported gauge/sum/histogram metric tables. No hardcoded service-list edit is necessary. Filters respect their data scope and user permissions.

Filter options load initially and refresh **every 30 seconds**. There is no guarantee that new services appear within less than 30 seconds: SDK export intervals, Collector batching, storage, and UI polling accumulate. Discovery requires stored telemetry. Trace-based performance views need traces; metrics alone do not create request spans.

<a id="first-installation"></a>

## 2. FIRST INSTALLATION

### Prerequisites

- Node.js **24 or newer**, Yarn **1.22.22**, and Git;
- A running Docker engine, Kind, kubectl, and Helm;
- Bash only for optional shell examples; on Windows, use Git Bash for those examples;
- Optionally the .NET 8 SDK for section 3.

The standard setup commands work in PowerShell, macOS Terminal, and Linux terminals. Install Yarn and make it available on PATH first. Start Docker Desktop before setup.

If Yarn is not installed:

```bash
npm install --global yarn@1.22.22
```

Before cloning, check that the required tools are available:

```bash
node --version                 # v24 or newer
yarn --version                 # 1.22.22
docker version                 # client AND running engine
kind version
kubectl version --client
helm version --short
```

### Clone and install

```bash
git clone https://github.com/burakcitaci/telemetry-hub.git
cd telemetry-hub
yarn install --frozen-lockfile
```

The root workspaces use Yarn; `packageManager` and `yarn.lock` specify the version and dependencies. Run all Yarn commands below from the repository root.

### Configure the first administrator

```bash
yarn setup
```

The wizard asks for your organization slug, email, first team, and a password. It writes local Kubernetes secrets to `.local/helm-secrets.json` and displays an initial ingestion key once; save the key for application setup. The file is local-only and must not be committed or shared.

<a id="first-admin"></a>

There is **no default password or public registration**. Kubernetes Secrets are base64-encoded, not encrypted by that encoding. Production requires restricted RBAC, encryption at rest, and an appropriate secret manager.

### Start the local cluster

```bash
yarn cluster:init
yarn cluster:status
```

`cluster:init` creates the Kind cluster and namespace if needed, installs the metrics server, applies the generated secrets, builds and loads the backend image, and installs or upgrades Helm release `observability`. ClickHouse, Collector, and backend run in the cluster. The first run can take several minutes.

Keep each command running in its own terminal:

```bash
# Terminal 1: expose the backend
yarn ports:backend
```

```bash
# Terminal 2: start the frontend
yarn dev:frontend
```

<a id="first-login"></a>

### First login and additional users

1. Open `http://localhost:5000` or Vite's printed fallback URL. Keep the backend port-forward running; the API is at `http://localhost:3001`.
2. Sign in with the organization, email, and password entered in the setup wizard. The account becomes available after the first backend start.
3. Open **Administration**. The setup wizard has already created your first team; create additional teams and users, assign roles/teams and change passwords there.
4. Follow section 3 to connect an application so its telemetry appears in the dashboard. Use the client key for ingestion, not the admin password.

Backend CORS permits Vite fallback ports 5000–5003; check allowed origins if another port is selected. There are no usable default credentials without a successful bootstrap. For login failures, check organization/email, the backend port-forward and the SQLite database being used. The local development database and the cluster backend PVC contain separate user accounts.

<a id="local-backend-development"></a>

### Optional: Develop NestJS locally with .env

Instead of forwarding the backend, forward its dependencies in separate terminals:

```bash
yarn ports:clickhouse
kubectl --context kind-observability -n telemetry-hub port-forward svc/opentelemetry-collector 4319:4319
```

Create `apps/backend/.env`. The internal token must match the Collector's configured token. Replace all placeholders:

```dotenv
PORT=3001
HOST=0.0.0.0
CLICKHOUSE_HOST=localhost
CLICKHOUSE_PORT=8123
CLICKHOUSE_DATABASE=default
CLICKHOUSE_USERNAME=default
CLICKHOUSE_PASSWORD=
AUTH_DB_PATH=./platform.sqlite
AUTH_JWT_SECRET=<at-least-32-random-characters>
AUTH_USERS_JSON=[{"tenantSlug":"demo","email":"admin@example.com","role":"admin","teams":["backend"],"passwordHash":"<scrypt$SALTHEX$HASHHEX-from-bootstrap>"}]
INGESTION_COLLECTOR_ENDPOINT=http://localhost:4319
INGESTION_COLLECTOR_TOKEN=<same-internal-token-as-the-Collector>
INGESTION_KEYS_JSON=[{"keyHash":"<SHA256_HEX_OF_PROVISIONED_CLIENT_KEY>","orgSlug":"demo","teamId":"backend","expiresAt":1893456000000}]
```

`<SHA256_HEX_OF_PROVISIONED_CLIENT_KEY>` is a **nonfunctional placeholder**. Before starting, replace it with the lowercase SHA-256 hexadecimal digest of a provisioned client key (exactly 64 hexadecimal characters); the setup wizard stores the corresponding bootstrap data in `.local/helm-secrets.json`. Local SQLite is a separate user/team database, not the cluster backend's database. Do not commit `.env` or database files.

```bash
yarn dev:backend
# Start the frontend separately: yarn dev:frontend
```

`dev:backend` first compiles with TypeScript, then starts the bundled backend. This preserves the decorator metadata Nest needs for dependency injection and DTO validation. Restart the command after backend code changes.

Start the frontend and local backend with their separate workspace commands above. Use `yarn cluster:reload-backend` to rebuild and update the cluster backend after code changes.

## 3. HOW TO: INTEGRATE A NEW BACKEND (PLUG & PLAY)

<a id="backend-onboarding"></a>

### Deploy an app into the local Kind cluster

Use the repository command when the application itself should run inside this clone's Kind cluster.
This is separate from configuring an app running on your workstation or another server.

Prerequisites:

- The Hub has been installed with `yarn setup` and `yarn cluster:init`; keep the cluster running.
- Sign in to the dashboard and note the exact organization and team slugs. The setup wizard creates
  the initial team (default: `backend`); create another team under **Administration** if needed.
- The app has a Dockerfile and already emits OTLP using an OpenTelemetry SDK or auto-instrumentation
  that reads standard `OTEL_*` environment variables. The app must remain running as a worker/service.
- The image is pullable by Kind, or you will build it locally with `--build-context`.

Preview first from the repository root. Replace the example slugs, environment and image:

```bash
yarn backend:deploy --name orders-api --image registry.example.com/orders-api:1.0 \
  --org demo --team backend --env dev
```

`--name` is a DNS-safe Kubernetes Deployment name and the default OpenTelemetry service name.
`--service <service-name>` can override the service name. The organization and team must already
exist in the Hub. `--env` is an explicit label such as `dev`, `staging`, or `production`.

For a local Docker build, use a local image tag and the directory containing the app's Dockerfile:

```bash
yarn backend:deploy --name orders-api --image orders-api:dev \
  --build-context <path-to-app> --org demo --team backend --env dev
```

The build context defaults to `Dockerfile`; use `--dockerfile <file>` for another filename.
The plan-only command does not change anything. Review the plan, then add `--apply` to execute the
same command. Applying builds/loads the local image if requested, creates or reuses a seven-day
client key in Kubernetes Secrets, and deploys the workload. Key plaintext is not printed. Key
rotation is explicit with `--rotate-key`.

The tool supplies the OTLP gateway endpoint, HTTP/protobuf protocol, service name, environment and
key to the app container, plus a local proxy sidecar to reach the Hub. The key determines the
authorized organization/team; do not set those identity attributes in the client. No inbound Service
or Ingress is created. Check the workload and app logs, then generate telemetry and select the same
organization, team, service and environment in the dashboard:

```bash
kubectl --context kind-observability get pods -n telemetry-hub
kubectl --context kind-observability logs -n telemetry-hub deployment/orders-api -c worker
```

Private registry authentication must already be configured for the Kind cluster. For all flags, run
`yarn backend:deploy --help`. Use the manual access and OTLP setup below for an app that runs outside
Kind.

### Provision access

Recommended: sign in as an organization administrator, open **Administration → Ingestion Keys**, select the owning team and expiry, then generate and immediately copy the key. The plaintext is shown once; only its SHA-256 digest is stored. Pass that plaintext to the external backend and send it as `X-API-Key` on OTLP HTTP requests. Revoke the key from the same table when it is no longer needed.

**No proprietary SDK is required.** Use your language's OpenTelemetry SDK or appropriate automatic instrumentation. No language-specific ingestion controller is needed for Go, Python, or .NET.

An administrator creates the destination team, generates a random URL-safe key of 32–256 characters, and adds its lowercase SHA-256 hexadecimal digest to the registry. Example structure; replace the digest placeholder before use:

```json
[
  {
    "keyHash": "<SHA256_HEX_OF_PROVISIONED_CLIENT_KEY>",
    "orgSlug": "demo",
    "teamId": "backend",
    "expiresAt": 1893456000000,
    "revoked": false
  }
]
```

**`expiresAt` is required**, expressed as Unix time in milliseconds. This example expires on January 1, 2030 UTC; use your intended validity period instead. The bootstrap sets a 30-day lifetime. Preserve existing records when adding keys.

The backend receives only the plaintext key, not authority to choose its organization/team. The gateway validates the registry association but does not check SQLite team existence per request. Provisioning must therefore establish an authorized, valid mapping.

With Helm, the registry is stored in `telemetry-ingestion`. Restart the backend after changes because secret environment variables and the in-memory map do not update live:

```bash
kubectl --context kind-observability -n telemetry-hub rollout restart deployment/backend
kubectl --context kind-observability -n telemetry-hub rollout status deployment/backend
```

Revocation and rotation also take effect after reload. Rotating the internal Collector token requires coordinated updates of all internal senders and the Collector.

### Configure OpenTelemetry

```bash
export OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:3001/api/ingest"
export OTEL_EXPORTER_OTLP_HEADERS="x-api-key=<provisioned-client-key>"
export OTEL_EXPORTER_OTLP_PROTOCOL="http/protobuf"
export OTEL_SERVICE_NAME="customer-orders-api"
```

| Variable                      | Meaning                             |
| ----------------------------- | ----------------------------------- |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Gateway base URL, not the Collector |
| `OTEL_EXPORTER_OTLP_HEADERS`  | Client key in `name=value` format   |
| `OTEL_EXPORTER_OTLP_PROTOCOL` | HTTP/protobuf rather than gRPC      |
| `OTEL_SERVICE_NAME`           | Stable technical service identity   |

Your SDK integration must support or explicitly read these variables. Signal paths are `/api/ingest/v1/traces`, `/api/ingest/v1/logs`, and `/api/ingest/v1/metrics`. Signal-specific endpoint variables and explicit exporter URLs require the full signal path.

`localhost` works only on the same host. In Kubernetes it refers to the pod itself; use, for example, `http://backend.telemetry-hub.svc.cluster.local:3001/api/ingest` if network rules permit it. External customers need an HTTPS gateway endpoint; local port forwarding is not public SaaS access.

Choose distinct names for distinct logical backends. Instances of the same application may share a service name and use different `service.instance.id` values. The gateway does not enforce unique names. Never put keys or personal data into names, tags, or logs.

### Standalone C# example (.NET 8)

With the .NET 8 SDK installed, create a separate project outside the repository:

```bash
dotnet new console --framework net8.0 --name TelemetryExample --output ../TelemetryExample
dotnet add ../TelemetryExample/TelemetryExample.csproj package OpenTelemetry --version 1.18.0
dotnet add ../TelemetryExample/TelemetryExample.csproj package OpenTelemetry.Exporter.OpenTelemetryProtocol --version 1.18.0
dotnet add ../TelemetryExample/TelemetryExample.csproj package Microsoft.Extensions.Logging --version 8.0.0
```

Replace `Program.cs`. All three signals share the gateway's verified identity; organization/team attributes are deliberately not set by the client.

```csharp
using System.Diagnostics;
using System.Diagnostics.Metrics;
using Microsoft.Extensions.Logging;
using OpenTelemetry;
using OpenTelemetry.Exporter;
using OpenTelemetry.Logs;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;

var endpoint = Environment.GetEnvironmentVariable("OTEL_EXPORTER_OTLP_ENDPOINT")
    ?? throw new InvalidOperationException("Missing OTLP endpoint.");
var headers = Environment.GetEnvironmentVariable("OTEL_EXPORTER_OTLP_HEADERS")
    ?? throw new InvalidOperationException("Missing OTLP headers.");
var service = Environment.GetEnvironmentVariable("OTEL_SERVICE_NAME") ?? "example-csharp";
if (Environment.GetEnvironmentVariable("OTEL_EXPORTER_OTLP_PROTOCOL") != "http/protobuf")
    throw new InvalidOperationException("This example requires http/protobuf.");
var uri = new Uri(endpoint);
if (uri.Scheme != "https" && !(uri.Scheme == "http" && uri.IsLoopback))
    throw new InvalidOperationException("Use HTTPS; HTTP is only allowed for loopback tests.");
var resource = ResourceBuilder.CreateDefault().AddService(service);

void Configure(OtlpExporterOptions options, string signal)
{
    options.Protocol = OtlpExportProtocol.HttpProtobuf;
    options.Endpoint = new Uri($"{endpoint.TrimEnd('/')}/v1/{signal}");
    options.Headers = headers;
    options.TimeoutMilliseconds = 10000;
}

using var traces = Sdk.CreateTracerProviderBuilder()
    .SetResourceBuilder(resource).AddSource(service)
    .AddOtlpExporter(o => Configure(o, "traces")).Build();
using var metrics = Sdk.CreateMeterProviderBuilder()
    .SetResourceBuilder(resource).AddMeter(service)
    .AddOtlpExporter(o => Configure(o, "metrics")).Build();
using var loggerFactory = LoggerFactory.Create(builder => builder.AddOpenTelemetry(o =>
{
    o.SetResourceBuilder(resource);
    o.IncludeFormattedMessage = true;
    o.IncludeScopes = true;
    o.AddOtlpExporter(exporter => Configure(exporter, "logs"));
}));
using var source = new ActivitySource(service);
using var meter = new Meter(service);
var completed = meter.CreateCounter<long>("jobs.completed", "{job}");
var failed = meter.CreateCounter<long>("jobs.failed", "{job}");
var duration = meter.CreateHistogram<double>("jobs.duration", "ms");
var logger = loggerFactory.CreateLogger("DemoJob");
var watch = Stopwatch.StartNew();

using (var activity = source.StartActivity("demo-job", ActivityKind.Internal))
{
    logger.LogInformation("Demo job started");
    try
    {
        await Task.Delay(100);
        if (args.Contains("--fail"))
            throw new InvalidOperationException("Intentional test failure");
        completed.Add(1);
        activity?.SetStatus(ActivityStatusCode.Ok);
        logger.LogInformation("Demo job succeeded");
    }
    catch (Exception ex)
    {
        failed.Add(1);
        activity?.RecordException(ex); // Exception type, message, and stack trace as a span event
        activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
        logger.LogError(ex, "Demo job failed");
    }
    finally
    {
        duration.Record(watch.Elapsed.TotalMilliseconds);
    }
} // End the span before ForceFlush

var flushed = traces.ForceFlush(10000) & metrics.ForceFlush(10000);
// loggerFactory.Dispose() flushes the log provider on shutdown.
return flushed ? 0 : 1;
```

A thrown and caught exception has a stack trace. `RecordException` creates an exception event; the error status is set separately. An exception log alone does not create that span event. Official references: [.NET OTLP exporters](https://opentelemetry.io/docs/languages/dotnet/exporters/) and [recording exceptions](https://opentelemetry.io/docs/languages/dotnet/traces/reporting-exceptions/).

With the four environment variables set, run:

```bash
dotnet run --project ../TelemetryExample/TelemetryExample.csproj
dotnet run --project ../TelemetryExample/TelemetryExample.csproj -- --fail
```

Start the example with `dotnet run`. It emits once and is not an HTTP server. Web applications should also register suitable ASP.NET Core/HTTP instrumentation.

## 4. VERIFICATION & TROUBLESHOOTING

### End-to-end verification

- [ ] Backend, Collector, and ClickHouse are ready according to `yarn cluster:status`.
- [ ] Backend forwarding is running; `http://localhost:3001/health` is reachable.
- [ ] Open the dashboard and sign in to the correct organization.
- [ ] Run the example normally and with `--fail`.
- [ ] Check organization, team, time range, and environment filters; remove restrictive service/status filters initially.
- [ ] Wait for SDK export, Collector batching, and UI refresh, or reload the view.
- [ ] Verify the service, `demo-job` trace, exception event and stack trace, logs, and custom metrics.
- [ ] Check with a different tenant: these records must not be visible there.

An empty OTLP JSON export checks gateway authentication and connectivity but creates **no service data**:

```bash
read -r -s -p "Client key: " HUB_CLIENT_KEY
echo
printf 'header = "X-API-Key: %s"\n' "$HUB_CLIENT_KEY" | curl --config - \
  --include --request POST http://localhost:3001/api/ingest/v1/traces \
  --header 'Content-Type: application/json' --data '{"resourceSpans":[]}'
unset HUB_CLIENT_KEY
```

The secret header is passed through stdin rather than a process argument. Avoid verbose header diagnostics with real keys in shared logs. HTTP success confirms pipeline acceptance, not durable ClickHouse persistence.

### Common failures

| Symptom                                | Cause / checks                                                                                                                                                                                                  |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **401 Unauthorized**                   | Missing/invalid key, unknown hash, revoked or expired key. Send plaintext, not the digest; restart the backend after registry changes. An upstream 401 can also indicate a mismatched internal Collector token. |
| **415 Unsupported Media Type**         | Gateway expects JSON or Protobuf over HTTP, not `application/grpc`. Set `http/protobuf`. Actual gRPC connections may fail at transport level instead of returning HTTP 415.                                     |
| **404**                                | Incorrect signal path or HTTP method. POST to `/api/ingest/v1/{signal}`.                                                                                                                                        |
| **400 / 413**                          | Empty/malformed OTLP body or 8-MiB limit exceeded. Check SDK configuration and batches.                                                                                                                         |
| **503 / export timeout**               | Missing token, unavailable Collector, or upstream failure. Check endpoints, pods, forwarding, and network rules.                                                                                                |
| Service missing                        | No stored telemetry, wrong mapping, insufficient permissions, or restrictive time/environment filters. Consider export intervals and batching.                                                                  |
| Metrics but no traces                  | Meter providers do not create spans. Check ActivitySource registration, instrumentation, and sampling.                                                                                                          |
| Pod port-forward: `connection refused` | Process does not listen on the target port. Check bind address, container logs, and actual HTTP port; `containerPort` does not open a listener.                                                                 |
| `CreateContainerConfigError`           | Missing secret or required secret field. Provision before Helm deployment.                                                                                                                                      |
| Login fails                            | Check organization, bootstrap identity, and password. Session cookies are HttpOnly/Secure/SameSite=Lax: do not mix hostnames; configure local HTTPS if necessary.                                               |

### Diagnostics and quality checks

```bash
yarn logs:backend
yarn logs:collector
kubectl --context kind-observability -n telemetry-hub get events --sort-by=.lastTimestamp
yarn check:all
yarn build
```

Additional backend checks are listed in `apps/backend/package.json`. Never publish registry contents or complete secret manifests in diagnostics.

### Repository map

```text
apps/backend/                         NestJS query, authentication, and ingestion APIs
  src/modules/ingestion/              Key validation and OTLP forwarding
  src/modules/auth/                   Users, teams, sessions, and SQLite
apps/frontend/                        React/Vite dashboard
infra/charts/observability/            Helm chart, Collector, and network policies
infra/kind/                           Cluster and image workflow
scripts/                              Repository tools, including Graphify
graphify-out/                         Architecture map; verify coverage before use
```

### Before production SaaS operation

Provide HTTPS at the public gateway, secure internal connections, restricted ClickHouse access, persistent storage with backup/restore, rate limits and quotas, robust tenant-isolation tests, and a centralized audited key lifecycle with timely revocation. Key-based identity prevents tenant spoofing but does not replace network security or protection against stolen valid keys.
