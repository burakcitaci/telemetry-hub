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

Für ein bereits instrumentiertes Backend, das als Workload in deinem lokalen Kind-Cluster laufen soll,
zuerst Organisation und Team unter **Administration** anlegen. Dann im Repository-Root einen Plan erstellen:

```sh
yarn backend:deploy --name orders-api --image registry.example.com/orders-api:1.0 \
  --org my-company --team backend --env production
```

Der Befehl ändert standardmäßig nichts. Plan prüfen und denselben Befehl mit `--apply` wiederholen.
Ein lokales Image lässt sich mit `--build-context <app-ordner>` bauen und in Kind laden. Das Werkzeug
erstellt oder erneuert einen kurzlebigen Ingestion-Key und speichert ihn als Kubernetes-Secret; der
Klartext-Key wird nicht ausgegeben. Es erstellt nur einen Kubernetes-Deployment-Workload, keinen
öffentlichen Service oder Ingress. Geeignet für Worker oder Anwendungen ohne eingehenden Netzwerkverkehr.

Das Backend muss OpenTelemetry bereits unterstützen. Das Werkzeug setzt Service-, Environment- und
vertrauenswürdige Org-/Team-Zuordnung. Details zu Parametern, Key-Rotation und einem .NET-Beispiel:
[Kind- und Onboarding-Leitfaden](docs/advanced-setup.de.md#backend-onboarding).

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
