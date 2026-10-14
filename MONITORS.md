# TASK-MONITORS-1 — Signal-based monitoring

- [x] Metric, log and trace rules with real tenant-scoped ClickHouse evaluation.
- [x] Warning/alert thresholds, grouping, preview, manual evaluation and a 30-second evaluator.
- [x] Persistent samples and state transitions; mute suppresses new in-app events while evaluation continues.
- [x] Missing data and failed queries remain distinct. No missing measurements are silently fabricated.
- [x] Frontend submits editable fields only and displays actual values, groups, history and errors.

## Rule inputs

### TASK-MONITORS-5 — Historical telemetry chart

- [x] Read-only `GET /api/monitors/:id/history?from=...&to=...` aggregates persisted telemetry using the saved current rule, including data predating creation/editing.
- [x] One tenant-scoped bounded query, up to 120 time buckets and 100 groups per bucket, maximum seven-day range.
- [x] Non-overlapping bucket width is at least the rule evaluation window; the final bucket may be partial. This is historical bucket aggregation, not reconstructed rolling scheduler evaluations.
- [x] Chart reloads on rule edits/range changes and every 30 seconds, with cancellation, loading/error states and manual refresh.
- [x] Historical reads do not mutate status, history, events or notifications; saved live evaluation history is separate.

TASK-MONITORS-4.2 supersedes the earlier form iterations: the Query section accepts
`ForecastCount > 5` as a record filter. Alert condition separately selects Sum,
threshold above 8, and window 5m. Numeric aggregation infers its parameter from
the query; Count counts matching records. No nested builders or repeated parameter
selectors are used. Optional scope/status/grouping remain separate. Existing rules
with an all-record numeric measure display its parameter name instead of `*`.

### TASK-MONITORS-4 — Guided log monitor creation

TASK-MONITORS-4.1: The default form is now a single condition expression
(`ForecastCount > 5`) plus aggregation. The expression supplies the numeric
attribute, alert comparator and threshold; Maximum/Average/Total/etc. is applied
over the evaluation window before the comparison. Existing filters are preserved.
The guided filter builder remains under Advanced log options; simple mode does
not require duplicate threshold controls. Supported comparisons: >, >=, <, <=.

- [x] Choose between number of log records and a numeric parameter value.
- [x] Numeric parameter name and readable Maximum/Average/Total/Minimum/95th percentile choices.
- [x] Optional parameter/operator/value filters; query syntax is generated automatically.
- [x] Existing rules reopen with their filters preserved; raw queries remain in Advanced query.
- [x] Incomplete filters or missing numeric parameter names block preview/save instead of silently counting all logs.

Every rule belongs to the authenticated organization. Optional team, service and
environment fields define its scope, independently of the filters currently open
in the browser. Catalog-based service/team ownership is respected.

| Signal | Query field | Aggregation and unit |
| --- | --- | --- |
| Metric | Exact OTel metric name | Gauge sample avg/min/max/sum in native units; count of samples |
| Sum metric | Exact name, Sum stream selected | Latest reported counter snapshot per resource/attribute stream; no rate or delta is inferred |
| Histogram metric | Exact name, Histogram stream selected | Latest snapshot per stream; weighted mean, reported min/max/sum, or observation count |
| Log | `*`, message contains-text, or `@attribute:value` / numeric comparison | Record count, or avg/min/max/sum/P95 of a selected numeric log attribute; optional severity filter |
| Trace | `*` or case-insensitive span-name contains-text | Matching span count or span duration avg/min/max/sum/P95 in milliseconds; optional span status |

Datadog's proprietary query language and composite monitors are not interpreted.
The form uses separate controls for scope, aggregation and thresholds. Existing
simple `avg:metric.name` rules remain readable; unsupported legacy expressions
are reported as failed evaluations until edited.

Use `1m`, `5m`, `15m`, `30m` or `1h` windows. A rule may group by up to three
resource attributes such as `service.name`, `host.name` or `deployment.environment.name`.
Queries have time, row and memory budgets and at most 100 evaluated groups.
Mixed metric units are rejected instead of combined into an invalid number.

## States and persistence

### TASK-MONITORS-2 — Structured log attributes

- [x] Generic `LogAttributes` filters with exact values, existence (`@key:*`), numeric comparisons and `AND`.
- [x] Numeric attribute measure with avg/min/max/sum/P95; numeric strings are accepted.
- [x] Shorthand `max(attribute)` (also avg/min/sum/P95) becomes filter `*` plus the selected measure.
- [x] Missing, invalid and nonfinite measures produce No Data when no valid matching samples exist; a reported zero remains zero.

For example: filter `@RequestPath:/WeatherForecast`, numeric attribute
`ForecastCount`, aggregation `max`, threshold above `5`. Or enter
`max(ForecastCount)` as shorthand. To count only records exceeding a value, use
`@ForecastCount:>5` with count and no numeric measure. Attribute names are generic
and case-sensitive. This is a bounded subset, not the full Datadog query language;
OR, nested expressions, wildcard value matching and ranges are not supported.

Alert takes priority over Warn; warnings must be less severe than alert thresholds.
Missing observations produce No Data. A count with real underlying observations
and zero matches evaluates as zero. An explicit policy can treat an entirely empty
ungrouped count as zero; it never converts query errors or missing grouped values.
Failed evaluation produces Unknown with a sanitized error. Results more than
90 seconds old are presented as overdue rather than healthy.

Organizations may save up to 100 monitors. The single-replica backend evaluates rules sequentially every 30 seconds, with
single-flight protection for manual/scheduled overlap. Slow/budget-exceeding queries
can delay a cycle. Each rule retains up to 24 hours / 2,880 samples and 100 transitions in the existing
SQLite/PVC. Name, threshold and notification edits preserve history. Changing the measured signal,
query, scope, aggregation or evaluation window starts a new series; in-flight results cannot overwrite
the new version or recreate a deleted rule.

### TASK-MONITORS-3 — Chart time selection

- [x] Detail chart reuses the traces/logs time picker; selection survives opening the editor and saving.
- [x] X-axis follows the selected bounds, including empty periods, rather than the oldest/newest samples.
- [x] Sample history is filtered to that range; long evaluation gaps remain disconnected.
- [x] Display range is independent from the rule evaluation window; changing it does not alter alert behavior.

The default chart range is 30 minutes. Larger/custom ranges are selectable, but
only retained evaluations are shown: historical telemetry is not re-evaluated or backfilled.

The graph displays the most severe group's current value, plus per-group values
in details. `lastEvaluatedAt` is query-evaluation time, not a telemetry ingestion time.

## API

- `GET/POST /api/monitors` — list/create rules.
- `PUT/DELETE /api/monitors/:id` — edit/delete within the organization.
- `POST /api/monitors/preview` — query a draft without saving a rule or alert.
- `POST /api/monitors/:id/evaluate` — evaluate now and persist the result.
- `POST /api/monitors/:id/mute` — body `{ "isMuted": true }`; preserve the rule and its history.

Evaluation and state changes are available in-app. Email, Slack, webhook and
PagerDuty delivery require destination configuration and are disabled in the form.
Messages are stored as plain text; no Datadog template rendering is claimed.

## Verification

Run backend source tests and the backend build, then the HTTP monitor/admin
integration tests in `apps/backend/tests`. The opt-in
`TEST_KIND_CLICKHOUSE=1` test executes read-only generated SQL against the local
Kind ClickHouse for all supported signal/aggregation combinations.
Frontend monitor tests check rule payloads, real history rendering, unknown states
and the shared sheet structure. Graphify is updated once after the coherent block.
