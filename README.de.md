# Telemetry Hub

[English](README.md) · Deutsch

Logs, Traces, Metriken, Services und Monitore an einem Ort. Anwendungen senden standardisierte
OpenTelemetry-Daten; Benutzer, Teams und Ingestion-Keys verwaltest du im Dashboard.

## Erstinstallation

Benötigt werden [Git](https://git-scm.com/downloads), [Node.js 24+](https://nodejs.org/en/download/),
Yarn 1.22.22, Docker, Kind, kubectl und Helm. Docker muss im Linux-Container-Modus laufen.
Backend, Collector und ClickHouse werden mit Helm in Kind gestartet; das React-Frontend läuft separat.

Diese Befehle funktionieren in PowerShell, macOS Terminal und Linux-Terminals:

```sh
git clone https://github.com/burakcitaci/telemetry-hub.git
cd telemetry-hub
yarn install --frozen-lockfile
yarn cluster:init
yarn ports:backend
```

In einem zweiten Terminal `yarn dev:frontend` starten und anschließend **[http://localhost:5000](http://localhost:5000)** öffnen.
Der erste Kind-Start baut das Backend-Image und installiert das Helm-Release.

## Ersten Administrator erstellen und anmelden

Der Assistent fragt nach dem Organisations-Slug, deiner E-Mail-Adresse, dem ersten Team und einem
Passwort mit 12–128 Zeichen. Die Passworteingabe bleibt verborgen; anschließend bestätigst du sie.
Mit Enter übernimmst du `demo` als Organisation beziehungsweise `backend` als Team.

Es gibt **kein Standardpasswort und keine öffentliche Registrierung**. Für Helm folge dem
[Bootstrap für den ersten Administrator](docs/advanced-setup.de.md#first-admin), bevor du den Cluster startest.

Melde dich mit **deinem Organisations-Slug, deiner E-Mail-Adresse und deinem gewählten Passwort** an.
Verwende die angegebene `localhost`-Adresse. Der Docker-Frontendserver leitet Zugriffe auf `127.0.0.1` automatisch zu `localhost` weiter; Port, Pfad und Filter bleiben erhalten.

1. **Administration** öffnen: Dein Administrator und das erste Team sind bereits vorhanden.
2. Bei Bedarf weitere Teams und Benutzer anlegen; Rolle und Team auswählen.
3. Unter **Ingestion-Keys** ein Team auswählen und einen Key für eine Anwendung erzeugen.
4. Den Key sofort kopieren: Der Klartext wird nur einmal angezeigt.

Ein zunächst leeres Dashboard ist normal. Ohne echte Telemetrie werden keine Beispieldaten erzeugt.

## Erste Anwendung anbinden

OpenTelemetry-SDK oder automatische Instrumentierung deiner Sprache verwenden. Für eine Anwendung
auf demselben Computer diese Werte in den Start-/Umgebungseinstellungen konfigurieren:

```dotenv
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:3001/api/ingest
OTEL_EXPORTER_OTLP_HEADERS=x-api-key=<Key-aus-Administration>
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
OTEL_SERVICE_NAME=my-first-app
OTEL_RESOURCE_ATTRIBUTES=deployment.environment.name=local
```

Dies sind Konfigurationswerte, keine Shellbefehle. Die Instrumentierung muss sie lesen. Anwendung
starten und Requests, Logs oder Messwerte erzeugen. Anschließend Services, Logs, Traces oder Metrics
öffnen. Export und Collector-Batching brauchen etwas Zeit; Zeit- und Umgebungsfilter prüfen.
Metriken allein erzeugen keine Traces.

In einem anderen Container bezeichnet `localhost` diesen Container. Nutze dort gegebenenfalls
`host.docker.internal:3001` oder im gemeinsamen Compose-Netz `http://backend:3001/api/ingest`.
Weitere Details und ein C#-Beispiel stehen im [Integrationsleitfaden](docs/advanced-setup.de.md).

## Im Alltag

| Aktion                      | Befehl im Repository-Verzeichnis         |
| --------------------------- | ---------------------------------------- |
| Wieder starten              | `docker compose up -d --wait`            |
| Stoppen, Daten behalten     | `docker compose down`                    |
| Status anzeigen             | `docker compose ps`                      |
| Logs verfolgen              | `docker compose logs -f --tail=100`      |
| Backend-Logs                | `docker compose logs --tail=100 backend` |
| Nach einem Update neu bauen | `docker compose up --build -d --wait`    |

Benutzer, Teams, Keys und Monitore liegen im Volume `platform-data`, Telemetrie in `clickhouse-data`.
Die konfigurierte Telemetrieaufbewahrung beträgt sieben Tage. Normales Stoppen und erneutes Bauen
erhalten die Volumes. **`docker compose down -v` beziehungsweise `--volumes` löscht gespeicherte Daten.**

Bei einem unveränderten Klon aktualisieren:

```sh
git pull --ff-only
node scripts/setup.mjs
docker compose up --build -d --wait --force-recreate
```

Eine vorhandene `.env` wird nicht überschrieben; der generierte Collector-Stand wird aktualisiert.
Erneutes Setup setzt keine Passwörter zurück. Bestehende Benutzer und Passwörter über Administration
verwalten. Vor wichtigen Updates die [Backup-/Betriebshinweise](docs/operations.md) beachten.

## Häufige Fragen

- **Docker nicht bereit:** Docker Desktop starten, Linux-Container aktivieren und `docker info`
  sowie `docker compose version` prüfen.
- **`.env` existiert bereits:** Der Assistent schützt vorhandene Dateien. Für eine andere
  Konfiguration `node scripts/setup.mjs --output .env.compose` verwenden und bei jedem Compose-Befehl
  `docker compose --env-file .env.compose …` angeben.
- **Port belegt:** Vor dem ersten Setup `node scripts/setup.mjs --port 5050 --api-port 3002`
  verwenden. Bei bestehendem Setup `HUB_PORT`, `API_PORT` und die passende `HUB_PUBLIC_URL` in `.env`
  ändern, neu bauen und die neue Adresse öffnen.
- **Anmeldung schlägt fehl:** Gewählten Organisations-Slug und Zugangsdaten prüfen. Ein bestehendes
  Volume kann ältere Benutzer enthalten. Setup ersetzt diese nicht.
- **Passwort vergessen:** Einen weiteren Organisationsadministrator um eine Änderung bitten.
  Es gibt keinen automatischen Reset; Volumes nicht als Wiederherstellungsverfahren löschen.
- **Leere Ansichten:** Key und OpenTelemetry-Instrumentierung prüfen, Anwendung ausführen und Filter
  kontrollieren. Fehlende Kubernetes-Infrastruktur ist bei Compose erwartbar.
- **Dienst nicht gesund:** `docker compose ps` und `docker compose logs --tail=100` prüfen; ausreichend
  Docker-Speicher und Plattenplatz bereitstellen.

Keine `.env`, gerenderte Compose-Konfiguration oder Keys in GitHub-Issues veröffentlichen.
Die Standardkonfiguration bindet nur lokal und ist kein öffentliches SaaS-Deployment.

## Weiterführend

- [Kubernetes/Kind, Architektur und ausführliche Integration](docs/advanced-setup.de.md)
- [Backend-Entwicklung](docs/backend-dev-startup.md)
- [Tests, Container, Backup und Restore](docs/operations.md)
- [Monitor-API](apps/backend/src/modules/monitors/README.md)

Für Entwicklung: Yarn 1.22.22 installieren, `yarn install --frozen-lockfile` und `yarn verify` ausführen.
Für den Compose-Einstieg sind diese Schritte nicht nötig.
