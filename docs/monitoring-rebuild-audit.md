# Audit Report

Stand: 15.10.2026. Umfang: Monitoring über bereits gespeicherten OTel-Daten. Keine Implementierung, keine Änderungen an Ingestion, Collector, Signalmodellen oder Signal-Schemas.

## TASK-PRE.1 — Architektur und Nachweise

- [x] Bestehenden Graphen `graphify-out/graph.json` gelesen und Nachbarschaften von `MonitorEvaluatorService`, `MonitorQueryService` und `PlatformStore` geprüft.
- [x] Quellcode der Query-Schicht, Persistenz, Controller, SDK-Anbindung und Tests geprüft.
- [x] Bestehende Monitoring-Unit-Tests ausgeführt: 12 bestanden, 0 fehlgeschlagen.
- [ ] Live-Schema und Datenbestand in ClickHouse verifiziert: noch nicht ausgeführt.

Graphify weist die zentralen Einstiegspunkte mit `source_location` L12 (Evaluator), L15 (Query-Service) und L19 (PlatformStore) aus. Der Store ist auch mit Auth, Administration und Service-Metadaten verbunden; ClickhouseService ist ein geteilter Infrastrukturknoten. Diese Module dürfen nicht als Monitoring-exklusive Implementierungen ersetzt werden. Der Graph ist eine Orientierung, keine Garantie für aktuelle Abhängigkeiten oder Zyklenfreiheit. Direkte Quellprüfung hat Vorrang. Bereits vorhandene Änderungen unter `graphify-out/` bleiben erhalten und werden nicht gestagt.

Der direkte Graphify-Launcher scheitert an seiner uv-Installation. Der vorhandene Wrapper `node scripts/graphify.mjs query 'monitor evaluator query clickhouse' --budget 1000` funktioniert mit einer Interpreterwarnung; seine Ausgabe umfasst nur 25 von 333 gefundenen Knoten. Zusätzlich wurden die unmittelbaren Nachbarn direkt aus JSON gelesen. Kein Graph-Rebuild erforderlich.

## TASK-MON-1.1 — Bestehende Signal-Speicherung und Query-Pfade

Das Backend verwendet NestJS, TypeScript, `@clickhouse/client`, SQLite über `node:sqlite` und den bestehenden OTel NodeSDK. Der Collector erzeugt die Signal-Schemas (`create_schema: true`); die folgenden Felder sind durch vorhandene Queries belegt, kein vollständiger Live-DDL-Auszug.

| Signal | Bestehende Tabellen und Felder | Aktueller Monitoring-Zugriff |
|---|---|---|
| Logs | `otel_logs`: Timestamp, Body, SeverityText/SeverityNumber, LogAttributes, ResourceAttributes, ServiceName, TraceId, SpanId, ScopeName | MonitorQueryService, Body-Suche oder parametrisierte LogAttributes-Filter, optionale Severity |
| Traces | `otel_traces`: Timestamp, TraceId/SpanId/ParentSpanId, SpanName, SpanKind, Duration, StatusCode, SpanAttributes, ResourceAttributes, ServiceName | MonitorQueryService, SpanName-Suche und Status; Duration wird von ns nach ms umgerechnet |
| Metriken | `otel_metrics_gauge`, `otel_metrics_sum`, `otel_metrics_histogram`: TimeUnix, StartTimeUnix, MetricName, MetricUnit, Attributes, ResourceAttributes, ServiceName; Value beziehungsweise Sum/Count/Min/Max und BucketCounts/ExplicitBounds; AggregationTemporality wird in MetricsService gelesen | MonitorQueryService; Gauge-Punkte direkt, Sum/Histogramm je Serie über argMax auf den letzten Punkt im Fenster reduziert |

Weitere optionale Tabellen sind `otel_metrics_exponential_histogram` und `otel_metrics_summary`. Der Monitor unterstützt sie bisher nicht. Unterstützung darf nicht stillschweigend vorgetäuscht werden.

**Empfohlener Query-Pfad für alle drei Adapter:** vorhandenes `ClickhouseService.buildTenantFilter(...)` und `executeTenantQuery(...)` mit parametrisiertem SQL und bestehenden Ausführungsbudgets. Keine neue Datenbankverbindung, kein Laden paginierter UI-Ergebnislisten für Aggregationen. `MetricsService.getMetricDetail` ist zur Schemaorientierung nützlich, wegen begrenzter Ergebnislisten jedoch kein verlässlicher Aggregationspfad. Seine Histogrammstatistik verwendet gewichtete Bucket-Obergrenzen und meldet unvollständige Verteilungen; sie liefert keine exakten Rohdatenperzentile.

Bestehende Referenzen: `apps/backend/src/modules/telemetry/services/{clickhouse,metrics}.service.ts`, `apps/backend/src/modules/monitors/monitor-query.service.ts`. Ingestion liegt in `apps/backend/src/modules/ingestion/`; SDK-Konfiguration in `apps/backend/src/tracing.ts`; Collector-Konfiguration unter `infra/charts/observability/templates/collector-config.yaml`. Diese bleiben außerhalb des Umbaus.

## TASK-MON-1.2 — Monitor, Evaluation, Ereignisse und API heute

- `MonitorDto` besitzt type, query, comparator, threshold, warnThreshold, evaluationWindow, metricType, signalStatus, logAttribute, groupBy, targets und isMuted. Separate Felder für metric_name, generisches field und enabled fehlen. Fenster sind auf fünf vordefinierte Werte begrenzt; P99 fehlt.
- SQLite speichert Monitor-Konfiguration, Zustand, Samples und Ereignisse gemeinsam als JSON in `monitors(org, id, body)`. Standardpfad: `data/platform.sqlite`, überschreibbar über AUTH_DB_PATH. Konfiguration und Zustand überleben Neustarts bei persistentem Dateipfad.
- Der Evaluator startet nach einer Sekunde und läuft alle 30 Sekunden. Er arbeitet seriell, verhindert überlappende Ticks und dedupliziert parallele Auswertungen desselben Monitors. Versionsprüfung verhindert das Wiederbeleben gelöschter Monitore und Überschreiben zwischenzeitlicher Änderungen.
- Der Query-Service berechnet bereits Threshold-Zustände. Der Evaluator hängt damit an einer konkreten, signalabhängigen Klasse und erhält Gruppen und Status statt nur eines Skalars.
- Zustände sind OK, Warn, Alert, No Data und Unknown. Zustandswechsel werden bereits erkannt; Recovery nach OK existiert. Fehler werden als Unknown gespeichert und beenden regulär nicht den gesamten Loop.
- Ereignisse entstehen nur bei Zustandswechsel und nur ohne Mute. Maximal 100 Ereignisse bleiben im Monitor-JSON. Samples werden auf 24 Stunden und 2880 Punkte begrenzt. Löschen des Monitors löscht damit auch dessen Historie.
- Kein dediziertes Notifier-Interface oder DummyNotifier im Monitoring-Modul. targets sind Konfiguration, kein implementierter Versandweg. Nest-Logging erreicht über den in main.ts registrierten CentralLogger die bestehende OTel-Logging-Anbindung; Monitoring-spezifische Latenz-/Alert-Metriken fehlen.

API unter `/api/monitors`: GET Liste, POST Erstellen, PUT `/:id`, DELETE `/:id`, POST `/preview`, POST `/:id/evaluate`, GET `/:id/history`, POST `/:id/mute`. Einzelabruf, PATCH, Status-Endpunkt und globale Alert-Historie fehlen. Der History-Endpunkt aggregiert Signalhistorie aus ClickHouse; er ist keine Alert-Ereignishistorie. Bestehende JWT-/Tenant-Grenzen bleiben bestehen, ohne neue Auth-Funktionen einzuführen.

## TASK-MON-1.3 — Schwächen und Entscheidung: behalten / ersetzen

| Priorität | Befund | Konsequenz und Vorgehen |
|---|---|---|
| Hoch | Semconv-Filter unterscheiden sich je Signal; Logs erwarten @attribute:value mit explizitem AND, Traces Freitext, Metriken einen Namen im query-Feld | Gemeinsamer key:value-Parser; Adapter lösen Schlüssel auf. Bestehende Syntax über explizite Legacy-Kompatibilität erhalten |
| Hoch | Sum-/Histogramm-Queries nehmen letzte Punkte ohne Temporality-/Reset-Behandlung | Kein verlässlicher allgemeiner Fensterwert: Delta-Punkte müssen anders behandelt werden als kumulative Reihen. Berechnung im MetricAdapter korrigieren, ohne Ingestion anzufassen |
| Hoch | Metrik-P95 wird abgewiesen; P99 überall unzulässig | Punktquantile für Gauge/Sum-Werte klar von Histogramm-Beobachtungsquantilen unterscheiden; Histogrammquantile aus vorhandenen Buckets nur als dokumentierte Schätzung |
| Hoch | Mute unterdrückt Persistenz von Zustandswechseln | Jede Transition unabhängig vom Versand atomar speichern; Mute/Cooldown gelten nur für Benachrichtigung |
| Hoch | Ereignisse sind begrenzte JSON-Anhänge ohne Threshold-/Signal-Snapshot | Eigenständige Monitoring-Ereignistabelle in bestehendem SQLite mit Snapshot, Retention und Abfrage; keine Signal-Schemaänderung |
| Mittel | Kein enabled, Ablaufdatum für Mute oder Cooldown | Deaktivierte Regeln überspringen; zeitgebundene Unterdrückung ergänzen |
| Mittel | UPDATE setzt Zustand auch bei bloßer Umbenennung zurück | Konfigurationsversion weiter nutzen, Zustand bei nicht semantischen Änderungen erhalten, erneute Firing-Meldungen verhindern |
| Mittel | Query-Schicht übernimmt Vergleich; Gruppierung/Warnungen vergrößern Kern | Neue binäre Zustandsmaschine isolieren; Legacy-Verhalten über Kompatibilitätsgrenze behandeln |
| Mittel | Harte Timer-/Retentionswerte, globale Zeit und zufällige IDs | Validierte Config und injizierbare Clock; gezielte isolierte Tests |

Behalten: ClickhouseService inklusive Tenant-Isolation und Budgets, SQLite-Infrastruktur, SDK/Logger, bestehende API-Nutzer, Schutz vor konkurrierenden Änderungen sowie Tests. Ersetzen: Signal-Verzweigungen im Evaluationskern, widersprüchliche Filterbehandlung und JSON-Ereignisanlage als alleinigen Alert-Speicher. Keine neuen LogRecord-/MetricPoint-/Span-Modelle.

# Refactor Plan

## TASK-MON-2.1 — Zielarchitektur und verbindliche Semantik

Controller → Monitoring-Anwendungsservice → Adapter-Registry → SignalAdapter.aggregate(monitor, since, until). Der Evaluationskern erhält ausschließlich Monitor-Konfiguration und Messwert; er entscheidet über Threshold und Transition. Repository speichert Status und AlertEvent zusammen, anschließend wird der DummyNotifier aufgerufen. Clock, Repository, Adapter und Notifier sind austauschbar.

Das skalare Adapterinterface braucht eine ausdrückliche No-Data-Konvention: COUNT ohne Treffer liefert 0; nicht vorhandene numerische Messungen liefern einen typisierten NoData-Fehler statt einer erfundenen Null. Query-Fehler ändern keinen Firing-Zustand und senden keine Recovery. Operativer Fehlerstatus wird getrennt gespeichert. Erste gesunde Evaluation erzeugt kein RECOVERED; Recovery setzt vorheriges FIRING voraus. Ein unterdrückter Versand wird nicht als gesendet gespeichert. Atomare Transition-Persistenz garantiert keine exakt einmalige externe Zustellung nach einem Prozessabsturz; der Dummy-MVP dokumentiert diese Grenze.

Metrikwerte behalten MetricUnit; numerische Thresholds müssen in dieser Einheit angegeben werden. Das Beispiel 500 ms entspricht bei Unit s einem Threshold von 0.5. Keine aus MetricName abgeleitete automatische Einheitenannahme. Histogrammquantile können aus Buckets keine exakten Rohdatenquantile rekonstruieren. Die Implementierung dokumentiert Schätzung und Overflow-Verhalten und erzeugt bei nicht bestimmbaren Ergebnissen keine falsche Recovery.

| Query-Schlüssel | Geplante Abbildung auf vorhandene Felder |
|---|---|
| service.name | ServiceName; Ressource bei Bedarf konsistent abgleichen |
| service.namespace, service.version | ResourceAttributes mit identischem Schlüssel |
| deployment.environment | Kompatibilitätsalias für deployment.environment.name; vorhandene Daten beider Schlüssel unterstützen, kanonischer Schlüssel hat Vorrang |
| severity_text | SeverityText; existierende SeverityNumber-Normalisierung ausdrücklich dokumentieren |
| status.code | StatusCode auf Traces; nicht Log-Severity |
| otel.scope.name | ScopeName |
| http.status_code, rpc.grpc.status_code, db.system, messaging.system | LogAttributes / SpanAttributes / Metrik-Attributes, danach ResourceAttributes; bekannte moderne Aliasse explizit auflösen |
| metric_name | Separates Auswahlfeld beziehungsweise expliziter Alias auf MetricName, nicht als OTel-Semconv-Attribut ausgeben |
| duration_ms / value | Aggregationsfeld: Duration / 1e6 beziehungsweise bestehende Metrikwerte; keine neue Signalspalte |

Dotted keys bleiben ungeteilt. Filter sind AND-verknüpft und SQL-parametrisiert. Unbekannte Schlüssel werden gemäß Auftrag mit strukturierter Warnung ignoriert; die API macht ignorierte Filter sichtbar, weil das Ignorieren die Ergebnismenge vergrößert. Bekannte, für ein Signal ungeeignete Schlüssel werden validiert. OR, Negation, Wildcards, Gruppierung bleiben außerhalb der neuen Syntax. Legacy-Regeln werden explizit erkannt statt still umgedeutet.

Die vorhandene Frontend-API wird über einen Mapper weiter bedient; kein neues UI. Bereits gespeicherte gruppierte Regeln oder Regeln mit Warnschwelle werden nicht automatisch in ungruppierte binäre Regeln umgewandelt. Sie bleiben bis zur expliziten Migration im Legacy-Pfad. Neue einheitliche Regeln verwenden nur Signal, Fenster und Threshold. Eine vierte Signalart benötigt Adapter, Registrierung und Enum-Erweiterung; API-Validierung wird aus diesem Register abgeleitet, der Evaluator bleibt unverändert.

## TASK-MON-2.2 — Dateiweiser Ablauf mit Freigabepunkten

Pfade relativ zum Repository; neue Monitoring-Dateien unter `apps/backend/src/modules/monitors/`.

| Task | Dateien / Änderung | Gezielte Validierung |
|---|---|---|
| TASK-MON-3.a | Neu query-parser.ts, query-parser.test.ts; Freeze-Header in log-query.ts und monitor-rule.ts | Dotted keys, implizites AND, ungültige Tokens, unbekannte Schlüssel, Injection-Werte; keine Anbindung an Legacy-Auswertung |
| TASK-MON-3.b | Neu signal-adapter.ts, signal-registry.ts, adapters/log.adapter.ts, metric.adapter.ts, trace.adapter.ts und Tests; SQL aus monitor-query.service.ts schrittweise ablösen | Alle sieben Aggregationen; Delta/kumulativ/Reset, Units, Histogrammbuckets, Status-/Ressourcenfilter, halboffene Fenster; echte ClickHouse-Fixtures |
| TASK-MON-3.c | Neu monitor.model.ts, monitor-state.ts und Tests; monitor-evaluator.service.ts auf injizierte Ports umstellen; monitor-rule.ts als Legacy-Grenze erhalten | Alle Comparatoren, genau eine Transition, Recovery, NoData/Fehler, Mock-Adapter, Konkurrenzschutz, deaktivierte Regeln; zwei gleichzeitige evaluate-Aufrufe derselben ID erzeugen genau eine AlertEvent-Zeile und genau einen Notifier-Aufruf |
| TASK-MON-3.d | Neu notifier.ts, dummy-notifier.ts und Tests | Payload-Snapshots, stdout, Mute-Dauer, Cooldown; keine realen Integrationen |
| TASK-MON-3.e | Neu monitor.repository.ts, sqlite-monitor.repository.ts, monitor-contract.mapper.ts; Plattform-Store um additive Monitoring-Migration ergänzen; auth/dto/monitor.dto.ts und auth/monitors.controller.ts erweitern; neuer alerts.controller.ts | GET einzeln, PATCH, Status und /api/alerts; Pagination, Restart-Persistenz mit Datei-DB, Migration, atomare Transition, Tenant-Isolation und Legacy-Verträge |
| TASK-MON-3.f | Neu monitoring.config.ts, monitoring.telemetry.ts und Tests; vorhandenen globalen Meter/Logger verwenden | Ungültige Startup-Konfiguration, Eval-Latenz, Fehler- und Alert-Zähler; Test gegen feste Label-Key-Allowlist, neue Keys lassen ihn scheitern; tenant_id/monitor_id sind keine Metrik-Labels |
| TASK-MON-3.g | monitors.module.ts verdrahten; bestehende Tests in monitors.test.ts, tests/monitors.integration.test.ts und tests/monitors-clickhouse.test.ts aktualisieren; neu modules/monitors/README.md | Backend-Suite, HTTP-Integration, Frontend-Vertragstests und relevanter Gesamtbuild |

Jeder Schritt liefert einen prüfbaren Diff und pausiert gemäß Auftrag. Implementierungsdateien bleiben klein, neue Methoden maximal 20 Zeilen. Keine neue schwere Dependency erwartet. Ein zusammenhängender Refactoring-Block erhält genau eine manuelle Graphify-Aktualisierung am Ende, keinen Post-Commit-Hook. Graphify-Artefakte werden nicht committed. Git-Commits nur im vereinbarten Implementierungsablauf; kein Push in dieser Auditphase.

## TASK-MON-4.1 — Teststand und offene Verifikation

- [x] `node --import tsx --test src/modules/monitors/monitors.test.ts` im Backend: 12/12 bestanden.
- [x] Vorhandene HTTP-Integration und opt-in ClickHouse-Tests gelesen.
- [ ] HTTP-Integration ausgeführt; sie importiert dist und benötigt vorherigen Backend-Build.
- [ ] Live-ClickHouse-Tests ausgeführt; sie sind durch TEST_KIND_CLICKHOUSE=1 geschützt und nutzen Kind/kubectl. Derzeit keine Behauptung über verfügbare Cluster oder Daten.
- [ ] Neue Adapter-Fixtures müssen kontrollierte Datensätze für alle Signale in isolierten Testtabellen verwenden; vorhandene Live-Smoke-Tests allein belegen keine korrekte Metrik-Fenstersemantik.
- [ ] Vollständige relevante Suite und Build am Implementierungsblockende; kein Build für eine reine Markdown-Auditänderung erforderlich.

## TASK-MON-2.3 — Approved-plan addendum (review points 1–6)

1. **Migration strategy:** choose (a), migrate embedded events on first monitor read. In one SQLite transaction, insert existing events into the standalone table using a unique (org, monitor_id, legacy_event_id) key, mark the monitor's event migration complete, and strip events from its JSON. A failure rolls back all three operations. Preserve legacy timestamp/state/value and stable event IDs. Legacy events have no historical threshold or signal snapshot: record unavailable values as null with a legacy provenance marker rather than inventing a snapshot from today's configuration. New events require full snapshots. Acceptance test in TASK-MON-3.e: migrate twice, reopen the file database, and assert the same event IDs/count, no JSON events, and no duplicate insertions; also test rollback. Retention applies consistently after import.
2. **Retention:** retain AlertEvent rows for **30 days**, configurable as positive integer MONITOR_ALERT_RETENTION_DAYS in monitoring.config.ts (default 30). A single-process periodic pruning job runs at startup and every hour, deleting expired rows by fired_at with an indexed timestamp; interval configurable via MONITOR_ALERT_PRUNE_INTERVAL_SECONDS (default 3600). Muting never prevents history writes. This is separate from existing 24-hour evaluation samples. Tests use an injected clock and cover the retention boundary.
3. **Quantile policy:** choose **Option A**: ship estimated histogram P95/P99. Status responses and new AlertEvent snapshots include required boolean estimated (true for histogram bucket quantiles, false for exact scalar-sample quantiles). Histogram policy: use the upper bound of the bucket reaching the requested rank, weighted by observation counts after temporality normalization; if the rank lies in the unbounded overflow bucket, report NoData with estimated=true and a reason, preserving the firing state and emitting no recovery. Scalar log fields, trace durations, and Gauge/Sum sample values use exact nearest-rank quantiles; Sum sample quantiles are not event-duration distributions. Native MetricUnit is preserved. Test rank boundaries, overflow, empty data, and estimated propagation in TASK-MON-3.b/3.e.
4. **Legacy inventory and freeze:** read-only query of kind-observability, namespace telemetry-hub, deployment/backend, `/var/lib/telemetry-hub/platform.sqlite` on 15.10.2026: **2 total monitors; groupBy: 0; warnThreshold: 0; targets: 0; embedded events: 23**. These are local Kind counts, not independently verified production/staging counts. Choose explicit manual migration for these two existing rules, then delete the legacy path after API compatibility and event migration are verified. Do not build a long-lived parallel evaluator for this inventory. Freeze headers in both log-query.ts and monitor-rule.ts are part of TASK-MON-3.a. Recount before migration; an additional production inventory can change this strategy.
5. **Cardinality guard:** TASK-MON-3.f must test every emitted monitoring metric against a fixed build-time label-key allowlist, with bounded label values. Adding a label key fails the test until explicitly reviewed and allowlisted. Neither tenant_id nor monitor_id is permitted as a metric label; correlation belongs in logs/traces.
6. **Concurrency:** TASK-MON-3.c must simulate two simultaneous evaluate(monitor) calls for the same ID using a deferred adapter response. Assert exactly one persisted AlertEvent row and one Notifier invocation for FIRING, and repeat for RECOVERED; retain edit/delete-during-evaluation tests. Use the real SQLite repository (in-memory DB), a fake notifier and injected clock. TASK-MON-3.c therefore includes the minimal transactional repository port/implementation needed by this test; TASK-MON-3.e expands it with migration and HTTP persistence contracts.

TASK-MON-3.a was explicitly greenlit on 15.10.2026 subject to these decisions. The parser takes an adapter-owned supported-key set and returns filters plus structured warnings, allowing new signals without parser changes. Empty/whitespace query means no filters; implicit AND is whitespace separation. Quoted JSON strings are supported for literal values; explicit AND, OR, negation, wildcard and grouping syntax is rejected. Identical duplicate filters collapse, conflicting duplicates fail instead of silently overwriting. Parsing does not reinterpret legacy queries or rewrite semantic-convention aliases; adapters own field mapping. No deployed monitor data is modified during this step.

## TASK-MON-3.a — Completed implementation and validation

- [x] Added query-parser.ts and 30 parser tests; existing monitor execution remains unchanged.
- [x] Added FROZEN headers and the inventory-based removal condition to both legacy boundary files.
- [x] Parser plus existing monitoring tests: 42/42 passed; complete backend source unit suite: 79/79 passed.
- [x] Backend and frontend production builds passed using the installed npm workspace scripts. Frontend reports its existing large-chunk warning. Yarn bootstrap could not resolve registry.yarnpkg.com; npm executed the same build scripts without downloading dependencies.
- [x] Repeated sandbox-blocked checks with approved access: backend gateway test required loopback access, Vite required realpath access. Both passed.
- [x] git diff --check passed. No deployment, data migration, ingestion changes, or push performed.
- [ ] Graphify refresh: attempted exactly once with `node scripts/graphify.mjs . --update`; failed because 40 changed documents require semantic extraction and no LLM API key is configured. No successful refresh is claimed, and no second update or hook was run. Generated Graphify files remain local and excluded from the intended change set.

Review checkpoint: pause before TASK-MON-3.b. Migration, retention, quantile flags, concurrency and cardinality tests above remain acceptance criteria for their respective future steps; this parser step does not claim to implement them.

## TASK-MON-3.b — Completed adapters and acceptance evidence

- [x] Rechecked the stored graph's ClickhouseService, MonitorQueryService and MetricsService dependencies before this block. The shared query service and frozen legacy boundary remain intact.
- [x] Added signal-adapter.ts (monitor query configuration, scalar interface, measurement metadata and typed NoData), signal-registry.ts, and adapters/log.adapter.ts, trace.adapter.ts and metric.adapter.ts.
- [x] Added shared parameterized filter/aggregation helpers and isolated SQL for metric temporality and histogram aggregation. No new signal-data model, signal schema, ingestion dependency or heavy package was introduced. SQL result interfaces describe aggregate transport rows only.
- [x] Added seven focused adapter unit tests and four real ClickHouse integration tests with seeded fixtures in temporary databases cloned from the existing installed schemas. The real ClickhouseService tenant guard and query path execute the adapter SQL. Temporary Memory tables are isolated from the default telemetry database; cleanup verification found zero remaining fixture databases.
- [x] Full backend source suite: **86/86 passed**. Existing monitor HTTP integration: **1/1 passed**. Seeded ClickHouse integration: **4/4 passed**, covering all seven aggregations, tenant/team boundaries, resource keys, missing/non-finite log values, half-open time bounds, exact scalar P95/P99 ranks, Delta/Cumulative sums, monotonic counter resets, non-monotonic negative increments, histogram reset/difference/rank/overflow behavior, zero-count histograms, changed bounds and mixed units/types.
- [x] Backend and frontend builds passed. Frontend retains the existing large-chunk warning. No live monitor migration or evaluator switch occurs in this step.
- [x] git diff --check passed; review diff opened. One manual Graphify update was attempted at block end and failed because semantic extraction of changed documents needs an unconfigured LLM API key. No second update, hook or Graphify staging was performed.

### Adapter contract and window semantics

`aggregate(monitor, since, until)` returns the required scalar. Its companion `measure(...)` executes the same query path and returns value, unit, estimated and ignored-key warnings. Metadata is returned per invocation, never stored as mutable last-result state; TASK-MON-3.c can pass only the scalar into its threshold/state logic while retaining metadata for persistence. New adapters register through SignalRegistry; the evaluator has no concrete adapter dependency. Wiring the registry into Nest and the evaluator remains in subsequent steps.

Queries use `[since, until)` based on Timestamp for logs/spans and TimeUnix for metrics. Gauge/Sum COUNT counts stored points, without requiring numeric field validity or a cumulative baseline. Histogram COUNT counts observations. Other Gauge operations aggregate finite values and reject a non-finite metric window rather than quietly treating it as healthy; numeric log/span attribute operations exclude absent or non-finite attributes.

For numeric cumulative Sum and Histogram operations, the SQL finds each series' previous stored point, including points before since, and derives increments. Series identity includes service, metric, unit, scope name/version, resource attributes and point attributes; map order is canonicalized. A new start time or monotonic counter/count decrease indicates reset. Non-monotonic cumulative Sum may legitimately decrease. Missing required baseline, unknown temporality, duplicate series timestamps, inconsistent histogram bounds/counts, or unavailable cumulative window extrema yield NoData. Cumulative histogram Min/Max cannot be recovered by subtracting lifetime extrema; Delta histogram extrema remain supported. Zero-observation histogram points do not distort extrema.

Increments are assigned to the interval's ending TimeUnix, matching the point-window selection. There is no interpolation at window edges: a delta interval ending inside the window may start before since. A first cumulative point without a prior baseline is usable only when its start is within the window. Baseline lookup can read preceding retained history and is constrained by the same fail-closed row/time/memory budgets; budget exhaustion fails evaluation rather than returning a truncated aggregate. The monitoring config step can inject these settings through AdapterOptions.

Scalar quantiles use exact nearest rank, including the rank-19 P95 of 20 sorted samples. Histogram quantiles merge weighted finite bucket upper bounds and preserve overflow as an unbounded bucket; their measurements carry estimated=true. A rank in overflow or an empty distribution raises NoDataError with estimated=true. Native MetricUnit is preserved. Histogram metric statistics cannot recreate observations finer than existing buckets. Summary/exponential-histogram adapters remain unsupported as stated in the audit.

Semantic-convention aliases are resolved only in adapter helpers. service.name resolves through ServiceName with resource fallback; namespace/version use resources; deployment.environment resolves the canonical deployment.environment.name before its legacy alias; otel.scope.name uses ScopeName. severity_text matches case-normalized stored SeverityText, with no invented numeric-severity conversion. status.code maps to normalized trace StatusCode, with empty status treated as UNSET. HTTP/DB aliases prefer their modern key, then the older key, checking signal attributes and resource attributes at each key. Unsupported keys remain visible as structured warnings; known keys for the wrong signal fail validation. SQL keys and values, including numeric-field names, are parameters.

Review checkpoint: **pause before TASK-MON-3.c**. Snapshot propagation into status/history endpoints, the atomic transition concurrency test, notification, event migration/retention and operational telemetry remain in their approved subsequent tasks.

## TASK-MON-3.c — Signal-agnostic evaluator and atomic transitions

The reviewed parser/adapter work (TASK-MON-3.a/b) was committed as **b1fbe9f**, excluding graphify-out/. No push was performed. The following evaluator changes are a separate reviewable working-tree step.

- [x] Rechecked the existing graph's shared store and evaluator entry points before the block.
- [x] Added monitor.model.ts and monitor-state.ts: explicit GT/LT/GTE/LTE comparisons, independent firing and operational states, metadata and transition snapshots. First healthy evaluation emits nothing; repeated firing/healthy evaluations emit no duplicate; recovery requires a previous firing state.
- [x] Added signal-evaluator.ts against adapter-registry, repository, notifier and clock interfaces. There are no concrete adapters or ClickHouse queries in this core. It preserves firing state across NoData, query failure and non-finite measurements; these outcomes persist an operational status without producing a false recovery.
- [x] Added monitor.repository.ts and sqlite-monitor.repository.ts, using the existing monitors(org,id,body) control-plane schema plus an additive monitor_alert_events table. The caller owns the SQLite connection. Each transaction compares configuration version, creation identity and runtime revision, then writes runtime plus optional AlertEvent together. Deleted/disabled/edited monitors and competing stale evaluations cannot commit. SQL uniqueness additionally protects each monitor's transition revision.
- [x] Introduced only the Notifier port needed for the concurrency acceptance test; DummyNotifier, timed mute/cooldown and delivery policy remain TASK-MON-3.d.
- [x] The existing MonitorEvaluatorService remains the scheduler/legacy facade. When the MONITOR_SIGNAL_EVALUATOR token is supplied, schemaVersion=2 records delegate to the new core in the tenant telemetry context. Legacy rules retain their existing behavior. Shutdown stops the new engine before draining pending work. No new versioned records, DI factory, deployed migration or default notifier are introduced in this step; production wiring remains part of the approved later tasks.
- [x] Added **19 tests**: all four comparators/equality boundaries; mocked adapters for all signal enums; injected clock and metadata; initial healthy silence; deduplicated firing/recovery; disabled/missing/legacy/foreign-organization records; edit/disable/delete during evaluation; error/NoData/non-finite handling; shutdown; isolation of a misconfigured monitor; scheduler delegation; notification failure; transactional rollback.
- [x] Required concurrency acceptance test uses a deferred adapter and a real in-memory SQLite repository: two simultaneous calls for one monitor produce exactly one AlertEvent row and one notifier invocation for FIRING, then the same assertions for RECOVERED. A second test races two independent evaluator instances against the same stored snapshot, exercising revision checks rather than relying only on shared-promise deduplication.
- [x] SQLite trigger injection aborts AlertEvent insertion after the runtime write; the test proves both writes roll back and the notifier is not called. A subsequent evaluation succeeds after removing the injected failure.
- [x] Complete backend source suite: **105/105 passed**. Existing HTTP monitor integration: **1/1 passed**. Backend and frontend production builds passed; frontend retains its existing large-chunk warning. git diff --check passed.
- [ ] Graphify refresh was attempted exactly once at this block's end and again failed because document semantic extraction needs an unconfigured LLM API key. No second update or hook was run; Graphify files remain outside the commit and intended implementation diff.

NoData/error evaluations retain the prior firing state but expose value=null and a separate operational_status. Actual state transitions snapshot monitor name, signal type, threshold, comparator, window, value, unit and estimated. Existing embedded legacy events are untouched; their idempotent import and retention remain TASK-MON-3.e. Repository configuration writers must increment configurationVersion when editing records and preserve runtime until an explicit reset is intended.

Notifications occur only after a successful commit, and only for the winning transition. Notifier failure is reported through an injectable failure callback and does not roll back or re-emit the state transition. This is one delivery attempt per committed transition, not an exactly-once external-delivery guarantee across process crashes; durable delivery/retries are outside this step.

Review checkpoint: **pause before TASK-MON-3.d**. The new core is ready for the concrete DummyNotifier and subsequent persistence/API/wiring steps; the current deployed monitors are not migrated or switched by this change.

## TASK-MON-3.d — DummyNotifier and notification policy

- [x] Checked the existing graph's evaluator, shared store and logger entry points before this block; no signal ingestion, telemetry schema or real notification integration was changed.
- [x] Added dummy-notifier.ts behind the existing Notifier interface. Its default sink writes one newline-terminated JSON record to stdout and awaits write completion. The record contains firing/resolved status and the immutable alert snapshot (name, signal, value, threshold, comparator, window, unit and estimated). An injectable writer enables isolated tests; asynchronous writer failure is propagated to the evaluator.
- [x] Added notification-policy.ts with optional muted_until and cooldown_seconds. Invalid expiry dates and negative/fractional cooldowns are isolated as per-monitor errors. Both policy fields live in the existing persisted monitor JSON; API validation/authoring remains TASK-MON-3.e.
- [x] Every firing/recovery transition remains persisted, including suppressed notifications. New AlertEvent notification metadata records PENDING, SENT, FAILED or SUPPRESSED, with attempt/completion timestamps and explicit suppression reasons. Suppressed events have no attempt timestamp and are never marked sent.
- [x] The delivery decision and firing-attempt reservation are committed atomically with the state transition. A separate idempotent, tenant-scoped transaction records the writer's outcome. A successful firing receipt updates the active firing episode and increments runtime revision, preventing an evaluation that read an earlier pending receipt from overwriting confirmed delivery.
- [x] Added **20 tests**: JSON payloads across all three signals and both transition states; actual stdout; asynchronous writer completion/failure; default stream errors without process termination or leaked error listeners; mute expiry and history preservation; muted recovery; cooldown persistence across evaluator recreation; failed attempts; receipt/evaluation race; receipt idempotency/tenant boundaries; receipt rollback; delivery-time expiry; invalid policies. Existing concurrency/rollback/state tests remain passing.
- [x] Complete backend source suite plus existing monitor HTTP integration: **126/126 passed**. Backend production build passed. Frontend production build passed with its existing large-chunk warning. git diff --check passed.
- [ ] Exactly one manual Graphify update was attempted for this block; it could not refresh the graph because semantic extraction still has no configured LLM API key. No second update or hook was run, and no generated Graphify files were staged.

### Explicit delivery semantics

Mute suppresses firing and recovery delivery until its absolute expiry. The decision uses the injected clock after signal querying finishes, so an expiry reached during the query is honored. Expiry does not replay a transition suppressed earlier; a subsequent threshold crossing is required.

Cooldown limits firing **attempts**, measured from last_firing_attempt_at; failed writes also consume that attempt. Suppressed transitions do not extend the cooldown. The exact expiry boundary permits a new firing attempt. A recovery for a confirmed, successfully sent active firing bypasses cooldown, while mute still applies. If that episode's firing was suppressed, failed or remains unconfirmed, its recovery is persisted as UNPAIRED_RECOVERY without emitting an unmatched resolved message. Recovery closes the episode. An older successfully sent firing does not authorize a recovery for a later suppressed episode.

Receipt status is distinct from firing state and operational errors. A notification write failure does not undo the transition or trigger a repeat on the next evaluation; its event is recorded FAILED without leaking output error details. If receipt persistence fails after stdout has accepted the record, the receipt remains PENDING and no automatic resend occurs. This deliberately avoids claiming exactly-once external delivery or introducing a durable outbox/retry subsystem. The failure-injection test proves receipt/event updates roll back together and that a later evaluation does not repeat stdout.

No deployed monitor has been migrated and no production DI factory has been enabled. The concrete dummy is ready for the later config/wiring step. The two legacy monitors retain their existing path until explicit migration. Review checkpoint: **pause before TASK-MON-3.e**.

## TASK-MON-3.e — CRUD, history migration and retention

The reviewed evaluator/notifier work (TASK-MON-3.c/d) was committed as **e617021**, excluding graphify-out/ and unrelated frontend edits. The following API/persistence changes are a separate reviewable working-tree step.

- [x] Rechecked the graph's controller, shared PlatformStore and evaluator entry points before the block. Monitoring continues to share the existing control-plane SQLite connection and AUTH_DB_PATH. No OTel ingestion path, signal table/schema or signal-data model was changed.
- [x] Added the canonical JSON contract and strict DTOs, a body-discriminating pipe, MonitoringService, response mapper and AlertsController. Canonical requests use signal_type; existing requests using type still use the legacy DTO/behavior. DTOs reject protected IDs, runtime/state, schemaVersion and unsupported fields. Adapter-owned validation checks query syntax and signal-specific fields without executing storage queries.
- [x] Canonical routes: POST /api/monitors, GET /api/monitors, GET /api/monitors/:id, PATCH /api/monitors/:id, DELETE /api/monitors/:id, GET /api/monitors/:id/status and GET /api/alerts. PATCH supports enabled, muted_until and cooldown_seconds. Alert pagination uses limit/offset, an optional monitor_id, and next_offset; limit is capped at 100. Existing tenant JWT boundaries are retained without a new auth system.
- [x] PATCH merges and revalidates the full configuration, then atomically compares configurationVersion and reloads the current runtime. Rename-only edits retain runtime/notification state. Measurement/threshold changes clear the cached value and expose NO_DATA pending re-evaluation while retaining prior firing state and delivery pairing. Stale updates cannot revive a deleted monitor or overwrite a newer configuration.
- [x] A complete canonical PATCH can explicitly upgrade a legacy monitor in place while preserving its ID and imported history. A partial rename cannot accidentally upgrade it. No deployed rule was automatically upgraded. Canonical PUT, indefinite legacy mute and legacy chart-history routes are rejected with an explicit instruction to use PATCH or /api/alerts instead. Legacy chart history remains unchanged for legacy monitors.
- [x] Added MonitorAlertHistory and a guarded additive legacy_event_id column/index on the existing alert table. First read imports embedded events, strips events from stored JSON and sets legacyEventsMigrated in one transaction. Deduplication is keyed by organization, monitor and original event ID. The API retains original event IDs; an internal namespaced storage ID prevents collisions across monitors. Failed import/marker writes roll back together.
- [x] Legacy history is marked legacy=true, preserves original states/values/timestamps and original payload, and uses null for unavailable threshold, signal, name, comparator, window, unit and estimated snapshots. It is not relabeled as a fully known FIRING/RECOVERED snapshot. New canonical events retain complete snapshots and estimated metadata.
- [x] Legacy responses derive their events array from the alert table. Subsequent legacy writes import new events and strip JSON arrays again, avoiding a permanent second source of truth. Deleting a monitor first migrates any remaining embedded events; its retained alert history survives deletion. Expired events are excluded during import so stale legacy snapshots cannot resurrect pruned history.
- [x] Added validated retention configuration in monitoring.config.ts: MONITOR_ALERT_RETENTION_DAYS defaults to 30; MONITOR_ALERT_PRUNE_INTERVAL_SECONDS defaults to 3600. Invalid configuration fails before opening the platform database. A single-process job prunes at startup and at the configured interval. Reads also apply the cutoff; events exactly at the cutoff remain visible. Evaluation sample retention remains separate.
- [x] MonitorsModule now supplies the adapter registry, DummyNotifier-backed evaluator, API service and retention job so canonical HTTP routes are functional. Environment-wide evaluator configuration/self-instrumentation remains TASK-MON-3.f; documentation and final cutover remain TASK-MON-3.g. No real notification integrations or new UI were added.
- [x] Shared-store shutdown waits for monitoring cleanup before closing SQLite. The scheduler now enumerates IDs and reads/evaluates one record at a time: corrupt embedded history on one monitor logs a failure without blocking healthy monitors. Corrupt JSON events are retained when their migration fails.
- [x] Added **11 source tests** and **2 HTTP integrations**. They cover idempotent import, transactional failure, invalid legacy data, ID/tenant collisions, pagination/deletion, exact retention cutoff and expired reimports, file-backed restart with delivery receipts, fresh-runtime preservation, stale configuration writes, pruning cadence/cleanup, shutdown ordering and isolation of a failed migration. HTTP tests exercise all signals, strict bodies, enable/disable, status, rename without duplicate alerts, estimated histogram snapshots/NoData, unknown-filter warnings, organization isolation and explicit legacy upgrade.
- [x] Complete backend source suite plus legacy/unified HTTP integrations: **139/139 passed**. Backend production build passed. Frontend production build passed with its existing large-chunk warning. git diff --check passed. Unrelated frontend edits are outside this implementation and were not included in e617021.
- [ ] One manual Graphify refresh was attempted at block end; document semantic extraction again failed because no LLM API key is configured. No second update or hook was run. Generated Graphify files were not staged.

Example canonical request (POST /api/monitors):

```json
{
  "name": "Production errors",
  "signal_type": "LOG",
  "query": "severity_text:ERROR deployment.environment:production",
  "aggregation": "COUNT",
  "window_seconds": 300,
  "threshold": 100,
  "comparator": "GT",
  "enabled": true,
  "cooldown_seconds": 600
}
```

Status/history metadata is available through GET /api/monitors/:id/status and GET /api/alerts?monitor_id=:id&limit=50. Canonical request fields remain canonical in responses; list responses add legacy display aliases for existing consumers. Authoring unified rules uses the JSON contract, not the existing legacy form contract. Legacy event IDs are unique within their organization/monitor tuple, not guaranteed globally unique.

This step changes application code and isolated test databases only; it does not deploy the application or upgrade the two running rules. On the next application deployment, history migration is lazy on first read and new writes use the single alert store. Rule upgrades still require explicit complete canonical PATCH requests. Review checkpoint: **pause before TASK-MON-3.f**.

## TASK-MON-3.f — Monitoring configuration and self-instrumentation (2026-10-15)

- [x] Committed the reviewed TASK-MON-3.e changes as **173894a**. Frontend edits and generated Graphify artifacts were excluded; no push or deployment was performed.
- [x] TASK-PRE.1: inspected the existing graph's monitor/controller, shared store and tenant-context boundaries before the block. Existing global OTel Meter, Logger and Tracer providers remain the shared instrumentation entry points. No SDK bootstrap, exporter, ingestion path or signal schema was changed; no dependency was added.
- [x] Expanded monitoring.config.ts with validated environment settings. Invalid numbers, timer overflow and unsupported notifier names fail during provider/service construction before the evaluation timers start. Retention retains its existing startup validation before the database is opened.
- [x] Wired the configured initial delay and check interval into the existing scheduler. List-view overdue detection now follows three configured check intervals. Missing window_seconds on canonical create resolves to the configured default and is persisted explicitly; explicit windows and later rename-only PATCH operations retain their value. Null, zero, negative and string request windows remain invalid. Legacy request parsing is unchanged.
- [x] Added a signal-independent MonitorObserver port with a quiet default for isolated evaluator tests. MonitoringTelemetry uses the already-wired global OTel APIs. Evaluation spans and structured logs carry monitor/event correlation IDs within a trusted per-evaluation tenant context, including API-triggered evaluations. Raw queries, monitor names and private database/notifier errors are excluded from self-instrumentation logs.
- [x] Added evaluation and whole-cycle duration histograms in seconds, evaluation outcomes, evaluation-error counts, committed alert-transition counts and completed notification-attempt counts. Concurrent duplicate calls share one evaluation; losing configuration/runtime comparisons report STALE and cannot increment alert or delivery counters. Disabled/missing rules are skipped. NO_DATA, ERROR, CANCELLED and STALE remain distinguishable from successful evaluation. Suppressed notifications produce transition counts without delivery-attempt counts.
- [x] Cardinality guard uses an independent literal instrument/key/value allowlist in the test. Permitted metric keys are only signal_type, outcome, state and status with closed enum values; cycle duration has no labels. Tenant IDs, monitor IDs, event IDs, names and queries never become metric labels. Metrics aggregate at the deployment resource; tenant correlation stays in logs/traces. New metric names or label keys require an explicit test allowlist update.
- [x] HTTP integrations now use the production signalProviders wiring, replacing only ClickHouse access and the notifier with test doubles. Seven new source tests cover startup settings, notifier rejection, scheduler timing/shutdown, real SDK metric collection/allowlists, concurrent SQLite evaluation, failure paths and overlapping tenant contexts. One new HTTP test verifies configured/default/explicit/invalid windows and PATCH persistence.
- [x] Full backend source and monitoring HTTP suite: **147/147 passed**. Backend and frontend production builds passed; frontend retains its existing large-chunk warning. git diff --check passed. Signal-query SQL was unchanged, so the real ClickHouse adapter fixtures from TASK-MON-3.b were not repeated.
- [ ] Exactly one manual Graphify update was attempted at block end. The installed CLI again failed before extraction because 40 document files require an LLM backend that is not configured. The graph remains stale; no second update or automatic hook was run, and generated outputs remain outside commits.

| Environment setting | Default | Contract |
|---|---|---|
| MONITOR_CHECK_INTERVAL_SECONDS | 30 | Positive integer, fitting a Node timer |
| MONITOR_INITIAL_DELAY_SECONDS | 1 | Nonnegative integer, fitting a Node timer |
| MONITOR_DEFAULT_WINDOW_SECONDS | 300 | Positive integer, representable Date range; applies only when omitted |
| MONITOR_NOTIFIER | dummy | Only dummy is supported; other names fail startup |
| MONITOR_ALERT_RETENTION_DAYS | 30 | Positive integer, representable cutoff |
| MONITOR_ALERT_PRUNE_INTERVAL_SECONDS | 3600 | Positive integer, fitting a Node timer |

| Metric | Unit / labels |
|---|---|
| monitoring.evaluation.duration | Seconds; signal_type |
| monitoring.cycle.duration | Seconds; no labels |
| monitoring.evaluations | Count; signal_type, outcome (OK/NO_DATA/ERROR/STALE/CANCELLED) |
| monitoring.evaluation.errors | Count; signal_type |
| monitoring.alerts | Count; signal_type, state (FIRING/RECOVERED) |
| monitoring.notifications | Count; signal_type, status (SENT/FAILED) |

Only persisted transitions count as alerts. Notification failures are separate from evaluation errors and do not replay transitions. Instrumentation uses the existing providers and their lifecycle; monitoring creates no exporter, reader or new SDK instance. Test-only MeterProvider instances collect metrics locally and are shut down after each test.

Review checkpoint: **TASK-MON-3.f is uncommitted; pause before TASK-MON-3.g** (README and final integration/cutover verification). The two inventoried live legacy monitors have not been upgraded.

## TASK-MON-3.g — Final integration and operating guide (2026-10-15)

- [x] Committed reviewed TASK-MON-3.f as **11161a2**. Generated Graphify files and unrelated frontend changes were excluded; no push was performed.
- [x] TASK-PRE.1: inspected the graph before the block. Existing shared boundaries include PlatformStore (degree 53), TenantScope (degree 95), MonitorEvaluatorService (degree 16) and MonitorsController (degree 18). The graph remains an older snapshot; current source confirms AppModule imports MonitorsModule, AuthModule exports the shared store/admin/guard and TelemetryModule exports the existing ClickhouseService. No new runtime wiring was necessary beyond the already-tested production providers from 3.e/3.f.
- [x] Added modules/monitors/README.md and linked it from both root READMEs. It documents all canonical routes, strict request fields, three signal examples, query-to-storage mapping, quantile/overflow policy, state and notification semantics, retention/configuration, operational metrics, test commands and the explicit legacy cutover/rollback procedure.
- [x] Documented operational limits accurately: the existing form authors legacy rules, canonical authoring uses JSON, canonical rules have transition history rather than legacy chart samples, and a crash after transition commit can leave a PENDING notification without automatic replay. The single-process MVP does not promise exactly-once external delivery across crashes. Consistent SQLite backup/restore is required to recover the old JSON history view after rollback.
- [x] Final SQL verification exposed a timing-dependent legacy fixture: server now64 minus one second could fall after the application's query bound because kubectl exec takes time. Anchored the synthetic row to the parameterized evaluation upper bound. The focused failing test then passed; production SQL and frozen legacy files were unchanged.
- [x] Broader HTTP validation exposed an older infrastructure fixture that omitted metric timestamps and asserted a superseded response shape (test last changed in 0197c59; resource model changed in 8ca9f6c). Updated only that test's timestamp/window and resource-field expectations. No infrastructure implementation or monitoring behavior was altered to accommodate the fixture.
- [x] Complete backend source suite and **all** HTTP integration files: **149/149 passed** after the fixture repair. Monitoring frontend contract/render tests: **10/10 passed**. Both production builds passed; the frontend retains its existing large-chunk warning. git diff --check passed.
- [x] Real local Kind ClickHouse verification: **6/6 distinct tests passed**, comprising four unified adapter suites and two legacy SQL suites. Five passed in the combined run; the corrected timing fixture passed in its focused rerun. Fixtures cover stored signals, filters/tenant scope, scalar quantiles, cumulative/reset semantics, malformed data, histograms and overflow. Confirmed **0** remaining monitor_adapter_test databases after cleanup; existing signal tables/data were unchanged.
- [ ] Exactly one manual Graphify refresh was attempted at block end. The installed CLI could not extract 41 document files without a configured semantic backend. No second update or hook was run; graph artifacts remain outside commits. Consequently no claim of an updated graph or measured graph-complexity reduction is made.

### TASK-MON-4 — Final acceptance status

| Task | Result |
|---|---|
| TASK-MON-3.a | Parser, bounded syntax/unknown-key warnings and both legacy freeze comments implemented |
| TASK-MON-3.b | Three adapters reuse existing tenant query service; real ClickHouse fixtures pass |
| TASK-MON-3.c | Pure comparisons/state and atomic transition persistence; concurrent same-monitor calls cannot duplicate event/notifier |
| TASK-MON-3.d | DummyNotifier, mute/cooldown, failure receipts and paired recovery implemented |
| TASK-MON-3.e | Canonical CRUD/status/history, idempotent lazy migration, file-backed restart and 30-day retention implemented |
| TASK-MON-3.f | Validated configuration and existing OTel APIs; independent fixed metric-label allowlist test passes |
| TASK-MON-3.g | Operating guide, production-wiring verification and final suites complete; diff awaits review |
| Deployment / live rule upgrade | Not performed; local snapshot remains 2 inventoried legacy rules, not a production/staging inventory |
| Graphify refresh | Attempted, unavailable due to the installed CLI's semantic-backend requirement |

The implementation block is complete and ready for final diff review. **TASK-MON-3.g remains uncommitted at this checkpoint**, including the two test-fixture corrections. No deployment, live-rule conversion, push or change to ingestion/SDK initialization/signal schemas was made. Unrelated frontend edits are preserved.
