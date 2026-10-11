# TASK-FILTER-1.1 — Multi-selection and time-scoped status discovery

- [x] Shared checkbox dropdown for platform Environment, Service, Team and Status, including header team selector and service detail environment selector.
- [x] Repeated URL parameters preserve multiple values; cache keys are canonical and navigation keeps global status separate from page-local facets.
- [x] Credentialed API headers and repeated SSE query parameters carry the same selections. Guard validates up to 50 values per dimension; SQL uses parameterized arrays.
- [x] OR within each dimension, AND between dimensions, mandatory organization isolation and service ownership precedence retained.
- [x] `/api/filters` discovers statuses for the current source and exact date-picker window. Trace statuses derive from aggregate trace state; logs use actual SeverityText (uppercase), numeric severity fallback and UNKNOWN when missing.
- [x] Selected status does not self-restrict discovery. Date range/source/team/service/environment changes reload options. Periodic 30-second refresh updates sliding windows; canceled requests cannot overwrite new selections.
- [x] Values no longer present remain selected, labeled and removable. Empty selection means all.

## Limitations

Raw OTel metric tables have no status column. Status selection is preserved but not applied to metric rows, explicitly explained in the UI. Monitor configurations have no historical evaluation-state series; their status options use current configurations updated within the chosen window, not invented historical observations. No new monitor evaluator or status-history storage is implemented.

The existing Graphify graph was checked for shared UI/query dependencies; new auth nodes are not covered and CLI refresh is unavailable. No cluster deployment or database rewrite is performed.
