# Telemetry Hub

[English](README.md) · Deutsch

Eine lokale Observability-Plattform für **Logs, Traces, Metriken, Services und Monitore**.
Anwendungen senden OpenTelemetry; Benutzer, Teams und Ingestion-Keys verwaltest du im Dashboard.

## Erstinstallation

Benötigt werden [Git](https://git-scm.com/downloads), [Node.js 24+](https://nodejs.org/en/download/),
Yarn 1.22.22, Docker Desktop, Kind, `kubectl` und Helm. Docker Desktop muss mit Linux-Containern laufen.
Backend, Collector und ClickHouse starten in Kind; das React-Frontend läuft lokal.

Die folgenden Befehle funktionieren in PowerShell, macOS Terminal und Linux-Terminals:

```sh
git clone https://github.com/burakcitaci/telemetry-hub.git
cd telemetry-hub
yarn install --frozen-lockfile
yarn setup
yarn cluster:init
yarn ports:backend
```

In einem zweiten Terminal `yarn dev:frontend` starten und **[http://localhost:5000](http://localhost:5000)** öffnen.
Der Setup-Assistent erstellt den ersten Administrator, das erste Team und lokale Kubernetes-Secrets.
`yarn cluster:init` richtet bei Bedarf Cluster und Namespace ein, installiert den Metrics Server, baut
das Backend-Image und installiert die Plattform. Der erste Start kann einige Minuten dauern; manuelle
Kubernetes- oder Secret-Befehle sind nicht nötig.

## Anmelden und erste Anwendung anbinden

Der Assistent fragt nach Organisations-Slug, E-Mail, erstem Team und einem Passwort mit 12–128 Zeichen.
Passwort und Bestätigung werden verdeckt eingegeben. Es gibt **kein Standardpasswort und keine öffentliche Registrierung**.

Melde dich mit den gewählten Zugangsdaten an. Öffne **Administration**, um Benutzer und Teams zu verwalten
und unter **Ingestion-Keys** einen Key für eine Anwendung zu erstellen. Den Klartext sofort kopieren:
er wird nur einmal angezeigt.

Für eine Anwendung auf demselben Rechner OpenTelemetry-SDK oder automatische Instrumentierung einrichten:

```dotenv
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:3001/api/ingest
OTEL_EXPORTER_OTLP_HEADERS=x-api-key=<Key-aus-Administration>
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
OTEL_SERVICE_NAME=my-first-app
OTEL_RESOURCE_ATTRIBUTES=deployment.environment.name=local
```

Das sind Anwendungseinstellungen, keine Shell-Befehle. Die Instrumentierung muss sie lesen. Sie sendet
Traces, Logs und Metriken über OTLP/HTTP-Protobuf an das Gateway. Das Gateway ordnet Telemetrie anhand
des Keys dem autorisierten Team zu; Org-/Team-Attribute des Clients sind nicht vertrauenswürdig.
Anwendung starten, echte Telemetrie erzeugen und Services, Logs, Traces oder Metrics öffnen.
Export und Collector-Batching brauchen etwas Zeit. Metriken allein erzeugen keine Traces.

In einem anderen Container bezeichnet `localhost` diesen Container. Nutze bei Bedarf
`host.docker.internal:3001`. Für ein externes System ist ein erreichbarer HTTPS-Gateway-Endpunkt nötig;
die lokale Portweiterleitung ist nicht öffentlich.

## Ein instrumentiertes Backend in Kind bereitstellen

Das unterscheidet sich von **Erste Anwendung anbinden** weiter oben: Dort sendet eine Anwendung auf
deinem Rechner Telemetrie. Hier wird die Anwendung selbst als Workload im lokalen Kind-Cluster
bereitgestellt. Das eignet sich für Worker oder Services ohne eingehende Verbindungen.

Vorher:

1. [Erstinstallation](README.de.md#erstinstallation) abschließen und den Kind-Cluster laufen lassen.
2. Im Dashboard anmelden. Die Organisation aus dem Setup und ein vorhandenes Team verwenden
   (standardmäßig `backend`) oder unter **Administration** ein Team erstellen.
3. Sicherstellen, dass die Anwendung ein Dockerfile hat und bereits OpenTelemetry OTLP über
   HTTP/protobuf verwendet. Das SDK oder die Auto-Instrumentierung muss die standardmäßigen
   `OTEL_*`-Variablen lesen.

Im Repository-Root zunächst den Bereitstellungsplan anzeigen. Beispielwerte für Image,
Organisations-Slug, Team-Slug und Umgebung durch eigene Werte ersetzen:

```sh
yarn backend:deploy --name orders-api --image registry.example.com/orders-api:1.0 \
  --org demo --team backend --env dev
```

`--name` ist der Kubernetes-Deploymentname und zugleich standardmäßig der OpenTelemetry-Service-Name;
er muss DNS-kompatibel sein. `--image` muss für den Kind-Node erreichbar sein. `--org` und `--team`
müssen vorhandenen Dashboard-Slugs entsprechen; `--env` ist eine Bezeichnung wie `dev`, `staging`
oder `production`. `--service` ist optional und verwendet standardmäßig `--name`.

Um das Image mit dem Dockerfile der Anwendung zu bauen und in Kind zu laden, einen lokalen Image-Tag
und den Pfad zum Docker-Build-Kontext verwenden:

```sh
yarn backend:deploy --name orders-api --image orders-api:dev \
  --build-context <pfad-zur-anwendung> --org demo --team backend --env dev
```

Der Pfad muss ein `Dockerfile` enthalten (alternativ `--dockerfile <datei>` angeben). Standardmäßig
wird nur ein Plan angezeigt. Plan prüfen und denselben Befehl mit `--apply` ausführen, um zu bauen
und bereitzustellen. Dabei wird ein sieben Tage gültiger Ingestion-Key in einem Kubernetes-Secret
angelegt oder wiederverwendet; bei einer Key-Änderung startet das Hub-Backend neu. Der Klartext-Key
wird nie ausgegeben. Keine Zugangsdaten committen oder in Logs kopieren.

Endpoint, HTTP/protobuf, Service-Name, Umgebung, Team und Key werden dem Workload automatisch
übergeben. Der Key bestimmt den autorisierten Mandanten; Org/Team nicht selbst in der Anwendung
setzen. Der App-Container muss weiterlaufen. Das Werkzeug erstellt keinen eingehenden Service und
keinen Ingress. Status und Logs prüfen:

```sh
kubectl --context kind-observability get pods -n telemetry-hub
kubectl --context kind-observability logs -n telemetry-hub deployment/orders-api -c worker
```

Telemetrie erzeugen und im Dashboard Organisation, Team, Service und Umgebung auswählen. Key-Rotation,
weitere Optionen und externe (nicht in Kind laufende) Anwendungen beschreibt der
[Kind-Onboarding-Leitfaden](docs/advanced-setup.de.md#backend-onboarding).

## Betrieb und Hilfe

| Aktion                      | Befehl                        |
| --------------------------- | ----------------------------- |
| Pod-Status anzeigen         | `yarn cluster:status`         |
| Backend-Logs verfolgen      | `yarn logs:backend`           |
| Collector-Logs verfolgen    | `yarn logs:collector`         |
| Backend neu bauen/ausrollen | `yarn cluster:reload-backend` |

Benutzer, Teams, Keys und Monitore liegen im Backend-PVC; Telemetrie liegt im ClickHouse-PVC.
Die Telemetrieaufbewahrung beträgt sieben Tage. Das Löschen des Kind-Clusters kann lokale Daten löschen.
Vor Updates und für Sicherungen die [Betriebs- und Wiederherstellungshinweise](docs/operations.md) beachten.

Weitere Anleitungen: [Kind und Architektur](docs/advanced-setup.de.md),
[Backend lokal entwickeln](docs/backend-dev-startup.md),
[Dokumentationsübersicht](docs/README.md) und [Monitor-API](apps/backend/src/modules/monitors/README.md).

Für Entwicklung Yarn 1.22.22 installieren, `yarn install --frozen-lockfile` und `yarn verify` ausführen.
Die lokale Standardinstallation bietet weder öffentliches HTTPS noch eine produktionsgeeignete Datenbank- und Secret-Konfiguration.
