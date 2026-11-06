export type DatadogMonitorType =
  | 'query alert'
  | 'log alert'
  | 'service check'
  | 'event-v2 alert'
  | 'composite'
  | 'process alert'
  | 'trace-analytics alert'
  | 'rum alert'
  | 'synthetics alert';

export type DatadogMonitorOverallState =
  | 'OK'
  | 'Alert'
  | 'Warn'
  | 'No Data'
  | 'Skipped'
  | 'Ignored'
  | 'Unknown';

export interface DatadogMonitorThresholds {
  critical: number;
  warning?: number;
  critical_recovery?: number;
  warning_recovery?: number;
}

export interface DatadogMonitorOptions {
  thresholds: DatadogMonitorThresholds;
  notify_no_data: boolean;
  no_data_timeframe: number | null;
  evaluation_delay?: number;
  require_full_window: boolean;
  notify_audit: boolean;
  renotify_interval: number; // 0 = off
  include_tags: boolean;
  escalation_message: string;
  timeout_h?: number;
  new_group_delay?: number;
}

export interface DatadogMonitorGroupState {
  status: string;
  last_triggered_ts?: number;
  last_resolved_ts?: number;
  last_notified_ts?: number;
  last_nodata_ts?: number;
}

export interface DatadogMonitorState {
  groups: Record<string, DatadogMonitorGroupState>;
}

export interface DatadogMonitorCreator {
  id: number;
  name: string | null;
  email: string;
  handle: string;
}

export interface DatadogMonitor {
  id: number;
  name: string;
  message: string;
  tags: string[];
  type: DatadogMonitorType;
  query: string;
  options: DatadogMonitorOptions;
  overall_state: DatadogMonitorOverallState;
  state: DatadogMonitorState;
  /**
   * Empty object = not muted.
   * `{"*": null}` = muted indefinitely.
   * Muting is NOT a status; use the `isMuted` flag in the view model.
   */
  silenced: Record<string, number | null>;
  priority: number | null;
  restricted_roles: string[] | null;
  created: number; // Unix seconds
  modified: number; // Unix seconds
  creator: DatadogMonitorCreator;
  draft_status: 'published';
  multi: boolean;
}

export type MonitorType = 'metric' | 'log' | 'trace' | 'other';

export type Aggregation = 'avg' | 'sum' | 'min' | 'max' | 'count' | 'p95';

export type Comparator =
  | 'above'
  | 'below'
  | 'above_or_equal'
  | 'below_or_equal';

export type MonitorStatus = 'OK' | 'Alert' | 'Warn' | 'No Data' | 'neutral' | 'Unknown';

export type NotificationTarget = 'email' | 'slack' | 'webhook' | 'pagerduty';

export interface MonitorView {
  metricType?: 'gauge' | 'sum' | 'histogram';
  signalStatus?: string;
  logAttribute?: string;
  noDataPolicy?: 'no_data' | 'zero';
  value?: number | null;
  unit?: string;
  evaluationEnabled?: boolean;
  evaluationError?: string | null;
  history?: Array<{ t: number; v: number | null; status: MonitorStatus }>;
  events?: MonitorEvent[];
  groups?: Array<{ key: string; labels: string[]; value: number | null; status: MonitorStatus; samples: number }>;
  teamId?: string;
  service?: string;
  env?: string;
  id: string;
  name: string;
  type: MonitorType;
  datadogType: DatadogMonitorType;

  query: string;
  aggregation?: Aggregation;
  metric?: string;
  logSource?: string;
  groupBy?: string[];
  comparator: Comparator;
  threshold: number;
  warnThreshold?: number;
  evaluationWindow: string;

  message: string;
  targets: NotificationTarget[];

  createdAt: string;
  updatedAt: string;

  status: MonitorStatus;
  isMuted: boolean;
  lastTriggeredAt?: string;
  lastEvaluatedAt?: string | null;
}

export function normalizeMonitorEvaluation(monitor: MonitorView): MonitorView {
  const observed = typeof monitor.lastEvaluatedAt === 'string'
    && Number.isFinite(Date.parse(monitor.lastEvaluatedAt));
  return observed ? monitor : { ...monitor, status: 'Unknown', lastEvaluatedAt: null };
}

export function mapOverallState(
  state: DatadogMonitorOverallState,
): MonitorStatus {
  switch (state) {
    case 'OK':
      return 'OK';
    case 'Alert':
      return 'Alert';
    case 'Warn':
      return 'Warn';
    case 'No Data':
      return 'No Data';
    case 'Skipped':
    case 'Ignored':
    case 'Unknown':
    default:
      return 'neutral';
  }
}

export function isMuted(monitor: DatadogMonitor): boolean {
  return Object.keys(monitor.silenced ?? {}).length > 0;
}

export function mapMonitorType(type: DatadogMonitorType): MonitorType {
  if (type === 'query alert') return 'metric';
  if (type === 'log alert') return 'log';
  return 'other';
}

export interface ParsedDatadogQuery {
  aggregation: Aggregation | undefined;
  metric: string | undefined;
  tags: Record<string, string>;
  groupBy: string[];
  comparator: Comparator | undefined;
  threshold: number | undefined;
  window: string | undefined;
}

export const COMPARATOR_TOKENS: Array<{ token: string; value: Comparator }> = [
  { token: '>=', value: 'above_or_equal' },
  { token: '<=', value: 'below_or_equal' },
  { token: '>', value: 'above' },
  { token: '<', value: 'below' },
];

export function findComparator(
  query: string,
): { comparator: Comparator; end: number } | undefined {
  let inQuote = false;
  for (let i = 0; i < query.length; i++) {
    const ch = query[i];
    if (ch === '"') inQuote = !inQuote;
    if (inQuote) continue;
    for (const { token, value } of COMPARATOR_TOKENS) {
      if (query.startsWith(token, i)) {
        return { comparator: value, end: i + token.length };
      }
    }
  }
  return undefined;
}

export function parseDatadogQuery(raw: string): ParsedDatadogQuery {
  const query = (raw ?? '').trim();
  const result: ParsedDatadogQuery = {
    aggregation: undefined,
    metric: undefined,
    tags: {},
    groupBy: [],
    comparator: undefined,
    threshold: undefined,
    window: undefined,
  };
  if (!query) return result;

  const comparatorMatch = findComparator(query);
  if (comparatorMatch) {
    result.comparator = comparatorMatch.comparator;
    const after = query.slice(comparatorMatch.end);
    const numMatch = after.match(/-?\d+(?:\.\d+)?/);
    if (numMatch) result.threshold = Number(numMatch[0]);
  }

  const lastFn = query.match(/\.last\(\s*"([^"]+)"\s*\)/);
  if (lastFn) {
    result.window = lastFn[1];
  } else {
    const lastPrefix = query.match(/last_(\d+[smhdw])/);
    if (lastPrefix) result.window = lastPrefix[1];
  }

  const logsFn = query.match(/logs\(\s*"([^"]*)"\s*\)/);
  if (logsFn) {
    for (const part of logsFn[1].split(/\s+/)) {
      const [k, v] = part.split(':');
      if (k && v) result.tags[k] = v;
    }
    const rollup = query.match(/\.rollup\(\s*"([^"]+)"\s*\)/);
    if (rollup) {
      const agg = rollup[1].toLowerCase();
      if (
        agg === 'avg' ||
        agg === 'sum' ||
        agg === 'min' ||
        agg === 'max' ||
        agg === 'count'
      ) {
        result.aggregation = agg;
      }
    }
    const byFn = query.match(/\.by\(\s*"([^"]+)"\s*\)/);
    if (byFn) {
      result.groupBy = byFn[1]
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return result;
  }

  const metricMatch = query.match(
    /^([a-z]+)\(([^)]+)\):([a-z]+):([A-Za-z0-9_.]+)\{([^}]*)\}/,
  );
  if (metricMatch) {
    const [, outerAgg, , innerAgg, metric, tagBody] = metricMatch;
    const agg = (innerAgg || outerAgg).toLowerCase();
    if (
      agg === 'avg' ||
      agg === 'sum' ||
      agg === 'min' ||
      agg === 'max' ||
      agg === 'count'
    ) {
      result.aggregation = agg;
    }
    result.metric = metric;
    for (const pair of tagBody.split(',')) {
      const [k, v] = pair.split(':');
      if (k && v) result.tags[k.trim()] = v.trim();
    }
  }

  const byMatch = query.match(/\bby\s*\{([^}]*)\}/);
  if (byMatch) {
    result.groupBy = byMatch[1]
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  return result;
}

export const TARGET_PATTERNS: Array<{
  target: NotificationTarget;
  re: RegExp;
}> = [
  { target: 'slack', re: /@slack-[A-Za-z0-9_-]+/g },
  { target: 'pagerduty', re: /@pagerduty-[A-Za-z0-9_-]+/g },
  { target: 'email', re: /@[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g },
];

export function extractTargets(
  message: string,
  escalation?: string,
): NotificationTarget[] {
  const text = `${message ?? ''}\n${escalation ?? ''}`;
  const found = new Set<NotificationTarget>();
  for (const { target, re } of TARGET_PATTERNS) {
    re.lastIndex = 0;
    if (re.test(text)) found.add(target);
  }
  return Array.from(found);
}

export function lastTriggeredAt(monitor: DatadogMonitor): string | undefined {
  const groups = monitor.state?.groups ?? {};
  let max: number | undefined;
  for (const g of Object.values(groups)) {
    const ts = g.last_triggered_ts;
    if (typeof ts === 'number' && (max === undefined || ts > max)) max = ts;
  }
  return max !== undefined ? new Date(max * 1000).toISOString() : undefined;
}

export function toMonitorView(monitor: DatadogMonitor): MonitorView {
  const parsed = parseDatadogQuery(monitor.query);
  const type = mapMonitorType(monitor.type);

  return {
    id: String(monitor.id),
    name: monitor.name,
    type,
    datadogType: monitor.type,

    query: monitor.query,
    aggregation: parsed.aggregation,
    metric: parsed.metric,
    logSource: type === 'log' ? 'logs' : undefined,
    groupBy: parsed.groupBy.length ? parsed.groupBy : undefined,
    comparator: parsed.comparator ?? 'above',
    threshold: parsed.threshold ?? monitor.options.thresholds.critical,
    warnThreshold: monitor.options.thresholds.warning,
    evaluationWindow: parsed.window ?? '5m',

    message: monitor.message,
    targets: extractTargets(
      monitor.message,
      monitor.options.escalation_message,
    ),

    createdAt: new Date(monitor.created * 1000).toISOString(),
    updatedAt: new Date(monitor.modified * 1000).toISOString(),

    status: mapOverallState(monitor.overall_state),
    isMuted: isMuted(monitor),
    lastTriggeredAt: lastTriggeredAt(monitor),
  };
}

export function toMonitorViews(monitors: DatadogMonitor[]): MonitorView[] {
  return monitors.map(toMonitorView);
}

export interface SeriesPoint {
  t: number; // Unix ms
  v: number; // value (NaN = gap)
}

export interface MonitorSeries {
  points: SeriesPoint[];
  threshold: number;
  warnThreshold?: number;
  unit?: string;
  hasGap?: boolean;
  gapStart?: number;
  gapEnd?: number;
}

export function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function unitFor(monitor: DatadogMonitor): string | undefined {
  if (monitor.type === 'log alert') return 'count';
  if (monitor.query.includes('response_time')) return 's';
  if (monitor.query.includes('disk.in_use')) return '%';
  if (monitor.query.includes('heap_used')) return 'B';
  if (monitor.query.includes('eventloop.delay')) return 's';
  if (monitor.query.includes('auth.failures')) return 'count';
  return undefined;
}

export function synthesizeSeries(monitor: DatadogMonitor): MonitorSeries {
  const points: SeriesPoint[] = [];
  const now = Date.now();
  const stepMs = 5 * 60 * 1000; // 5 minutes
  const count = 24 * 12; // 24h
  const start = now - (count - 1) * stepMs;

  const critical = monitor.options.thresholds.critical;
  const warning = monitor.options.thresholds.warning;
  const rand = mulberry32(monitor.id);

  const quietBaseline = warning !== undefined ? warning * 0.55 : critical * 0.5;
  const below = monitor.query.includes(' < ') || monitor.query.includes(' <= ');

  for (let i = 0; i < count; i++) {
    const t = start + i * stepMs;
    const phase = i / count;

    const drift = Math.sin(phase * Math.PI * 2) * quietBaseline * 0.08;
    const noise = (rand() - 0.5) * quietBaseline * 0.12;
    let v = quietBaseline + drift + noise;

    if (monitor.type === 'composite') {
      v = monitor.overall_state === 'Alert' && phase > 0.8 ? 1 : 0;
    } else if (monitor.overall_state === 'Alert') {
      const spikeStart = 0.78;
      if (phase > spikeStart) {
        const k = (phase - spikeStart) / (1 - spikeStart);
        v =
          critical * (1.05 + 0.15 * Math.sin(k * 12)) +
          (rand() - 0.5) * critical * 0.08;
      }
    } else if (monitor.overall_state === 'Warn') {
      const spikeStart = 0.72;
      if (phase > spikeStart) {
        const warn = warning ?? critical * 0.7;
        const k = (phase - spikeStart) / (1 - spikeStart);
        v =
          warn * (1.05 + 0.1 * Math.sin(k * 10)) + (rand() - 0.5) * warn * 0.08;
      }
    } else if (monitor.overall_state === 'No Data') {
      if (phase > 0.85) {
        points.push({ t, v: NaN });
        continue;
      }
    }

    if (below) v = -v;
    points.push({ t, v });
  }

  const series: MonitorSeries = {
    points,
    threshold: below ? -critical : critical,
    warnThreshold:
      warning !== undefined ? (below ? -warning : warning) : undefined,
    unit: unitFor(monitor),
  };

  if (monitor.overall_state === 'No Data') {
    const gapIdx = points.findIndex((p) => Number.isNaN(p.v));
    if (gapIdx >= 0) {
      series.hasGap = true;
      series.gapStart = points[gapIdx].t;
      series.gapEnd = points[points.length - 1].t;
    }
  }

  return series;
}

export const API_BASE =
  (import.meta as any).env?.VITE_API_BASE ?? 'http://localhost:3001';

export const SIDEBAR_STORAGE_KEY = 'monitors:sidebar';

export interface MonitorEvent {
  id: string;
  monitorId: string;
  at: string;
  status: MonitorStatus;
  value?: number;
  message?: string;
}

export const statusTone = (
  s: MonitorStatus,
): 'success' | 'warning' | 'error' | 'neutral' | 'info' => {
  if (s === 'OK') return 'success';
  if (s === 'Warn') return 'warning';
  if (s === 'Alert') return 'error';
  if (s === 'No Data') return 'info';
  return 'neutral';
};

export const statusBg = (s: MonitorStatus): string => {
  if (s === 'OK') return 'bg-success';
  if (s === 'Warn') return 'bg-warning';
  if (s === 'Alert') return 'bg-destructive';
  if (s === 'No Data') return 'bg-primary';
  return 'bg-muted';
};

export const statusLabel = (s: MonitorStatus) =>
  ({
    OK: 'OK',
    Warn: 'Warn',
    Alert: 'Alert',
    'No Data': 'No data',
    neutral: '—',
    Unknown: 'Unknown',
  })[s];

export const formatRelative = (iso?: string) => {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
};

export const formatNumber = (n: number) => {
  if (Math.abs(n) >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return n.toLocaleString();
};

export const STATUS_FILTERS: MonitorStatus[] = [
  'Unknown',
  'OK',
  'Warn',
  'Alert',
  'No Data',
  'neutral',
];
