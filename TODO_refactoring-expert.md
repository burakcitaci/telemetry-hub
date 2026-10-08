# Refactoring-Plan: React-/Vite-Frontend-Alignment

## Kontext

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

