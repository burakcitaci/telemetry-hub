---
type: "query"
date: "2026-10-13T21:16:42.902357+00:00"
question: "mach mal mit den fixen weiter"
contributor: "graphify"
outcome: "useful"
---

# Q: mach mal mit den fixen weiter

## Answer

Expanded graph vocabulary: metrics infrastructure monitor trace filter table router current series timestamp null sidebar. Graphify root code graph refreshed after each finding; final refresh reported no topology changes. 1863 nodes / 4587 edges / 91 communities; graph report's older commit stamp was retained by no-change optimization. Extraction token cost: 0 input / 0 output, deterministic AST updates. Budget-limited initial query showed22/567 nodes, direct source verification supplied evidence. God nodes cn/Button/shared clients/context boundaries retained; no backend or dependency/config drift introduced. No runtime production data used; browser cases use isolated real UI with mocked APIs, no test fixtures in production bundle.

## Phase A abgeschlossen

Neun getrennte Commits, **27 Tests bestanden**, Frontend-Typecheck und Produktionsbuild erfolgreich.

| Finding | Status | Commit | Test | Verifikation |
| --- | --- | --- | --- | --- |
| A1 | Client fixed¹ | 91f89e4 | Null/Tooltip/Chart | Lücke unterbricht Linie; Warnhinweis sichtbar |
| A2 | Client fixed¹ | f2df8ee | Missing CPU | Unbeobachtet zeigt —, echte 0 bleibt 0% |
| A3 | Client fixed¹ | 5e21287 | Monitor ohne Timestamp | Unknown statt OK |
| A4 | fixed | 4ea6df7 | Services-Detailroute | Elternnavigation bleibt markiert |
| A5 | fixed | 96482e9 | Ungültige Routen | Not found; Einstieg/Auth unverändert |
| A6 | fixed | a9cfed2 | Filterwechsel/Retry | Drawer bleibt offen; ursprünglicher Kontext bleibt erhalten |
| A7 | fixed | 649d9d4 | Neuester Zeitstempel | Latest observation zeigt Gruppe und Zeit |
| A8 | fixed | 9b1dfc9 | Zeitabstand | Samples stehen im Verhältnis 1:9 |
| B1, vorgezogen | fixed | af19334 | Tab/Enter/Space | Details öffnen; verschachtelte Aktionen bleiben isoliert |

¹ Vollständige Auflösung der Backend-Mehrdeutigkeiten/Evaluation bleibt blocked-on-backend. Historische Trace-Suche ist ebenfalls ausdrücklich zurückgestellt.

[UI_REVIEW.md](C:/Users/burak/source/repos/telemetry-hub/UI_REVIEW.md:1871) enthält Testdateien, Verifikationsmatrix und offene B-/C-Punkte.

Alle Frontend-Tests erneut ausführen:

```powershell
node apps/frontend/tests/run-phase-a.mjs
```

Backend/Deployment unverändert. Graphify-Daten nicht committed; nichts gepusht. Vite meldet weiterhin einen Chunk über 500 kB.

**Soll ich die Phase-B-Fix-Templates vorbereiten?**

## Outcome

- Signal: useful