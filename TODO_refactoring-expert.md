# Refactoring-Plan: React-/Vite-Frontend-Alignment

## TASK-BACKEND-1.2 – Listen-Query-Budgets
 
## TASK-BACKEND-1.3 – Zeitvalidierung und öffentliche Query-Schnittstelle

- [x] Wiederverwendbare TelemetryTimeWindowPipe für Logs sowie Metrics-Liste/Detail: gemeinsame Prüfung von Paarigkeit, Zeitzone und Reihenfolge; bestehende ISO-DTO-Validierung bleibt aktiv.
- [x] LogsController delegiert ohne manuelle Datumsprüfung. SQL-Generator verwendet dieselbe Prüfung für interne Aufrufe.
- [x] MetricsService verwendet öffentliche, typisierte executeQuery-Schnittstelle; privater Bracket-Zugriff entfernt.
- [x] Metrics-Detail-Controller ohne Console-Logging und Try-Catch-Re-Throw; bestehender globaler LoggingInterceptor und ExceptionFilter bleiben zuständig. Fachliche 503-Übersetzung im MetricsService bleibt erhalten.
- [x] Backend-Typecheck und lokale Regressionstests erfolgreich; keine Live-ClickHouse-/HTTP-End-to-End-Prüfung.

## Listen-Query-Budgets (TASK-BACKEND-1.2)

- [x] Graphify-Abgleich: bestehende Listenlimits 100/500 bestätigt; unverändert beibehalten und nicht-endliche interne Parameter abgesichert.
- [x] Logs/Traces erhalten Scan-, Ergebnis-, Speicher- und Laufzeitbudgets mit `throw`; keine stillen Teilresultate und kein verfälschendes Span-Limit vor GROUP BY.
- [x] Backend-Typecheck und lokale Mock-Regressionsprüfungen erfolgreich; Backend-Graph code-only inkrementell aktualisiert (287 Knoten / 607 Kanten, keine semantischen API-Kosten).
- [ ] Live-ClickHouse-/Lasttest; blockweise geprüfte Serverbudgets sind keine exakte Node.js-Speicherobergrenze. Optionaler Trace-Zeitfilter und Kandidaten-Trace-Paginierung bleiben separate Optimierungen.

## Kontext

### TASK-ONYX-1.6 – Theme-Toggle-Regression

- [x] Erzwungene lokale dark-Klassen in PageLayout sowie Desktop-/Mobile-Sidebar entfernt. Flächen, Konturen und Zebra-Zeilen verwenden wieder Shadcn-Tokens; Onyx/Slate-Werte sind ausschließlich in den globalen Dark-Variablen definiert.
- [x] Padding-/Grid-Regeln bleiben bestehen. Regressionstest prüft Token-Nutzung und verhindert erneute lokale Dark-Sperren oder festverdrahtete Onyx-Flächen.

### TASK-ONYX-1 – High-Density Layout

- [x] **TASK-ONYX-1.1**: PageLayout erzwingt p-3/lg:p-4, space-y-4, min-h-screen und Onyx-Hintergrund auch bei widersprechenden className-Paddings. FeaturePage verwendet diesen Rahmen für alle fünf Kern-Views; FeatureContent besitzt kein zusätzliches Seitenpadding. Dark-Tokens lokal sichern Kontrast bei gespeicherter Light-Einstellung.
- [x] **TASK-ONYX-1.2**: TelemetryWidget/TelemetryGrid angelegt; FeaturePanel und MetricCard delegieren darauf. Service-Detail-Panels und Skeletons nutzen Widgets, Metrics-KPIs nutzen das gemeinsame Vier-Spalten-Grid. P95 ergänzt die bisher dreiteilige Service-KPI-Leiste. Kein separates Dashboard vorhanden: Startseite bleibt Services.
- [x] **TASK-ONYX-1.3**: Logs/Traces verwenden dichte DataTable-Variante mit py-1/px-2, Mono-Typografie, dünnen Slate-Konturen und Zebra-Zeilen. Seitenheader ohne zusätzliche horizontale Insets, Picker am rechten Ende der Aktionszone; Services-Picker bewahrt URL-Zeitraum für Details, Katalog bleibt ausdrücklich zeitunabhängig.
- [x] **TASK-ONYX-1.4**: Desktop-/Mobile-App-Sidebar mit Slate-Kanten. Frontend-Typecheck, SSR-/Wiring-Checks und Produktionsbuild erfolgreich (Build benötigte Sandbox-Freigabe wegen Windows EPERM). Keine visuelle Browser- oder Live-Daten-Regression behauptet.
- [x] **TASK-ONYX-1.5**: Graphify inkrementell code-only aktualisiert: 496 Knoten / 1.785 Kanten, ohne semantische API-Kosten. CSS wird vom Code-Extractor nicht modelliert.
- [ ] Vollständige visuelle Prüfung und Portals/Light-Theme-Prüfung; Detail-Sheets und Monitor-Editor-Formulare sind keine vollständig neu gestalteten Hauptansichten.

- [ ] **TASK-VITE-0.1 [Scope und Freigabe-Gate]**: Dieser Stand ist ausschließlich ein Plan. Vor einer ausdrücklichen Freigabe werden keine Quellcode-, Konfigurations-, Dependency- oder Graphify-Änderungen umgesetzt.
- [ ] **TASK-VITE-0.2 [Graphify-Voraussetzung]**: `graphify-out/graph.json` liegt zum Analysezeitpunkt nicht im Repository. Daher sind Graph-Aussagen, Importpfade, God Nodes, Zyklen und Duplikate noch nicht bestätigt. Nach Freigabe ist der Graph zunächst read-only auszuwerten; falls er weiterhin fehlt, ist seine Erzeugung separat freizugeben.
- [ ] **TASK-VITE-0.3 [Aktueller Frontend-Scope]**: Der Scan findet derzeit eine Vite-Konfiguration unter `apps/frontend/vite.config.ts` und damit nur einen nachweisbaren Vite-Consumer. Eine Root-Auslagerung darf deshalb nicht allein aufgrund hypothetischer weiterer Apps erfolgen.
- [ ] **TASK-VITE-0.4 [Baseline]**: Erfasst sind 39 `.tsx`-Dateien, vier Hook-Dateien und eine Vite-Konfiguration. Auffällige Größen: `monitors.page.tsx` 2.481 Zeilen, `metrics-page.tsx` 947, `traces-page.tsx` 389, `services-page.tsx` 387 und `data-table.tsx` 331.
- [ ] **TASK-VITE-0.5 [Priorität]**: Primärziele sind Wartbarkeit, konsistente Konfiguration und kontrollierte Wiederverwendung; Performance- oder Verhaltensänderungen sind nicht Bestandteil dieses Refactorings.

## Phase 1 – Graph- und Konfigurationsaudit

- [ ] **TASK-VITE-1.1 [Graph-Baseline herstellen]**:
  - **Ziel**: `graphify-out/graph.json` und den zugehörigen Report auf Aktualität, Node-/Edge-Anzahl, God Nodes, Communities und Integritätswarnungen prüfen.
  - **Vorgehen**: Vor jeder Refactoring-Entscheidung Graph-Vokabular und relevante Teilgraphen für `vite`, `react`, `component`, `hook`, `shared`, `alias` und `config` abfragen.
  - **Ergebnis**: Reproduzierbare Liste der Frontend-Einstiegspunkte, Importkanten, isolierten Bereiche, Zyklen und zentralen Knoten mit `source_location`.
  - **Risiko**: Niedrig; bei fehlendem Graphen darf nicht auf vermutete Beziehungen ausgewichen werden.
  - **Priorität**: 1.

- [ ] **TASK-VITE-1.2 [Vite-Konfigurationen inventarisieren]**:
  - **Ziel**: Alle `vite.config.*`-Dateien sowie Vite-bezogene Skripte, Plugins, Aliase, Dev-Server- und Build-Optionen app-übergreifend tabellarisch vergleichen.
  - **Baseline**: Aktuell ist nur `apps/frontend/vite.config.ts` nachgewiesen; sie registriert React und Tailwind, den Alias `@` sowie Serveroptionen für Port, Host und erlaubte Hosts.
  - **Entscheidungsregel**: Eine Root-Basiskonfiguration erst extrahieren, wenn mindestens zwei reale Consumer dieselben stabilen Optionen teilen oder eine unmittelbar geplante zweite App dies benötigt.
  - **Risiko**: Mittel; vorschnelle Zentralisierung koppelt Apps und kann app-spezifische Server-/Plugin-Anforderungen verdecken.
  - **Priorität**: 2.

- [ ] **TASK-VITE-1.3 [TypeScript- und Alias-Abgleich]**:
  - **Ziel**: `tsconfig.base.json`, App-TSConfigs und Vite-Aliase auf identische Semantik prüfen.
  - **Prüfpunkte**: `@/*`, Basisverzeichnis der Pfadauflösung, `module`, `moduleResolution`, `types`, `jsx`, `allowJs`, Test-Excludes und Node-spezifische Optionen.
  - **Aktueller Hinweis**: Der Root-Pfad `@/* -> ./src/*` ist aus Monorepo-Sicht potenziell mehrdeutig, während Vite `@` relativ zu `apps/frontend/src` auflöst. Diese Abweichung ist vor jeder Paketextraktion zu validieren.
  - **Risiko**: Hoch; falsch harmonisierte Aliase können Builds erfolgreich erscheinen lassen und zur Laufzeit oder in Editoren anders auflösen.
  - **Priorität**: 1.

- [ ] **TASK-VITE-1.4 [Dependency-Drift-Baseline]**:
  - **Ziel**: Workspace-Pakete auf Versionen von React, React DOM, Vite, TypeScript, Tailwind und gemeinsamen UI-/Utility-Abhängigkeiten vergleichen.
  - **Ergebnis**: Matrix aus Paket, Version, Consumer und gewünschter Single Source of Truth; keine Version wird ohne bestätigten Drift verschoben.
  - **Risiko**: Niedrig bei reinem Audit, mittel bei späterer Hoisting-/Resolution-Änderung.
  - **Priorität**: 2.

## Phase 2 – Duplikate in Komponenten und Hooks

- [ ] **TASK-VITE-2.1 [Graphgestützte Kandidatensuche]**:
  - **Ziel**: Komponenten und Hooks mit ähnlichen Namen, Nachbarschaften, Imports und ausgehenden Kanten identifizieren.
  - **Methode**: Kandidaten nur dann als Duplikat einstufen, wenn Graphpfade und Quellvergleich dieselbe Verantwortung, ähnliche Props/Parameter und mindestens fünf strukturell gleiche Zeilen oder äquivalente Logik belegen.
  - **Metriken**: Anzahl Kandidaten, bestätigte Duplikatpaare, gemeinsame Importabhängigkeiten und geschätzte entfernbare Zeilen.
  - **Risiko**: Niedrig im Audit; Namensähnlichkeit allein ist kein Extraktionsgrund.
  - **Priorität**: 1.

- [ ] **TASK-VITE-2.2 [Komponenten-Kandidaten validieren]**:
  - **Ziel**: Folgende durch den Dateiscan sichtbare Kandidaten gegen den Graphen und ihren Quellcode prüfen:
    - `ServiceMetadataSheet` in `services-sheet.tsx` und `service-meta.sheet.tsx`.
    - Lokale `FacetSection`-Varianten in `services-page.tsx` und `shared/components/facet-explorer.tsx`.
    - Status-/Severity-Badges in Monitors, Traces und Logs.
    - Wiederkehrende Detail-Sheet-Strukturen in Traces, Logs und Services.
  - **Entscheidung**: Extraktion nur bei gemeinsamem fachneutralem Vertrag; fachliche Varianten bleiben Feature-lokal oder werden über injizierbare Renderer zusammengesetzt.
  - **Risiko**: Mittel; visuell ähnliche Komponenten können unterschiedliche Domänenregeln tragen.
  - **Priorität**: 2.

- [ ] **TASK-VITE-2.3 [Hook- und State-Kandidaten validieren]**:
  - **Ziel**: `useIsMobile`, `useTheme`, `useTelemetryViewParams`, `useTelemetryStream` und `useServiceMetadata` über Graph-Nachbarschaften, Seiteneffekte und Persistenzverträge vergleichen.
  - **Zusatzprüfung**: Wiederholte Sidebar-Persistenz, URL-Parameter- und API-Lade-Logik in Seitenkomponenten erfassen, auch wenn sie noch nicht als Hook extrahiert ist.
  - **Entscheidung**: Keine generischen Hooks allein wegen ähnlicher `useState`-/`useEffect`-Form; nur stabile, domänenneutrale Verträge extrahieren.
  - **Risiko**: Mittel; abstrahierte Effekte können Lifecycle- und Stale-Closure-Fehler erzeugen.
  - **Priorität**: 2.

- [ ] **TASK-VITE-2.4 [Utility- und Client-Duplikate prüfen]**:
  - **Ziel**: Wiederholte API-Basis-URLs, Formatierung, Zeitbereichslogik, Facettenlogik und Storage-Keys untersuchen.
  - **Aktuelle Kandidaten**: Lokale `API_BASE`-Definitionen in Metrics und Monitors gegenüber `shared/api/client.ts`; bestehende Utilities in `shared/lib` und `lib/utils.ts` auf Überschneidungen prüfen.
  - **Risiko**: Niedrig bis mittel; Konfigurationswerte müssen weiterhin test- und deployment-spezifisch injizierbar bleiben.
  - **Priorität**: 1.

## Phase 3 – Zielarchitektur für gemeinsame Pakete

- [ ] **TASK-VITE-3.1 [Workspace-Struktur erweitern]**:
  - **Ziel**: Die Root-Workspaces kontrolliert von `apps/*` auf `apps/*` plus `packages/*` erweitern.
  - **Voraussetzung**: Mindestens ein bestätigter Shared-Consumer oder ein explizit beschlossener Plattformvertrag.
  - **Risiko**: Mittel; Yarn-Classic-Auflösung, Lockfile und Buildreihenfolge sind zu berücksichtigen.
  - **Priorität**: 2.

- [ ] **TASK-VITE-3.2 [`packages/shared-ui` entwerfen]**:
  - **Zielstruktur**: Fachneutrale UI-Primitives, Kompositionskomponenten, Styles/Tokens, öffentliche Exports und Tests in einem internen Workspace-Paket.
  - **Aufnahmekriterien**: Stateless/pure oder klar injizierbare Zustands-/Daten-Schnittstelle; keine Feature-API-Imports; keine App-Router-Abhängigkeit; mindestens zwei reale Consumer.
  - **Erstkandidaten**: Bewährte Primitives aus `components/ui`; danach nur graphisch bestätigte gemeinsame Detail-, Badge- oder Facet-Bausteine.
  - **Nicht aufnehmen**: Feature-Seiten, Telemetrie-Domainlogik, App-Sidebar und Komponenten mit direktem Backend-/Router-Zugriff.
  - **Risiko**: Mittel; eine vollständige Verschiebung aller UI-Dateien wäre aktuell wahrscheinlich verfrüht.
  - **Priorität**: 3.

- [ ] **TASK-VITE-3.3 [`packages/utils` entwerfen]**:
  - **Zielstruktur**: Kleine, pure TypeScript-Funktionen mit expliziten Exports und ohne React-, DOM-, Vite- oder Backend-Abhängigkeiten.
  - **Aufnahmekriterien**: Nachgewiesene Mehrfachnutzung über Package-Grenzen; deterministisch testbar; keine app-spezifischen Umgebungsvariablen.
  - **Erstkandidaten**: Erst nach Duplikatnachweis Teile aus Zeitbereichs-, Facetten-, Fehler- oder Klassen-Utilities.
  - **Alternative**: Solange nur eine Frontend-App konsumiert, bleiben Utilities unter `apps/frontend/src/shared/lib`; dies vermeidet eine künstliche Paketgrenze.
  - **Risiko**: Niedrig bei purem Code, mittel bei unklaren Typ- oder Laufzeitabhängigkeiten.
  - **Priorität**: 3.

- [ ] **TASK-VITE-3.4 [Öffentliche Paketgrenzen definieren]**:
  - **Ziel**: `exports`, Typausgaben, Peer Dependencies und erlaubte Import-Richtungen festlegen.
  - **Sollrichtung**: `apps/* -> packages/shared-ui -> packages/utils`; keine Rückimporte aus `packages/*` in Apps und keine Zyklen zwischen Shared-Paketen.
  - **Aliasregel**: `@/` bleibt app-lokal; Workspace-Pakete werden ausschließlich über ihren Paketnamen importiert.
  - **Risiko**: Hoch, falls interne Deep Imports nicht verhindert werden.
  - **Priorität**: 1.

## Phase 4 – Inkrementelle Umsetzungsroadmap nach Freigabe

- [ ] **TASK-VITE-4.1 [Tests und Metriken vorbereiten]**: Vor jeder Extraktion bestehende Tests erfassen und fehlende Characterization-Tests für den Zielbereich planen; Baseline für Zeilen, Komplexität, Kopplung und Duplikation sichern. **Risiko: Niedrig.**
- [ ] **TASK-VITE-4.2 [Konfiguration zuerst, nur bei belegter Wiederverwendung]**: Gemeinsame Vite-Factory oder Basisfunktion extrahieren; App-Konfiguration behält Plugins, Ports und Env-spezifische Optionen. Nach dem Schritt Frontend-Typecheck und Build ausführen. **Risiko: Mittel.**
- [ ] **TASK-VITE-4.3 [Eine Utility als Pilot]**: Kleinsten bestätigten, puren Duplikatblock extrahieren und beide Consumer migrieren. Keine Verhaltensänderung; jede Methode bleibt unter 20 Zeilen. **Risiko: Niedrig.**
- [ ] **TASK-VITE-4.4 [Eine UI-Komponente als Pilot]**: Kleinste bestätigte zustandslose Komponente mit explizitem Props-Vertrag extrahieren; visuelle und komponentennahe Tests ergänzen. **Risiko: Mittel.**
- [ ] **TASK-VITE-4.5 [Hooks separat migrieren]**: Erst nach erfolgreichem Utility-/UI-Pilot einen bestätigten gemeinsamen Hook extrahieren; Seiteneffekte und Dependencies explizit testen. **Risiko: Mittel bis hoch.**
- [ ] **TASK-VITE-4.6 [Importpfade konsolidieren]**: Deep Imports entfernen, Package-Exports verwenden und Alias-Kollisionen prüfen. **Risiko: Mittel.**
- [ ] **TASK-VITE-4.7 [Graphify nach jedem Teilschritt aktualisieren]**: `graphify . --update` ausführen und neue Zyklen, God-Node-Wachstum, Inseln und unerlaubte Rückkanten kontrollieren. Bei Verschlechterung Schritt zurückstellen. **Risiko: Niedrig.**

## Vorgeschlagene Codeänderungen

- [ ] **TASK-VITE-5.1 [Keine Änderungen in dieser Phase]**: In diesem Plan sind bewusst keine Patch-Diffs und keine Implementierung enthalten.
- [ ] **TASK-VITE-5.2 [Potenzielle spätere Ziele]**: Nach Freigabe können Root-Workspace-Konfiguration, eine gemeinsame Vite-Basis, `packages/shared-ui`, `packages/utils`, Package-Exports sowie die Importpfade bestätigter Consumer geändert werden.
- [ ] **TASK-VITE-5.3 [Nicht-Ziele]**: Keine Featureänderungen, kein Redesign, keine Backend-Migration und keine pauschale Verschiebung aller Dateien aus `apps/frontend/src/shared`.

## Validierung und Erfolgskriterien

- [ ] **TASK-VITE-6.1 [Build und Typen]**: Root-Build, Frontend-Build und Frontend-Typecheck sind nach jedem isolierten Schritt fehlerfrei; keine neuen TypeScript-Warnungen.
- [ ] **TASK-VITE-6.2 [Tests]**: Bestehende Assertions bleiben unverändert; neue Tests decken nur den extrahierten Vertrag und bekannte Randfälle ab.
- [ ] **TASK-VITE-6.3 [Duplikationsziel]**: Jeder extrahierte Kandidat beseitigt mindestens ein bestätigtes Duplikatpaar; entfernte Duplikatzeilen werden vor/nach dem Schritt dokumentiert.
- [ ] **TASK-VITE-6.4 [Komplexitätsziel]**: Extrahierte Methoden bleiben unter 20 Zeilen und unter cyclomatischer Komplexität 10; große Bestandsdateien werden nicht im selben Schritt umfassend umgebaut.
- [ ] **TASK-VITE-6.5 [Graphziel]**: Apps hängen gerichtet von Shared-Paketen ab; keine Rückkante, kein neuer Zyklus und keine unkontrollierte God-Node-Zunahme.
- [ ] **TASK-VITE-6.6 [Reversibilität]**: Jeder Umsetzungsschritt ist einzeln prüfbar und rücknehmbar; strukturelles Refactoring und Verhaltensänderung werden nicht vermischt.

## Geplante Befehle nach Freigabe

- [ ] **TASK-VITE-7.1 [Graph-Audit]**:

```powershell
graphify query "vite react component hook shared alias config"
```

- [ ] **TASK-VITE-7.2 [Qualitätsprüfung]**:

```powershell
yarn typecheck:frontend
yarn build:frontend
```

- [ ] **TASK-VITE-7.3 [Graph-Regression]**:

```powershell
graphify . --update
```

## Freigabe-Gate

- [ ] **TASK-VITE-8.1 [Explizite Zustimmung erforderlich]**: Die Implementierung beginnt erst nach ausdrücklicher Freigabe dieses Plans.
- [ ] **TASK-VITE-8.2 [Offener Graph-Entscheid]**: Vor der Umsetzung ist zu entscheiden, ob ein aktuelles `graphify-out/graph.json` bereitgestellt oder die Graph-Erzeugung separat freigegeben wird.

## Umsetzung – Feature-Struktur und Shadcn-Styling

- [x] **TASK-UI-2.1 [Freigabe und Scope]**: Mit „super implement“ wurde die Umsetzung für Services, Logs, Traces, Metrics und Monitors freigegeben. Die frühere Vite-/Workspace-Roadmap bleibt ein separater Plan; es wurden keine Dependency-Versionen oder Workspace-Konfigurationen geändert.
- [x] **TASK-UI-2.2 [Graphify-Baseline]**: Frontend-Codegraph lokal und ausschließlich per AST erstellt. Scope: `apps/frontend/src`; Ausgangswert 64 Codedateien, 401 Knoten, 1.343 Kanten. CSS wird vom AST-Parser nicht modelliert und wurde separat überprüft. Keine semantischen API-Aufrufe, keine LLM-Clusterbenennung: 0 LLM-Tokens für Graph-Erzeugung und Updates.
- [x] **TASK-UI-2.3 [Feature-Aufteilung]**: Alle fünf Features besitzen `<feature>-page.tsx`, `components/`, `hooks/`, `model.ts`, `api.ts` soweit schon vorhanden, `types.ts` soweit schon vorhanden und `index.ts`. Pages sind jeweils acht Zeilen lange Orchestratoren. Die ursprüngliche Logik wurde in lokale Controller-Hooks übernommen; bestehende Filter, URL-Synchronisierung, Streaming, Charts und Detailansichten bleiben erhalten.
- [x] **TASK-UI-2.4 [Service-Metadaten]**: Beide bestehenden Sheet-Varianten nach `services/components/` verschoben. Metadatenvertrag und Defaultwerte liegen in `services/types.ts`; der lokale Hook heißt konsistent `use-service-metadata.ts`. Die Sheet-Varianten bleiben getrennt, weil eine Einzelbearbeitung und eine Katalogbearbeitung unterschiedliche Verträge besitzen.
- [x] **TASK-UI-2.5 [Shadcn-Tokens]**: Tailwind-4-`@theme inline` um Background-, Text-, Border-, Ring-, Status-, Chart- und Radius-Tokens ergänzt. Doppelte handgeschriebene Tailwind-Utilities entfernt. Feste Feature-Farben durch semantische Tokens ersetzt; Dark-Mode-Fehlerfarbe für lesbaren Kontrast angepasst.
- [x] **TASK-UI-2.6 [Gemeinsame Primitives]**: Cards verwenden `rounded-xl` und `border-border`; Badge-Varianten nutzen semantische Statusfarben. Service-Inputs, Feature-Checkboxes und Monitor-Textarea verwenden zentrale UI-Primitives. Diagramme verwenden CSS-Variablen statt Hexfarben. Ein zentraler `Textarea`-Baustein wurde ergänzt, ohne neue Frontend-Laufzeitabhängigkeit.
- [x] **TASK-UI-2.7 [Verifikation]**: Standard-Frontend-Typecheck und Produktionsbuild erfolgreich. AST-Vergleich bestätigt die unverändert übernommene Controller-Logik aller fünf Features; 85 interne TS-/TSX-Module auf auflösbare Imports und fehlende Laufzeitzyklen geprüft.
- [x] **TASK-UI-2.8 [Graph-Update]**: Graph nach den Teilschritten inkrementell aktualisiert. Endstand: 445 Knoten, 1.540 Kanten; keine Kanten mit fehlenden Endpunkten. Die höhere Knoten-/Kantenzahl resultiert aus expliziten Modulgrenzen und ist kein Beleg einer Komplexitätsreduktion. Die ursprünglichen großen Page-God-Nodes wurden aufgeteilt; die wichtigsten gemeinsamen UI-Knoten bleiben `cn`, `Button`, `Input` und `DataTable`.
- [x] **TASK-UI-2.9 [Browser-Smokecheck]**: Alle fünf Routen rendern in der Produktionsvorschau. Light-/Dark-Mode-Styling und die Monitor-Liste geprüft. Für Services, Logs, Traces und Metrics war kein Backend erreichbar; Datenabruf und Streaming konnten deshalb nicht mit echten Daten end-to-end geprüft werden.
- [ ] **TASK-UI-3.1 [Verbleibende Bestandskomplexität]**: Große Controller und Monitor-Unterkomponenten enthalten weiterhin geerbte Methoden über 20 Zeilen. Weitere Aufteilung nach Datenabruf, Filtern, Persistenz und Formularzustand ist ein eigener Schritt; die vorliegende Änderung behauptet keine vollständige Komplexitäts- oder Duplikationsreduktion.
- [ ] **TASK-UI-3.2 [Strengere Unused-Prüfung]**: Der optionale Check mit `--noUnusedLocals` meldet bestehende ungenutzte Bindungen in App-Komponenten, Shared-Facetten und Controller-Code. Diese Option ist nicht Teil des derzeitigen Projekt-Typechecks.

### Reproduzierbare Prüfungen

- [x] **TASK-UI-CMD-1 [Typecheck und Build]**:

```powershell
yarn typecheck:frontend
yarn build:frontend
```

- [x] **TASK-UI-CMD-2 [Kostenfreier Frontend-Graph]**: Graphify wurde als isoliertes Werkzeug unter dem ignorierten `.codex-tools/graphify` installiert. Wiederholte Ausführung verwendet Manifest und AST-Cache für unveränderte Dateien.

```powershell
$env:PYTHONPATH = Join-Path (Get-Location) '.codex-tools/graphify'
& 'C:\Users\burak\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' -m graphify extract apps/frontend/src --out . --code-only --no-cluster --max-workers 1
```

## Datadog-UX – Header-Schnittstelle

### TASK-BACKEND-1.1-FIX – ClickHouse-Zeitstempel-Aliaskonflikt

- [x] Backend-Graph abgefragt und drei Detailqueries direkt geprüft: toString(TimeUnix) AS TimeUnix kollidierte mit Datumsfilter.
- [x] Gauge-/Sum-/Histogram-Ausgabealias auf TimeUnixText umbenannt; RawRow/mapRow angepasst. Öffentlicher timeUnix-Vertrag, Datumsfilter, Sortierung, Parameter, Parallelität und 503-Verhalten bleiben erhalten.
- [x] Backend-Typecheck und lokale SQL-/Mapping-Regressionsprüfungen erfolgreich: keine gleichnamige String-Aliasdefinition, originale Datumsspalte für Filter/Sortierung, Timestamp inklusive Nachkommastellen unverändert im API-Mapping.
- [ ] Verifikation an laufender ClickHouse-Instanz nach Backend-Neustart/Rollout erforderlich; lokale Mock-Tests führen kein SQL auf ClickHouse aus.

### TASK-BACKEND-1.1 – Metrics-Detailfehler sichtbar machen

- [x] Separaten Backend-Graphen vor Änderung abgefragt; Frontend-Graph unverändert.
- [x] getMetricDetail/runQuery wirft ServiceUnavailableException mit stabilem Code TELEMETRY_QUERY_FAILED und sicherer Meldung statt return []. Aktive Trace-ID wird über OpenTelemetry angehängt; interner Fehler bleibt als cause erhalten.
- [x] Parallelität über bestehendes Promise.all und Success-Logging beibehalten; redundantes Fehlerlogging im lokalen Catch entfernt.
- [x] Backend-Typecheck sowie Erfolg-/Fehlerprüfungen erfolgreich: alle drei Queries gestartet, 503 statt leerem Erfolg, Trace-ID mit aktivem Kontext, kein SQL-/Fehlerdetail im HTTP-Body.
- [ ] Separater Katalog-Catch bleibt außerhalb dieses gezielten Auftrags und muss ebenfalls Fail-Closed migriert werden.

### TASK-UX-3.2 – High-Density-Primitives in Features eingebunden

- [x] Graphify-Abgleich der KPI-/Status-Komponenten vor Migration.
- [x] Metrics-KPI-Karten nutzen MetricCard und DataValue; Tooltip-/Change-Werte ebenfalls Monospace. Bestehende Farbzuweisungen und Berechnungen unverändert.
- [x] Drei Service-KPI-Karten von CardContent p-5 auf direkte MetricCard-Inhalte p-3 migriert; Summary-Zahlen verwenden DataValue. Keine erfundenen Gesundheits-/Warnschwellen.
- [x] Bestehende Monitor-StatusBadge-Schnittstelle delegiert an globale Primitive: OK→success, Warn→warning, Alert→critical, No Data/neutral→neutral. Labels bleiben erhalten; No Data wird nicht als gesund dargestellt.
- [x] Frontend-Typecheck, Primitive-/Metrics-Zustands-SSR-Checks sowie gezielte Density-/Status-Migrationschecks erfolgreich. Kein vollständiger visueller Regressionstest behauptet.

### TASK-UX-3.1 – High-Density-Telemetrie-Primitives

- [x] Graphify-Abgleich der vorhandenen Card-/Badge-/cn-Primitives; success/warning/destructive-Tokens direkt im CSS-Theme geprüft.
- [x] telemetry-primitives.tsx mit DataValue (Monospace/Tabularzahlen), StatusBadge (kompakt, Textstatus statt reinem Farbsignal) und MetricCard (p-3, border-border/60, bg-muted/30). Keine neuen Dependencies oder CSS-Farben.
- [x] Frontend-Typecheck und SSR-Prüfungen für Zustandsfarben, Standardstatus-Texte, native Props und kompaktes Card-Styling erfolgreich.
- [ ] Bestehende Feature-Komponenten nicht automatisch migriert; Inhalte direkt in MetricCard platzieren, um zusätzliches CardContent-/CardHeader-Padding zu vermeiden.

### TASK-SERVICES-1.3 / 1.4 – Katalog bereinigt und Query-Navigation

- [x] Graphify-Abgleich und Quellenprüfung vor Änderung. Attrappen-Sidebar mit statischen Facetten/Checkboxen, doppelte ungebundene Suchfelder, List/Map/Hide/All/Learn-More-Attrappen, statisches Datum und wirkungsloser Favoritenstern entfernt.
- [x] Eine kontrollierte DataTable-Suche nutzt q aus useTelemetryQuery; Detail-Link-Komponente übernimmt vollständiges location.search inklusive range/from/to. Service-Namen bleiben URL-encodiert.
- [x] ServicesView nutzt ViewSkeleton und QueryError mit loadServices als Retry. ServiceDetailPage bereits mit PageLayout, ViewSkeleton und QueryError/retry migriert; keine redundante Neufassung erforderlich.
- [x] Frontend-Typecheck, Primitive-/Hook-Checks und SSR-Linkprüfung erfolgreich. Kein Browser-E2E-Test behauptet.
- [ ] Katalog weiterhin zeitlich unbegrenzte Service-Discovery; ausdrücklich als full catalog bezeichnet. from/to werden beim Navigieren erhalten, nicht als zusätzliche bisher unimplementierte URL-Zeitparser-Syntax behauptet.

### TASK-SERVICES-1.1 / 1.2 – Service-Summary-Zeitfenster und Race-Schutz

- [x] Graphify-Abgleich vor Implementierung; Backend-Controller/SQL direkt verifiziert.
- [x] Service-Summary-Endpunkt verlangt ISO-from/to, validiert Zeitzone und Reihenfolge und reicht Grenzen an den Service weiter. Parametrisierte Timestamp-Grenzen ersetzen feste letzte Stunde; bestehende Root-/Server-Span-Semantik erhalten.
- [x] useServiceSummary ergänzt: URL-Zeitraum und frische Adapter-Grenzen, AbortController, Key-Guard bei Service-/Zeitraumwechsel sowie Retry. API-Wrapper mit Params/Signal, Debug-Logging entfernt.
- [x] ServiceDetailPage migriert: Picker, ViewSkeleton, QueryError mit Retry und dynamische Zeitbeschriftungen; PageLayout und bestehende Charts/Metadaten erhalten. Rücklink behält Search-Parameter.
- [x] Frontend-/Backend-Typechecks, Mock-Hook-Prüfungen für Race/Zeitraumwechsel/Retry/Abort und Backend-Controller-/SQL-Prüfungen erfolgreich. Keine Live-ClickHouse-/Browser-E2E-Prüfung behauptet.
- [ ] Service-Katalogliste, statisches Listendatum und Attrappenfilter bleiben Folgetasks; dieser Auftrag migriert den Summary-Endpunkt und die Detailansicht, nicht den gesamten Katalog.

### TASK-UX-2.3 – Flexibler PageLayout-Rahmen

- [x] Graphify-Abgleich und Quellenprüfung der Service-Detailseite vor der Änderung.
- [x] PageLayout ergänzt: w-full min-w-0 space-y-6 p-4 lg:p-6 mit semantischen Hintergrund-/Textfarben; native Div-Props und zusätzliche Klassen unterstützt.
- [x] Äußeren ServiceDetailPage-Wrapper ersetzt; max-w-7xl und mx-auto entfernt. Datenlogik, responsive Grids, Charts und Sheets unverändert.
- [x] Frontend-Typecheck und SSR-Prop-/Layout-Checks erfolgreich; Vergleich gegen HEAD bestätigt ausschließlich Import-/Wrapper-Änderung der Detailseite. Graphify inkrementell Code-only aktualisiert, ohne semantische LLM-/API-Aufrufe.
- [ ] Weitere Hauptansichten nicht automatisch migriert; PageLayout ist als gemeinsamer Standard verfügbar. Bestehende FeatureContent-Padding-Schicht bei Folgemigration beachten, um doppelte Abstände zu vermeiden.

### TASK-UX-2.2-METRICS – Query-Zustände migriert

- [x] Graphify-Abgleich und gezielte Prüfung der Metrics-Loading-/Fehlerzweige.
- [x] Content-Spinner durch ViewSkeleton ohne doppelten Header ersetzt; variable Höhe für responsive Karten. isLoading kombiniert Katalog- und Detail-Ladezustand.
- [x] Katalog-/Detail-Fetchfehler verwenden QueryError mit bestehendem Refresh-Zähler als Retry-Callback. Domainmeldung „Metrik nicht im Katalog“ sowie Refresh-Button-Indikatoren bleiben erhalten.
- [x] Frontend-Typecheck sowie SSR-Prüfungen der Primitive und Metrics-Lade-/Fehlerzweige erfolgreich; kein Browser-E2E-Test behauptet.

### TASK-UX-2.2 – Einheitliche Query-Zustände

- [x] Graphify-Abgleich und gezielte Quellenprüfung: Content-Spinner in MetricsView und TraceDetailSheet; FeatureLoading in Logs/Traces/Services/Monitors, eigenes Skeleton in ServiceDetailPage.
- [x] `components/shared/view-skeleton.tsx`: ViewSkeleton mit optionalem Header, vier responsiven Karten oder Listenbalken, Shadcn-Skeleton, semantischen Tokens und Reduced-Motion-Unterstützung. Vorhandenes Skeleton verwendet Pulse, kein neuer CSS-Shimmer implementiert.
- [x] QueryError mit Shadcn-Alert, anpassbarer Meldung, Retry-Callback und kontrolliertem Retry-Status; keine eigene Daten-/Query-Logik.
- [x] Frontend-Typecheck und SSR-Checks für Varianten, Status-/Alert-Semantik, Escaping und deaktivierten Retry erfolgreich.
- [ ] Feature-Migration bleibt Folgeschritt; bestehende Loader/Fehleranzeigen und Refresh-Button-Indikatoren nicht verändert.

### TASK-UX-2.1-METRICS – URL-Zeitbereich und Fetch-Adapter

- [x] Graphify-Abgleich von Metrics-View, Query-Hook und Zeitpicker. Backend-Vertrag direkt geprüft (Frontend-Graph modelliert kein Backend).
- [x] Lokalen 24h-State und URL-Sync-Effekt entfernt. useTelemetryQuery steuert Zeitraum; ausgewählte Metrik ebenfalls direkt aus URL, ohne doppelte Decodierung.
- [x] Katalog und Detail-Fetch übertragen frische from/to-Grenzen. Effekte reagieren auf Query-Adapter und Refresh; bestehende Cancel-Guards ignorieren überholte Antworten.
- [x] MetricsView nutzt gemeinsamen Header mit festem Picker; vorhandene Charts, Tabellen und Facetten bleiben erhalten. Facettenfilter weiterhin lokal, nicht als serverseitig migriert ausgewiesen.
- [x] Backend-Katalog sowie Gauge-/Sum-/Histogram-Detailqueries nutzen validierte parametrisierte TimeUnix-Prädikate vor Limit. Historische Service-Aufrufe ohne Zeitraum bleiben kompatibel.
- [x] Frontend-/Backend-Typecheck, deterministische URL-/Parser-Checks und SQL-Parameter-Checks erfolgreich. Kein Live-ClickHouse-/Browser-E2E-Test behauptet.

### TASK-UX-2.1-LOGS – Wirksame Zeitsteuerung

- [x] Graphify-Abgleich von Logs-View, Query-Hook und Zeitpicker; Backend-Vertrag direkt im Quellcode geprüft (nicht im Frontend-Graphen enthalten).
- [x] LogsView nutzt gemeinsamen Drei-Zonen-Header mit TimeRangePicker; URL-Zustand über useTelemetryQuery. Sidebar-Zeitauswahl bleibt synchron.
- [x] Fetch überträgt frische from/to-ISO-Grenzen; LogsQueryDto validiert Eingaben, Controller prüft vollständiges geordnetes Intervall mit Zeitzone. ClickHouse filtert parametrisiert vor Sortierung/Pagination. Alte Aufrufe ohne Zeitgrenzen bleiben kompatibel.
- [x] Request-ID verhindert Überschreiben durch veraltete Antworten; redundanter lokaler Zeitfilter entfernt. Service-/Severity-Sidebarfilter bleiben lokal.
- [x] Frontend-/Backend-Typecheck, Parser-/Mock-Router-Checks und Controller-/SQL-Parameter-Checks erfolgreich. Keine Live-ClickHouse-/Browser-E2E-Prüfung behauptet.

### TASK-UX-2.1 – URL-basierte Query-Basis

- [x] Graphify-Abgleich vor Refactoring; vorhandenen Zeitparser wiederverwendet.
- [x] `useTelemetryViewParams` erweitert, `useTelemetryQuery` als kompatibler Export: URL als einzige Zustandsquelle, gemeinsamer Default `6h`, Legacy-`time` lesbar; Setter erhalten fremde Parameter.
- [x] API-Adapter liefert frische ISO-Zeitgrenzen, Pagination und Service-/Severity-/Statusfilter; URLSearchParams-Adapter für Fetch ergänzt.
- [x] Parser und lokale Mock-Router-Checks sowie Frontend-Typecheck erfolgreich. Ungültige Zeitangaben werden abgelehnt; keine Browser-E2E-Prüfung behauptet.
- [ ] Backend-Vertrag erweitern und Fetches migrieren: aktuelles TelemetryQueryDto unterstützt nur Pagination und einen einzelnen Service. Zeitgrenzen und Multi-Value-Filter noch nicht serverseitig implementiert. Metrics verwendet weiterhin bisherigen lokalen Feature-Zustand; keine vollständige Page-Migration behauptet.

- [x] **TASK-UX-1.1 [Audit]**: Graphify-Abgleich und Quellenprüfung: fünf Hauptfeatures nutzen den bisherigen `FeatureHeader`, Service-Details einen eigenen Header. Services zeigt ein statisches Datum, Logs keinen TimeRangePicker im Header. Metrics/Traces/Monitors integrieren ihn selbst im Actions-Slot. Suche/Filter sind auf Sidebar, Toolbar und Tabelle verteilt; die App-Shell koordiniert keinen gemeinsamen Zeitbereich. Services-Suchfelder außerhalb der DataTable sind nicht an Filterzustand angebunden.
- [x] **TASK-UX-1.2 [Komponente]**: `components/shared/feature-header.tsx` ergänzt die gewünschte Drei-Zonen-Schnittstelle: Titel/Beschreibung, `children` für Filter, fest eingebundener bestehender `TimeRangePicker` plus `actions`. Zeitbereich und Callback sind verpflichtend und kontrolliert; Typen aus der vorhandenen Picker-Schnittstelle abgeleitet. Nur semantische Tailwind/Shadcn-Tokens, responsive Grid-Anordnung. Keine Page-Migration oder Änderung am vorhandenen Picker.
- [x] **TASK-UX-1.3 [Validierung]**: Frontend-Typecheck und SSR-Slot-Prüfung erfolgreich; Graphify inkrementell Code-only aktualisiert, ohne semantische LLM-/API-Aufrufe. Neue Komponente hängt von Picker und `cn` ab, nicht von Feature-Controllern.
- [ ] **TASK-UX-1.4 [Folgemigration]**: Den bisherigen Header durch die neue Schnittstelle ersetzen; dazu Services und Service-Details mit tatsächlich wirksamer Zeitauswahl versehen und die Filterzustände anbinden. Nicht Teil der angefragten Komponenten-Lieferung.

## Umsetzung – Wiederverwendbares Feature-Layout

### Ist-Analyse & Audit

- [x] **TASK-UI-4.1 [Graph-Abgleich]**: Vor der Migration die fünf View-Knoten und deren Beziehungen zu `Card`, `Button`, `DataTable` und `TelemetrySidebar` geprüft. Gleiche Shadcn-Primitives waren vorhanden, aber Header, Sidebar-Rahmen, Content-Abstände und Zustände wurden mehrfach separat gestaltet.

### Harmonisierungs-Strategie & Ausführung

- [x] **TASK-UI-4.2 [Gemeinsame Layout-Komponenten]**: `shared/components/feature-layout.tsx` enthält `FeaturePage`, `FeatureHeader`, `FeatureBody`, `FeatureContent`, `FeaturePanel`, `FeaturePanelHeader`, `FeatureSidebar`, `FeatureSearch`, `FeatureLoading` und `FeatureEmptyState`. Alle fünf Views verwenden denselben Rahmen. Ein Desktop-Sidebar-Rahmen ersetzt die separaten Services-/Metrics-/Monitors-/Telemetry-Rahmen.
- [x] **TASK-UI-4.3 [Wiederverwendbare Styling-Regeln]**: Header-Typografie, responsive Titel-/Aktionsanordnung, Sidebar-Breite (256 px / 48 px eingeklappt), Content-Abstände (`p-4 lg:p-6`), Panel-Rundung und semantische Shadcn-Farben sind zentral definiert. `FeatureRefreshButton` wird in allen fünf Features genutzt; `TelemetryActions` vereinheitlicht Logs-/Traces-Aktionen und Streamstatus. Feature-spezifische Inhalte und Controller bleiben erhalten. Keine neuen Pakete oder Laufzeitabhängigkeiten.
- [x] **TASK-UI-4.4 [Responsive Korrekturen]**: Feste Mindestbreiten bei Metrics/Traces entfernt; Panel-Header umbrechbar. Monitor-Zeilen reagieren per Tailwind-Container-Query auf die tatsächliche Panel-Breite: zweizeilig auf schmalen Flächen, vollständiges Spaltenraster ab 896 px. Aktionsbeschriftungen bleiben auf kleinen Bildschirmen für Screenreader verfügbar. `FeatureContent` ist eine Section, damit kein zusätzliches Main-Landmark im bestehenden App-Main verschachtelt wird.

### Validierung & Qualitäts-Check

- [x] **TASK-UI-4.5 [Typecheck/Build/Komponenten]**: Root-Scripts `yarn typecheck:frontend` und `yarn build:frontend` erfolgreich. Lokale SSR-/AST-Checks unter `.codex-tools/verify-feature-layout.cjs` prüfen semantische Tokens, Beschriftungen, Sidebar-Collapse, Lade-/Streamzustände, gemeinsame Layout-Verwendung aller fünf Views und unveränderte Controller gegenüber HEAD. 87 interne Module ohne unaufgelöste Imports oder Laufzeitzyklen. Diese lokalen Checks sind keine neu eingerichtete CI-Testsuite.
- [x] **TASK-UI-4.6 [Graphify-Update]**: Inkrementelle Code-only-Extraktion mit AST-Cache und ohne Clustering/LLM/API-Aufrufe. Stand: 464 Knoten / 1.670 Kanten, keine fehlenden Kanten-Endpunkte. Zentralisierung reduziert Layout-Duplikate, nicht die gesamte Graph-Knotenanzahl. CSS wird vom eingesetzten Code-Extractor nicht modelliert.
- [x] **TASK-UI-4.7 [Visuelle Prüfung]**: Alle fünf Routen während der Migration einzeln in lokaler Vorschau geöffnet. Monitor-Raster bei 390 px, normaler Vorschau-Breite und 1.440 px kontrolliert; Metrics-Panels bei 390 px ohne kollidierende Header-Controls. Der zusätzliche abschließende automatisierte Routenvergleich wurde durch ein Browser-Zeitlimit abgebrochen; ein vollständiger visueller Regressionstest wird nicht behauptet. Daten-/Streaming-End-to-End-Tests waren nicht Gegenstand dieser Styling-Migration; die Vorschau zeigt mangels Backend-Verbindung bestehende Fehler-/Leerzustände. Versteckte mobile Feature-Filter und bisherige Services-Platzhalter bleiben separate Bestands-Themen.
