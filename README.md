# Telemetry Hub

**Sprache:** Deutsch | [English](README.en.md)

**Telemetry Hub** bündelt Traces, Logs und Metriken beliebiger Anwendungen in einer mandantenfähigen Observability-Plattform. Anwendungen senden standardisiertes OpenTelemetry Protocol (OTLP); ein Ingestion Gateway ordnet die Daten einer verifizierten Organisation und einem Team zu. Das Dashboard unterstützt die Untersuchung von Services, Requests, Fehlern und Messwerten.

**Zielgruppen:** Entwickler integrieren Anwendungen, Administratoren verwalten Zugänge und Teams, Kunden untersuchen den ihnen zugewiesenen Datenbereich.

**Monitoring-API:** [Einheitliche Regeln für Logs, Metriken und Traces](apps/backend/src/modules/monitors/README.md) — JSON-Vertrag, Konfiguration, Alert-Historie und Legacy-Migration.

> **Implementierungsstand:** Das Repository verwendet **Yarn Classic, Kind und Helm**. `pnpm install`, `pnpm dev`, `pnpm start:example-csharp` und `infra/docker-compose.local.yml` sind derzeit kein vorhandener, unterstützter Workflow. Die Anleitung unten beschreibt tatsächlich verfügbare Befehle. Die Plattform ist eine lokale Test-/Demoumgebung, keine unverändert produktionsfertige SaaS-Installation.

## 1. ARCHITEKTUR & KOMPONENTEN

### Drei Schichten und eine getrennte Leseseite

Die Telemetrie-Pipeline besteht aus **Ingestion Gateway → Collector → Storage**. Der UI Layer ist die getrennte, authentifizierte Leseseite.

```text
Fremd-Backend: Go / Python / .NET / Java / ...
  OTLP HTTP/protobuf + X-API-Key
  Client-Attribute sind NICHT vertrauenswürdig
                    |
                    v
  [1] NestJS Ingestion Gateway :3001
      POST /api/ingest/v1/{traces,logs,metrics}
      SHA-256(Key) -> Registry -> verifizierte Org / Team
      Neue Upstream-Header statt Durchreichen von Client-Headern
                    |
                    | internes Bearer-Token
                    | X-Telemetry-Org / X-Telemetry-Team
                    v
  [2] OpenTelemetry Collector :4319 (intern)
      Bearer-Authentifizierung + include_metadata
      memory_limiter -> resource/ingestion -> batch
      Client-org/team löschen, Gateway-org/team einsetzen
                    |
                    v
  [3] ClickHouse :9000 / :8123 (intern)
      otel_traces / otel_logs / otel_metrics_*
      org_slug und team_id aus ResourceAttributes
                    ^
                    | parametrisierte Tenant-/Team-Abfragen
      NestJS Query API + Benutzer-/Team-Berechtigungen
                    ^
                    | authentifizierte HTTP-Session
      React / Vite Dashboard, lokal bevorzugt :5000
      dynamische Service-Erkennung aus gespeicherter Telemetrie
```

### Ingestion Gateway und Anti-Spoofing — TASK-INT-2

Das Gateway erwartet einen zufälligen Client-Key im Header **`X-API-Key`**. Es berechnet SHA-256 über den unveränderten Key und sucht den Hex-Hash in `INGESTION_KEYS_JSON`. Der passende Eintrag liefert `orgSlug` und `teamId`; unbekannte, abgelaufene oder widerrufene Keys werden abgewiesen.

**Aktuell erfolgt die Prüfung synchron:** Die Registry wird beim Start in eine In-Memory-Map geladen; Hashbildung und Lookup benötigen keinen Datenbankzugriff pro Request. Asynchron ist die HTTP-Weiterleitung. Eine asynchrone Datenbankauflösung mit Cache und sofortiger Invalidierung ist ein möglicher Produktionsausbau, aber nicht implementiert.

Die Middleware erzeugt für die Weiterleitung einen neuen Header-Satz:

- `Content-Type` des akzeptierten OTLP-Requests;
- `Authorization: Bearer <INGESTION_COLLECTOR_TOKEN>`;
- `X-Telemetry-Org` und `X-Telemetry-Team` aus der verifizierten Zuordnung.

Client-Cookies, Client-Key, selbst gesetzte Tenant-Header und sonstige Client-Header werden **nicht weitergereicht**. Der OTLP-Body bleibt unverändert; seine Resource-Attribute bereinigt der Collector. Akzeptiert werden HTTP POST, maximal 8 MiB Body sowie `application/x-protobuf` oder `application/json`. Für SDK-Integrationen wird HTTP/protobuf verwendet.

| Geheimnis | Zweck | Empfänger |
| --- | --- | --- |
| Client-Key | Identifiziert ein Backend und dessen Org/Team | Nur das betreffende Backend |
| `INGESTION_COLLECTOR_TOKEN` | Authentifiziert vertrauenswürdige interne Sender | Gateway und interne Plattformkomponenten |

**Ein Hash wird nicht entschlüsselt.** Telemetry Hub hasht jeden eingehenden Key erneut und vergleicht das Ergebnis mit der Registry. Der Hash gehört in die serverseitige Registry, der Klartext-Key in den Secret Store der Anwendung. Der interne Collector-Token darf niemals an Fremd-Backends ausgegeben werden.

Implementierung: `apps/backend/src/main.ts` registriert die Ingestion-Middleware vor den regulären NestJS-Controllern. Die Key-Prüfung und Weiterleitung liegen in `apps/backend/src/modules/ingestion/`. Der Ingestion-Pfad umgeht bewusst die normalen JSON-Parser und API-Response-Wrapper.

### OpenTelemetry Collector

Die maßgebliche Konfiguration liegt in `infra/charts/observability/templates/collector-config.yaml`. Der Ingestion-Receiver nutzt HTTP-Port 4319, Bearer-Authentifizierung und `include_metadata: true`.

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

# Für traces/ingestion, logs/ingestion und metrics/ingestion:
# processors: [memory_limiter, resource/ingestion, batch]
```

Die Reihenfolge ist sicherheitsrelevant: **Resource-Bereinigung vor Batching**, solange die Request-Metadaten verfügbar sind. Vom Client gesetzte `org.slug`-/`team.id`-Werte werden gelöscht und durch die Gateway-Zuordnung ersetzt. Andere Ressourcen- und Signalattribute bleiben erhalten.

Batching reduziert kleine ClickHouse-Schreiboperationen. Memory-Limiter, Export-Queue und Retries unterstützen die Stabilität, garantieren aber keine verlustfreie Zustellung: Die aktuelle Queue ist nicht persistent konfiguriert.

Die zusätzlichen Collector-Ports 4317/4318 bedienen interne OTLP-Pipelines und sind **keine Onboarding-Endpunkte**. Diese vertrauenswürdigen Pfade dürfen nicht mit Client-Keys zugänglich gemacht werden. Eine NetworkPolicy begrenzt den Collector-Zugriff zusätzlich; ihre Durchsetzung hängt vom Kubernetes-CNI ab.

### Storage Layer und Multi-Tenancy

ClickHouse speichert Telemetrie spaltenorientiert. Traces und Logs liegen in `otel_traces` und `otel_logs`, Metriken in signaltypspezifischen `otel_metrics_*`-Tabellen. Resource-Attribute werden als Maps gespeichert. Der Query Layer ergänzt materialisierte `org_slug`-/`team_id`-Spalten aus `ResourceAttributes['org.slug']` beziehungsweise `ResourceAttributes['team.id']`.

Die Query API übernimmt die Organisation aus der authentifizierten Session und berücksichtigt Team- und Service-Berechtigungen. Das Prinzip der Abfragen ist:

```sql
SELECT DISTINCT ServiceName
FROM otel_traces
WHERE org_slug = {tenant:String};
-- tenant ist ein gebundener Queryparameter, kein frei wählbarer Client-Header.
```

**Isolationsmodell:** gemeinsame Tabellen mit serverseitig erzwungenen Tenant-Filtern, keine separate Datenbank pro Kunde und keine automatisch wirksame ClickHouse Row-Level Security. Direkter Datenbankzugriff kann diese API-Prüfungen umgehen und muss separat geschützt werden.

Die lokale ClickHouse-Installation verwendet temporären Pod-Speicher und eine Telemetrie-TTL von sieben Tagen. Pod-Neuerstellung oder Cluster-Löschung kann die Daten entfernen; dies ist kein Backup. Die Benutzer-/Team-Verwaltung nutzt SQLite auf einem Backend-PVC. Deshalb erlaubt das Chart nur eine Backend-Replik. Eine Cluster-Löschung entfernt auch diese lokale Datenhaltung.

### UI Layer und dynamische Services — TASK-INT-1

Service-Namen werden durch mandantenbezogene **`DISTINCT ServiceName`**-Abfragen über Traces, Logs und unterstützte Gauge-/Sum-/Histogram-Metriktabellen ermittelt. Neue Anwendungen benötigen keine Änderung einer hartcodierten Service-Liste. Filter berücksichtigen den jeweiligen Datenbereich und die Benutzerberechtigungen.

Filteroptionen werden beim Laden und anschließend **alle 30 Sekunden** aktualisiert. „Neue Services erscheinen immer in weniger als 30 Sekunden“ ist keine Garantie: SDK-Exportintervalle, Collector-Batching, Speicherung und UI-Polling addieren sich. Ein Service erscheint erst nach tatsächlich gespeicherter Telemetrie. Trace-basierte Performance-Ansichten benötigen Traces; reine Metriken erzeugen keine Request-Spans.

## 2. LOCAL SETUP & INSTALLATION

### Voraussetzungen

- Node.js **24 oder neuer**, Yarn **1.22.22**, Git;
- Docker mit laufender Engine, Kind, kubectl und Helm;
- Bash für die Infrastruktur-Skripte; unter Windows beispielsweise Git Bash mit diesen Werkzeugen im PATH;
- optional das .NET-8-SDK für das Beispiel in Abschnitt 3.

Die folgenden Shell-Beispiele verwenden **Bash**. PowerShell unterstützt die Heredocs nicht unverändert. Yarn muss vorab installiert und im PATH verfügbar sein.

### TASK-SETUP-1: Klonen und installieren

```bash
git clone https://github.com/burakcitaci/telemetry-hub.git
cd telemetry-hub
yarn install --frozen-lockfile
```

Yarn ist durch `packageManager` und `yarn.lock` vorgegeben. `pnpm install` ist keine getestete Alternative; ein Wechsel benötigt eine eigene Workspace-/Lockfile-Migration.

### TASK-SETUP-2: Cluster und Secrets vorbereiten

```bash
yarn cluster:create
kubectl --context kind-observability create namespace telemetry-hub
```

Bei vorhandenem Cluster beziehungsweise Namespace diese Erstellung überspringen. **Vor dem Helm-Deployment** müssen `backend-auth` und `telemetry-ingestion` vorhanden sein; das Chart erstellt diese Secrets nicht selbst.

Das folgende Bootstrap ist für eine **frische lokale Installation**. Es erzeugt einen Admin für `demo`, das Team `backend`, einen Client-Key und ein unabhängiges Collector-Token. `kubectl create` verhindert das versehentliche Überschreiben bestehender Secrets. Den einmalig ausgegebenen Client-Key sicher in die Zielanwendung übernehmen.

```bash
read -r -s -p "Lokales Admin-Passwort: " HUB_ADMIN_PASSWORD
echo
export HUB_ADMIN_PASSWORD
node --input-type=module <<'NODE'
import { randomBytes, createHash, scryptSync } from 'node:crypto';
import { spawnSync } from 'node:child_process';
if (!process.env.HUB_ADMIN_PASSWORD || process.env.HUB_ADMIN_PASSWORD.length < 12)
  throw new Error('Bitte mindestens 12 Zeichen für das Admin-Passwort verwenden.');
const key = randomBytes(32).toString('base64url');
const salt = randomBytes(16);
const passwordHash = `scrypt$${salt.toString('hex')}$${scryptSync(process.env.HUB_ADMIN_PASSWORD, salt, 64).toString('hex')}`;
const secrets = [
  ['backend-auth', {
    AUTH_JWT_SECRET: randomBytes(48).toString('base64url'),
    AUTH_USERS_JSON: JSON.stringify([{ tenantSlug: 'demo', email: 'admin@example.com',
      role: 'admin', teams: ['backend'], passwordHash }]),
  }],
  ['telemetry-ingestion', {
    INGESTION_COLLECTOR_TOKEN: randomBytes(32).toString('base64url'),
    INGESTION_KEYS_JSON: JSON.stringify([{ keyHash: createHash('sha256').update(key).digest('hex'),
      orgSlug: 'demo', teamId: 'backend', expiresAt: Date.now() + 30 * 86400000 }]),
  }],
];
for (const [name, stringData] of secrets) {
  const manifest = { apiVersion: 'v1', kind: 'Secret', type: 'Opaque',
    metadata: { name, namespace: 'telemetry-hub' }, stringData };
  const result = spawnSync('kubectl', ['--context', 'kind-observability', 'create', '-f', '-'],
    { input: JSON.stringify(manifest), encoding: 'utf8' });
  if (result.error || result.status !== 0)
    throw new Error(`Secret ${name} nicht erstellt; bestehende Secrets und Cluster prüfen. Details aus Sicherheitsgründen unterdrückt.`);
}
console.log('Client-Key einmalig sicher übernehmen:', key);
NODE
unset HUB_ADMIN_PASSWORD
```

Das Bootstrap ist nicht transaktional: Scheitert die zweite Erstellung, kann das erste Secret schon existieren. Bestehende Konfiguration prüfen, nicht blind überschreiben. Keine Secrets in Tickets, öffentliche Logs oder Git kopieren.

Kubernetes Secrets sind base64-kodiert, nicht dadurch verschlüsselt. Produktion benötigt eingeschränkte RBAC-Rechte, Verschlüsselung der Datenhaltung und einen geeigneten Secret Manager.

### TASK-ONBOARD-1: Eigene Backends mit Environment integrieren

Das Instrumentierungs-SDK liest `OTEL_RESOURCE_ATTRIBUTES`. Für Environment-Filter
ist `deployment.environment.name` erforderlich; allein der Kubernetes-Namespace
oder `ASPNETCORE_ENVIRONMENT` erzeugt dieses Attribut nicht automatisch.

```bash
node scripts/deploy-backend.mjs --name sample-api --image local/sample:v1 \
  --service sample-api --org demo --team platform --env staging \
  --build-context /path/to/sample
# Plan prüfen, dann denselben Aufruf mit --apply ausführen.
```

Die Deployment-Variablen enthalten beispielsweise:

```yaml
- name: OTEL_RESOURCE_ATTRIBUTES
  value: deployment.environment.name=staging,org.slug=demo,team.id=platform
- name: DEPLOY_ENV
  value: staging
```

`--env` ist verpflichtend und wird zusätzlich im Ingestion-Key-Eintrag als `env`
gespeichert. Die Hub-Gateway leitet dieses Environment mit den vertrauenswürdigen
Org-/Team-Headern an den Collector weiter. Der Collector schreibt es vor dem
Batching nach `deployment.environment.name` für Logs, Traces und Metriken.
Ein bestehender Key ohne Environment wird beim erneuten Onboarding gebunden;
ein bereits anders gebundener Key benötigt `--rotate-key`.

Für manuelle Integrationen darf ein Key-Eintrag optional `"env": "staging"`
enthalten. Bestehende Einträge ohne `env` funktionieren weiterhin mit den
SDK-Resource-Attributen. Der Collector übernimmt das ältere
`deployment.environment` nur, wenn der aktuelle Attributname fehlt.
Ohne beide Attribute und ohne Key-Environment bleibt das Environment unbekannt;
der Hub erfindet keinen Standardwert. Alte Telemetrie wird nicht nachträglich
umbenannt. Das SDK muss Resource-Metadaten für alle gewünschten Signalarten
exportieren; `OTEL_RESOURCE_ATTRIBUTES` setzt keine Instrumentierung in Gang.

### TASK-SETUP-3: Infrastruktur und Dashboard starten

```bash
yarn cluster:init
yarn cluster:status
```

`cluster:init` baut das Backend-Image, lädt es in Kind und installiert beziehungsweise aktualisiert das Helm-Release `observability` im Namespace `telemetry-hub`. ClickHouse, Collector und Backend laufen im Cluster.

#### TASK-INFRA-METRICS-1: CPU und Speicher beobachten

`cluster:deploy` installiert auch den auf Version 0.8.1 fixierten Metrics Server.
Für einen bestehenden Kind-Cluster kann er separat mit `yarn cluster:metrics`
installiert werden. Die Ausnahme `--kubelet-insecure-tls` gilt ausschließlich für
den lokalen Kind-Cluster mit seinen selbst erzeugten Kubelet-Zertifikaten.

- [x] Node-CPU und Speicher mit Kapazität, Allocatable, Betriebssystem und Runtime.
- [x] Pod- und Container-Verbrauch in mCPU und MiB; Details zeigen Requests,
  Limits, Image-ID, Readiness und Restarts.
- [x] Workload-Verbrauch aggregiert zugehörige Pods anhand von Namespace und Label-Selector.
- [x] Image-Ansicht aggregiert die Container des ausgewählten Namespace.
- [x] Fehlende oder über 90 Sekunden alte Samples bleiben unbekannt; ohne
  vollständige Container-Samples wird kein scheinbar vollständiger Gesamtwert angezeigt.

```bash
kubectl --context kind-observability top nodes
kubectl --context kind-observability top pods -n telemetry-hub --containers
```

Die Metrics API liefert aktuelle CPU-Auslastung und Memory-Working-Set. Disk,
Netzwerk und dauerhafte historische Infrastruktur-Metriken brauchen eine eigene
Collector-/Kubelet-Pipeline. Images verbrauchen selbst keine CPU; die Image-Ansicht
zeigt den Verbrauch ihrer laufenden Container. Nicht gesetzte Requests/Limits
werden als `—` dargestellt.

> `docker-compose -f infra/docker-compose.local.yml up -d` ist derzeit nicht ausführbar: Die referenzierte Datei fehlt. Kind/Helm ist der vorhandene Infrastrukturpfad.

Jeweils in einem eigenen Terminal geöffnet lassen:

```bash
# Terminal 1: Backend erreichbar machen
yarn ports:backend
```

```bash
# Terminal 2: Frontend starten
yarn dev:frontend
```

Dashboard: `http://localhost:5000` oder die von Vite ausgegebene Ausweichadresse. Backend: `http://localhost:3001`. Anmeldung mit Organisation `demo`, `admin@example.com` und dem gewählten Passwort. Browser-Anmeldung und Ingestion-Key sind getrennte Mechanismen. Vite-Fallbackports 5000–5003 sind in der Backend-CORS-Konfiguration erlaubt; bei anderen Ports die Origin-Konfiguration prüfen.

### Optional: Backend lokal mit einer .env entwickeln

Statt des Backend-Port-Forwards die Abhängigkeiten weiterleiten, jeweils in einem eigenen Terminal:

```bash
yarn ports:clickhouse
kubectl --context kind-observability -n telemetry-hub port-forward svc/opentelemetry-collector 4319:4319
```

`apps/backend/.env` anlegen. Das interne Token muss zur vorhandenen Collector-Konfiguration passen. Sämtliche Platzhalter ersetzen:

```dotenv
PORT=3001
HOST=0.0.0.0
CLICKHOUSE_HOST=localhost
CLICKHOUSE_PORT=8123
CLICKHOUSE_DATABASE=default
CLICKHOUSE_USERNAME=default
CLICKHOUSE_PASSWORD=
AUTH_DB_PATH=./platform.sqlite
AUTH_JWT_SECRET=<mindestens-32-zufaellige-Zeichen>
AUTH_USERS_JSON=[{"tenantSlug":"demo","email":"admin@example.com","role":"admin","teams":["backend"],"passwordHash":"<scrypt$SALTHEX$HASHHEX-aus-dem-Bootstrap>"}]
INGESTION_COLLECTOR_ENDPOINT=http://localhost:4319
INGESTION_COLLECTOR_TOKEN=<identisches-internes-Token-wie-im-Collector>
INGESTION_KEYS_JSON=[{"keyHash":"<SHA256_HEX_OF_PROVISIONED_CLIENT_KEY>","orgSlug":"demo","teamId":"backend","expiresAt":1893456000000}]
```

`<SHA256_HEX_OF_PROVISIONED_CLIENT_KEY>` ist ein **nicht ausführbarer Platzhalter**. Vor dem Start durch den lowercase SHA-256-Hex-Hash des zufälligen, provisionierten Client-Keys ersetzen (genau 64 Hex-Zeichen), beispielsweise mit dem Bootstrap oben. Die lokale SQLite-Datei ist eine separate Benutzer-/Team-Datenbank, nicht die Datenbank des Cluster-Backends. `.env` und Datenbankdateien nicht committen.

```bash
yarn dev:backend
# Frontend separat: yarn dev:frontend
```

Ein Root-Skript `pnpm dev` beziehungsweise `yarn dev` existiert nicht. Cluster-Backend nach Codeänderungen mit `yarn cluster:reload-backend` aktualisieren.

## 3. HOW TO: NEUES BACKEND INTEGRIEREN (PLUG & PLAY)

### TASK-ONBOARD-1: Zugang provisionieren

**Kein proprietäres SDK erforderlich:** Anwendungen verwenden ihr OpenTelemetry-SDK oder eine passende Auto-Instrumentierung. Die Plattform benötigt keine sprachspezifischen Controller für Go, Python oder .NET.

Ein Administrator erstellt das Zielteam, generiert einen zufälligen URL-sicheren Key mit 32–256 Zeichen und ergänzt dessen lowercase SHA-256-Hex-Hash in der Registry. Beispielstruktur; den Hash-Platzhalter vor Verwendung ersetzen:

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

`expiresAt` ist **Pflicht** und verwendet Unix-Zeit in **Millisekunden**; der Beispielwert entspricht dem 1. Januar 2030 UTC und muss zur gewünschten Laufzeit passen. Das Bootstrap oben setzt 30 Tage Gültigkeit. Vorhandene Einträge beim Ergänzen erhalten. Das Fremd-Backend erhält nur den Klartext-Key und entscheidet nicht selbst über Org/Team. Das Gateway prüft die Registry-Zuordnung, nicht pro Request die Team-Existenz in SQLite: Eine autorisierte, gültige Zuordnung ist Verantwortung des Provisionierungsprozesses.

Im Helm-Betrieb liegt die Registry im Secret `telemetry-ingestion`. Nach Änderungen Backend neu starten, weil Secret-Umgebungsvariablen und die Map nicht live aktualisiert werden:

```bash
kubectl --context kind-observability -n telemetry-hub rollout restart deployment/backend
kubectl --context kind-observability -n telemetry-hub rollout status deployment/backend
```

Auch Widerruf und Rotation greifen erst nach dem Reload. Eine Rotation des internen Collector-Tokens erfordert eine koordinierte Aktualisierung aller internen Sender und des Collectors.

### TASK-ONBOARD-2: Vier standardisierte Umgebungsvariablen

```bash
export OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:3001/api/ingest"
export OTEL_EXPORTER_OTLP_HEADERS="x-api-key=<provisionierter-Client-Key>"
export OTEL_EXPORTER_OTLP_PROTOCOL="http/protobuf"
export OTEL_SERVICE_NAME="customer-orders-api"
```

| Variable | Bedeutung |
| --- | --- |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Basis-URL des Gateways, nicht des Collectors |
| `OTEL_EXPORTER_OTLP_HEADERS` | Client-Key im Headerformat `name=value` |
| `OTEL_EXPORTER_OTLP_PROTOCOL` | HTTP/protobuf statt gRPC |
| `OTEL_SERVICE_NAME` | Stabile technische Service-Identität |

Die SDK-Integration muss diese Variablen unterstützen oder explizit auslesen. Die Signalpfade lauten `/api/ingest/v1/traces`, `/api/ingest/v1/logs` und `/api/ingest/v1/metrics`. Bei signalspezifischen Endpoint-Variablen beziehungsweise expliziten Exporter-URLs den vollständigen Signalpfad setzen.

`localhost` gilt nur für denselben Host. Im Kubernetes-Pod zeigt es auf den Pod selbst; dort beispielsweise `http://backend.telemetry-hub.svc.cluster.local:3001/api/ingest` verwenden, sofern Netzwerkregeln dies erlauben. Externe Kunden benötigen einen HTTPS-Gateway-Endpunkt; lokale Port-Weiterleitung ist kein öffentlicher SaaS-Zugang.

Service-Namen pro fachlichem Backend eindeutig wählen. Instanzen derselben Anwendung dürfen denselben Namen mit unterschiedlichen `service.instance.id` verwenden. Das Gateway erzwingt keine Namenseindeutigkeit. Keine Keys oder personenbezogenen Daten in Namen, Tags oder Logs schreiben.

### TASK-ONBOARD-3: Eigenständiges C#-Beispiel (.NET 8)

Mit installiertem .NET-8-SDK ein separates Projekt außerhalb des Repositorys anlegen:

```bash
dotnet new console --framework net8.0 --name TelemetryExample --output ../TelemetryExample
dotnet add ../TelemetryExample/TelemetryExample.csproj package OpenTelemetry --version 1.18.0
dotnet add ../TelemetryExample/TelemetryExample.csproj package OpenTelemetry.Exporter.OpenTelemetryProtocol --version 1.18.0
dotnet add ../TelemetryExample/TelemetryExample.csproj package Microsoft.Extensions.Logging --version 8.0.0
```

`Program.cs` ersetzen. Alle drei Signale verwenden dieselbe Gateway-Zuordnung; Org/Team werden bewusst nicht vom Client gesetzt.

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
    ?? throw new InvalidOperationException("OTLP endpoint fehlt.");
var headers = Environment.GetEnvironmentVariable("OTEL_EXPORTER_OTLP_HEADERS")
    ?? throw new InvalidOperationException("OTLP headers fehlen.");
var service = Environment.GetEnvironmentVariable("OTEL_SERVICE_NAME") ?? "example-csharp";
if (Environment.GetEnvironmentVariable("OTEL_EXPORTER_OTLP_PROTOCOL") != "http/protobuf")
    throw new InvalidOperationException("Dieses Beispiel benötigt http/protobuf.");
var uri = new Uri(endpoint);
if (uri.Scheme != "https" && !(uri.Scheme == "http" && uri.IsLoopback))
    throw new InvalidOperationException("HTTPS verwenden; HTTP nur für Loopback-Tests.");
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
    logger.LogInformation("Demo job gestartet");
    try
    {
        await Task.Delay(100);
        if (args.Contains("--fail"))
            throw new InvalidOperationException("Absichtlicher Testfehler");
        completed.Add(1);
        activity?.SetStatus(ActivityStatusCode.Ok);
        logger.LogInformation("Demo job erfolgreich");
    }
    catch (Exception ex)
    {
        failed.Add(1);
        activity?.RecordException(ex); // Typ, Nachricht und Stack-Trace als Span-Event
        activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
        logger.LogError(ex, "Demo job fehlgeschlagen");
    }
    finally
    {
        duration.Record(watch.Elapsed.TotalMilliseconds);
    }
} // Span beenden, bevor ForceFlush aufgerufen wird

var flushed = traces.ForceFlush(10000) & metrics.ForceFlush(10000);
// loggerFactory.Dispose() leert beim Beenden den Log-Provider.
return flushed ? 0 : 1;
```

Eine geworfene und gefangene Exception besitzt einen Stack-Trace. `RecordException` ergänzt ein Exception-Event; der Fehlerstatus wird separat gesetzt. Ein Exception-Log allein erzeugt dieses Span-Event nicht. Offizielle Referenzen: [OTLP-Exporter für .NET](https://opentelemetry.io/docs/languages/dotnet/exporters/) und [Exception-Erfassung](https://opentelemetry.io/docs/languages/dotnet/traces/reporting-exceptions/).

Mit den vier zuvor gesetzten Variablen starten:

```bash
dotnet run --project ../TelemetryExample/TelemetryExample.csproj
dotnet run --project ../TelemetryExample/TelemetryExample.csproj -- --fail
```

`pnpm start:example-csharp` ist nicht definiert und startet kein Beispiel. `dotnet run` ist hier der dokumentierte Weg. Das Beispiel sendet einmalig und ist kein HTTP-Server. Für Web-Anwendungen zusätzlich passende ASP.NET-Core-/HTTP-Instrumentierungen registrieren.

## 4. VERIFIKATION UND TROUBLESHOOTING

### TASK-VERIFY-1: Ende-zu-Ende-Prüfung

- [ ] Backend, Collector und ClickHouse sind laut `yarn cluster:status` bereit.
- [ ] Backend-Port-Forward läuft; `http://localhost:3001/health` ist erreichbar.
- [ ] Dashboard öffnen und mit der passenden Organisation anmelden.
- [ ] Beispiel normal und mit `--fail` starten.
- [ ] Organisation, Team, Zeitraum und Umgebungsfilter prüfen; einschränkende Service-/Statusfilter zunächst entfernen.
- [ ] SDK-Export, Collector-Batch und UI-Refresh abwarten oder die Ansicht neu laden.
- [ ] Service, Trace `demo-job`, Exception-Event samt Stack-Trace, Logs und Custom-Metriken prüfen.
- [ ] Gegenprobe mit einem anderen Mandanten durchführen: Die Daten dürfen dort nicht sichtbar sein.

Ein leerer OTLP-JSON-Export prüft Gateway-Authentifizierung und Erreichbarkeit, erzeugt aber **keine Service-Daten**:

```bash
read -r -s -p "Client-Key: " HUB_CLIENT_KEY
echo
printf 'header = "X-API-Key: %s"\n' "$HUB_CLIENT_KEY" | curl --config - \
  --include --request POST http://localhost:3001/api/ingest/v1/traces \
  --header 'Content-Type: application/json' --data '{"resourceSpans":[]}'
unset HUB_CLIENT_KEY
```

Der Header wird über stdin statt als Prozessargument an curl übergeben. Keine verbose Header-Diagnostik mit echten Keys in geteilten Logs verwenden. Ein HTTP-Erfolg bestätigt die Annahme durch die Pipeline, nicht bereits die dauerhafte Speicherung in ClickHouse.

### Typische Fehler

| Symptom | Ursache / Prüfung |
| --- | --- |
| **401 Unauthorized** | Key fehlt, Format ungültig, Hash unbekannt, Key widerrufen oder abgelaufen. Klartext-Key senden, nicht den Hash; nach Registry-Änderungen Backend neu starten. Eine Upstream-401 kann auch ein falsches internes Collector-Token bedeuten. |
| **415 Unsupported Media Type** | Gateway erwartet JSON oder Protobuf über HTTP; `application/grpc` wird nicht akzeptiert. Protokoll auf `http/protobuf` setzen. Echte gRPC-Verbindungen können bereits mit Transportfehlern statt HTTP-415 scheitern. |
| **404** | Signalpfad oder HTTP-Methode falsch. POST auf `/api/ingest/v1/{signal}` verwenden. |
| **400 / 413** | Leerer beziehungsweise ungültiger OTLP-Body oder Überschreitung des 8-MiB-Limits. SDK und Batchgrößen prüfen. |
| **503 / Export-Timeout** | Token fehlt, Collector nicht erreichbar oder Upstream-Verbindung fehlgeschlagen. Endpoint, Pods, Port-Forward und Netzwerkregeln prüfen. |
| Service fehlt | Noch keine gespeicherten Daten, falsche Zuordnung, fehlende Berechtigung oder zu enger Zeit-/Umgebungsfilter. Exportintervalle und Batching berücksichtigen. |
| Metriken sichtbar, keine Traces | Meter-Provider erzeugt keine Spans. ActivitySource-Registrierung, Instrumentierung und Sampling prüfen. |
| Port-Forward: `connection refused` im Pod | Prozess lauscht nicht am Zielport. Bind-Adresse, Container-Logs und tatsächlichen HTTP-Port prüfen; `containerPort` öffnet keinen Listener. |
| Pod: `CreateContainerConfigError` | Secret oder erforderlicher Secret-Schlüssel fehlt. Vor Helm provisionieren. |
| Anmeldung scheitert | Org-Slug, Bootstrap-Benutzer und Passwort prüfen. Session-Cookie ist HttpOnly/Secure/SameSite=Lax: Hostnamen nicht mischen; bei Bedarf lokale HTTPS-Konfiguration verwenden. |

### Diagnose und Qualitätschecks

```bash
yarn logs:backend
yarn logs:collector
kubectl --context kind-observability -n telemetry-hub get events --sort-by=.lastTimestamp
yarn check:all
yarn build
```

Weitere Backend-Tests und Checks stehen in `apps/backend/package.json`. Keine Registry-Inhalte oder kompletten Secret-Manifeste in Diagnoseausgaben veröffentlichen.

### Repository-Orientierung

```text
apps/backend/                         NestJS Query-, Auth- und Ingestion-API
  src/modules/ingestion/              Client-Key-Prüfung und OTLP-Weiterleitung
  src/modules/auth/                   Benutzer, Teams, Sessions und SQLite
apps/frontend/                        React/Vite Dashboard
infra/charts/observability/            Helm-Chart, Collector und Netzwerkregeln
infra/kind/                           Cluster- und Image-Workflow
scripts/                              Repository-Werkzeuge einschließlich Graphify
graphify-out/                         Architekturkarte; Coverage vor Nutzung prüfen
```

### Vor einem produktiven SaaS-Betrieb

Erforderlich sind HTTPS am öffentlichen Gateway, abgesicherte interne Verbindungen, eingeschränkter ClickHouse-Zugriff, persistente Datenhaltung mit Backup/Restore, Rate-Limits und Quotas, belastbare Tenant-Isolationstests sowie ein zentraler Key-Lifecycle mit Audit und zeitnaher Widerrufswirkung. API-Key-Zuordnung verhindert Tenant-Spoofing, ersetzt aber weder Netzwerkschutz noch Schutz gegen gestohlene gültige Keys.
