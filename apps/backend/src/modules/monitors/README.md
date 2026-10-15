# Monitoring: Signal, Window, Threshold

Unified monitors evaluate already-stored OTel logs, metrics and traces through the existing ClickhouseService. The monitoring module owns rule configuration, evaluation state, alert history and dummy notification delivery. Ingestion, signal schemas, SDK initialization and exporters remain unchanged.

## TASK-MON-3.g — Runtime wiring

AppModule imports MonitorsModule. Its production providers connect:

```text
MonitorsController / scheduler
  → MonitoringService / SignalEvaluator
  → SignalRegistry → LogAdapter | MetricAdapter | TraceAdapter
  → existing ClickhouseService.executeTenantQuery

SignalEvaluator
  → shared PlatformStore.monitorRepository (SQLite state + alert transaction)
  → MONITOR_NOTIFIER (DummyNotifier)
  → MonitorObserver (MonitoringTelemetry, existing global OTel APIs)

AlertRetentionService → monitorRepository.history.prune
AlertsController → monitorRepository.history.list
```

The scheduler runs in one process, skips overlapping cycles and shares concurrent evaluations of the same organization/monitor. SQLite compares configuration and runtime revisions before committing state and the transition together. Stale results cannot overwrite edits, revive deleted rules or emit duplicate notifications. Shutdown drains evaluations and clears monitoring timers before closing the shared database.

## JSON API

All routes use the existing tenant JWT/session guard. Organization ownership comes from the authenticated scope, never the request body. Optional team_id, service and env selectors narrow the signal query within that organization.

| Method | Route | Behavior |
|---|---|---|
| POST | /api/monitors | Create a canonical rule using signal_type; omitted window_seconds uses the configured default |
| GET | /api/monitors | List organization rules; includes display aliases for existing consumers |
| GET | /api/monitors/:id | Get the stored rule |
| PATCH | /api/monitors/:id | Change editable fields; enabled toggles evaluation |
| DELETE | /api/monitors/:id | Delete the rule while retaining unexpired alerts |
| POST | /api/monitors/:id/evaluate | Evaluate immediately using the same concurrency guard |
| GET | /api/monitors/:id/status | Current scalar, units, threshold state, operational status, warnings and estimated flag |
| GET | /api/alerts | Paginated alert history, including deleted rules |

Alert queries accept monitor_id, limit (1–100, default 50) and offset (0–1000000). Responses contain items, limit, offset and next_offset. They are sorted by fired_at descending, then storage ID descending; pagination is offset-based rather than a stable snapshot while new events arrive. The monitor_id filter is scoped to the authenticated organization even after deletion.

Canonical rules reject server-owned id, schemaVersion, runtime, history and state fields. PATCH merges and revalidates the full configuration. Rename-only edits preserve runtime; changes to measurement/threshold clear the cached value pending evaluation while preserving firing and notification pairing. Conflicting concurrent configuration writes return 409.

### Example rules

POST each object to /api/monitors with the existing authenticated cookie or bearer token. Thresholds use the response unit; metric units are preserved from storage without conversion.

```json
{
  "name": "Production error logs",
  "signal_type": "LOG",
  "query": "severity_text:ERROR deployment.environment:production",
  "aggregation": "COUNT",
  "window_seconds": 300,
  "comparator": "GT",
  "threshold": 100,
  "enabled": true,
  "cooldown_seconds": 600
}
```

```json
{
  "name": "API P95 latency (metric stored in ms)",
  "signal_type": "METRIC",
  "query": "service.name:api",
  "metric_name": "http.server.request.duration",
  "field": "value",
  "aggregation": "P95",
  "window_seconds": 300,
  "comparator": "GT",
  "threshold": 500,
  "enabled": true
}
```

```json
{
  "name": "Database trace P95 latency",
  "signal_type": "TRACE",
  "query": "db.system:postgres",
  "field": "duration_ms",
  "aggregation": "P95",
  "window_seconds": 300,
  "comparator": "GT",
  "threshold": 1000,
  "enabled": true
}
```

Comparators are GT, GTE, LT and LTE. Aggregations are COUNT, AVG, SUM, MAX, MIN, P95 and P99. Numeric aggregations require field. Logs read a numeric log/resource attribute, traces read duration_ms or a numeric span/resource attribute, and metrics require value. Metric selection uses metric_name or the query key metric_name; supplying both requires identical names. At most 100 rules are allowed per organization.

### Query semantics and stored fields

The syntax is whitespace-separated key:value filters combined with AND. Dotted keys remain literal. Quoted values support spaces and JSON escapes. An empty query matches every row allowed by the authenticated scope and optional selectors. OR, explicit AND tokens, negation, wildcards and grouping are rejected. Unknown keys are ignored with UNKNOWN_QUERY_KEY warnings in status and structured warning output; inspect warnings because ignored filters broaden the selection. Known keys for another signal are rejected.

| Query key | Stored source |
|---|---|
| service.name | ServiceName, falling back to ResourceAttributes['service.name'] |
| service.namespace, service.version | ResourceAttributes with the literal key |
| deployment.environment, deployment.environment.name | ResourceAttributes, preferring deployment.environment.name |
| otel.scope.name | ScopeName |
| severity_text (LOG) | SeverityText, case-insensitive equality |
| status.code (TRACE) | StatusCode, case-insensitive equality; empty becomes UNSET |
| metric_name (METRIC) | MetricName |
| http.status_code, http.response.status_code | Signal attributes then resource attributes; current and older keys supported |
| db.system, db.system.name | Signal attributes then resource attributes; current and older keys supported |
| rpc.grpc.status_code, messaging.system | Signal attributes then resource attributes |

SQL uses parameterized values, mandatory tenant filters and half-open windows [since, until). Query budgets fail rather than return partial results: 10 seconds, 500000 rows read, 128 MiB memory and 10000 result rows per query. Metric cumulative baselines may read earlier retained points within those same budgets.

### Aggregates and unavailable data

- Gauge values and delta sums use stored points. Cumulative sums are differenced per series; resets start a new accumulation. Deltas belong to the endpoint timestamp, with no interpolation at the window boundary. COUNT counts points for Gauge/Sum and observations for histograms.
- Histograms aggregate stored observation counts, sums and buckets. Cumulative buckets require a compatible baseline/layout; missing baselines and invalid layouts produce NO_DATA. Cumulative histogram MIN/MAX cannot recover window extrema and produce NO_DATA.
- Scalar P95/P99 use exact nearest-rank quantiles of the selected scalar samples. Histogram P95/P99 return the finite upper bound of the ranked bucket with estimated=true, without interpolation. If the rank lies in the unbounded overflow bucket, the result is NO_DATA with estimated=true rather than an invented finite value.
- The estimated boolean appears in status and canonical AlertEvent snapshots. Other measurements use false. Legacy historical snapshots use null where this fact was never stored.
- Empty COUNT is zero. Empty numeric aggregates produce NO_DATA. Ambiguous metric types/units and database failures produce ERROR. Unavailable evaluations retain the last threshold state and cannot produce a false recovery; value becomes null and operational_status explains why.

## State, notifications and history

Rules start with threshold state OK. A crossing emits FIRING once; returning across the comparator emits RECOVERED once. Staying on either side emits nothing. State is independent of operational_status (OK, NO_DATA or ERROR); status before the first evaluation is NOT_EVALUATED.

DummyNotifier writes one JSON alert line to stdout. It implements Notifier; no external notification service is configured. Alert snapshots include name, signal, scalar, unit, estimated, comparator, threshold, window, transition revision, timestamp and notification receipt.

PATCH muted_until with an ISO timestamp to suppress delivery until that time; set it to null to clear. Mute suppresses firing and recovery delivery while state transitions remain in history. cooldown_seconds defaults to zero and suppresses new firing attempts within the cooldown. A failed firing attempt consumes the cooldown. Recovery bypasses cooldown but requires a successfully sent firing in that episode and still respects mute. Suppression records MUTED, COOLDOWN or UNPAIRED_RECOVERY. Expiry alone never replays an old transition.

State and event insertion are atomic. Delivery occurs after commit and its receipt is persisted separately as SENT or FAILED; suppressed events carry SUPPRESSED. A process crash between commit and delivery/receipt can leave PENDING. There is no durable outbox, replay or automatic retry in this single-process MVP; exactly-once delivery across process crashes is not promised. In-process concurrency and stale writers cannot duplicate a committed transition or its notifier invocation.

Rules and events share the existing AUTH_DB_PATH database (default data/platform.sqlite); keep it on persistent storage. Events live in monitor_alert_events, not embedded rule JSON. Pruning runs at startup and periodically, and reads enforce the retention cutoff too. Alert history survives rule deletion until retention expires. Legacy signal-chart samples retain their separate 24-hour / 2880-sample policy.

## Configuration and operational telemetry

Settings are read through the existing ConfigService at startup. Invalid values fail startup; restart the application after changing them. Request-level windows must be positive integers, not numeric strings or null.

| Environment variable | Default | Meaning |
|---|---|---|
| MONITOR_CHECK_INTERVAL_SECONDS | 30 | Positive integer evaluation cadence, fitting a Node timer |
| MONITOR_INITIAL_DELAY_SECONDS | 1 | Nonnegative integer initial delay, fitting a Node timer |
| MONITOR_DEFAULT_WINDOW_SECONDS | 300 | Positive representable window, used only when omitted |
| MONITOR_NOTIFIER | dummy | Only supported notifier; other names fail startup |
| MONITOR_ALERT_RETENTION_DAYS | 30 | Positive representable alert cutoff |
| MONITOR_ALERT_PRUNE_INTERVAL_SECONDS | 3600 | Positive integer prune cadence, fitting a Node timer |

MonitoringTelemetry uses the global Meter, Logger and Tracer from the existing SDK. It creates no SDK, exporter or signal pipeline. Log/trace correlation uses trusted tenant context and monitor/event IDs; self-instrumentation omits raw queries and private database errors. Metrics aggregate at the deployment resource and have no tenant, monitor or event labels.

| Metric | Labels |
|---|---|
| monitoring.evaluation.duration (seconds) | signal_type |
| monitoring.cycle.duration (seconds) | none |
| monitoring.evaluations | signal_type, outcome (OK/NO_DATA/ERROR/STALE/CANCELLED) |
| monitoring.evaluation.errors | signal_type |
| monitoring.alerts | signal_type, state (FIRING/RECOVERED) |
| monitoring.notifications | signal_type, status (SENT/FAILED) |

Alerts count committed transitions, including suppressed delivery. Notifications count completed attempts. A test independently fixes metric names, label keys and bounded values; update that allowlist deliberately when adding instrumentation.

## Legacy cutover and rollback

The local Kind inventory on 2026-10-15 contained **2 legacy monitors**, with **0 groupBy**, **0 warnThreshold**, **0 targets**, and **23 embedded events**. This is a local environment snapshot, not a production/staging count. No live rules were upgraded by this implementation.

1. Back up AUTH_DB_PATH before deploying. Stop the application or use a consistent SQLite backup that includes the active WAL; copying an actively written database file alone is insufficient. Confirm the inventory separately in each deployment.
2. Deploy one evaluator process using the same persistent database. The new alert schema/index is additive. First read of each legacy monitor imports valid embedded events once, removes the JSON events array and sets a migration marker in one transaction. Repeated reads do not duplicate events. Import failure rolls back and preserves the original JSON; investigate malformed legacy events before retrying. Expired events are not reimported.
3. Verify GET /api/alerts and the retained original event IDs/timestamps. Historical entries are marked legacy=true; unavailable snapshot fields are null and original values/statuses remain in original. They are not fabricated canonical FIRING/RECOVERED events.
4. Upgrade each rule explicitly with a complete canonical PATCH to its existing ID. Confirm query meaning, aggregation, comparator, units and threshold; legacy syntax/aliases are not silently converted. Verify status and firing/recovery in a controlled rule. Deletion retains imported history.
5. Delete the frozen log-query.ts / monitor-rule.ts legacy boundary only after both inventoried monitors are migrated and legacy API compatibility is verified. Recheck deployed counts before removing support elsewhere. No date-based automatic deletion is configured.

Legacy requests using type still use the old DTO, evaluation and authoring routes. The current frontend form remains a legacy authoring surface. Canonical authoring uses this JSON API; list responses offer display aliases but do not turn the legacy editor into a canonical editor. Canonical PUT, legacy mute and legacy chart-history routes return 409 and direct clients to PATCH or /api/alerts. This pass adds no new UI or chart sample history for canonical monitors.

For rollback after lazy migration, preserve the current database and restore the consistent pre-deployment backup with the previous application version. Imported legacy events were removed from JSON, so merely running the old binary against the migrated database does not restore its former history view. Account for writes since the backup when choosing a rollback point. The application does not perform destructive reverse migrations.

## Verification

From the repository root, build both workspaces with the installed package manager. These npm commands are equivalents of the Yarn workspace build scripts:

```powershell
npm run build --workspace backend
npm run build --workspace frontend
```

Then run source and compiled HTTP integrations from apps/backend (HTTP tests bind local loopback ports):

```powershell
node --import tsx --test 'src/**/*.test.ts' tests/monitors.integration.test.ts tests/unified-monitors.integration.test.ts
```

Run frontend contract/render tests from apps/frontend:

```powershell
node --import tsx --test tests/monitor-alignment.test.ts tests/monitor-evaluation.test.tsx tests/monitors-truthfulness.test.tsx tests/log-monitor-builder.test.tsx
```

Optional real SQL verification from apps/backend requires the existing kind-observability context and telemetry-hub ClickHouse deployment. Adapter tests clone schemas into uniquely named monitor_adapter_test databases, insert isolated fixtures and drop those databases in finally blocks. The legacy suite executes read-only fixtures/queries. Neither changes existing signal data or schemas.

```powershell
$env:TEST_KIND_CLICKHOUSE = '1'
node --import tsx --test tests/monitors-clickhouse.test.ts tests/signal-adapters-clickhouse.test.ts
Remove-Item Env:TEST_KIND_CLICKHOUSE
```

Coverage includes strict DTOs, tenant isolation, idempotent migration, file-backed restart, atomic rollback, concurrent evaluation, notification pairing, quantile overflow, real ClickHouse aggregates and a fixed telemetry label allowlist. Generated graphify-out files remain local and are excluded from commits.
