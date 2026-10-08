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

export const DATADOG_MONITORS: DatadogMonitor[] = [
  // 1. Metric alert with warning + critical thresholds, grouped by host.
  {
    id: 12345678,
    name: '[backend-service] High checkout latency',
    message: [
      '{{#is_alert}}',
      'Checkout p95 latency is {{value}}s (threshold {{threshold}}s) on {{host.name}}.',
      'Route: /checkout',
      '@slack-backend-alerts @pagerduty-checkout-oncall',
      '{{/is_alert}}',
      '{{#is_warning}}',
      'Checkout p95 latency is elevated ({{value}}s) on {{host.name}}.',
      '@slack-backend-alerts',
      '{{/is_warning}}',
      '{{#is_recovery}}',
      'Checkout latency recovered on {{host.name}}.',
      '@slack-backend-alerts',
      '{{/is_recovery}}',
    ].join('\n'),
    tags: ['service:backend-service', 'env:prod', 'team:checkout'],
    type: 'query alert',
    query:
      'avg(last_5m):avg:http.response_time{service:backend-service,route:/checkout} by {host} > 0.5',
    options: {
      thresholds: {
        critical: 0.5,
        warning: 0.3,
        critical_recovery: 0.4,
        warning_recovery: 0.25,
      },
      notify_no_data: false,
      no_data_timeframe: null,
      evaluation_delay: 60,
      require_full_window: true,
      notify_audit: false,
      renotify_interval: 0,
      include_tags: true,
      escalation_message: '',
      timeout_h: 0,
      new_group_delay: 60,
    },
    overall_state: 'Alert',
    state: {
      groups: {
        'host:web-01': {
          status: 'Alert',
          last_triggered_ts: 1759731720,
          last_notified_ts: 1759731780,
        },
        'host:web-02': {
          status: 'Alert',
          last_triggered_ts: 1759731600,
          last_notified_ts: 1759731660,
        },
        'host:web-03': {
          status: 'OK',
          last_triggered_ts: 1759645200,
          last_resolved_ts: 1759646100,
        },
        'host:web-04': {
          status: 'OK',
          last_triggered_ts: 1759558800,
          last_resolved_ts: 1759559400,
        },
      },
    },
    silenced: {},
    priority: 2,
    restricted_roles: null,
    created: 1755000000,
    modified: 1759731720,
    creator: {
      id: 4242,
      name: 'Sasha Chen',
      email: 'sasha.chen@example.com',
      handle: 'sasha.chen@example.com',
    },
    draft_status: 'published',
    multi: true,
  },

  // 2. Log alert counting errors grouped by service.name.
  {
    id: 12345679,
    name: '[backend-service] Elevated error rate',
    message: [
      '{{#is_alert}}',
      'Error count for {{service.name}} is {{value}} in the last 5m (threshold {{threshold}}).',
      '@pagerduty-checkout-oncall',
      '{{/is_alert}}',
      '{{#is_warning}}',
      'Error count for {{service.name}} is {{value}} in the last 5m (warn {{threshold}}).',
      '@slack-backend-alerts',
      '{{/is_warning}}',
      '{{#is_recovery}}',
      'Error rate recovered for {{service.name}}.',
      '{{/is_recovery}}',
    ].join('\n'),
    tags: ['service:backend-service', 'env:prod', 'source:logs'],
    type: 'log alert',
    query:
      'logs("status:error service:backend-service").index("*").rollup("count").by("service.name").last("5m") > 50',
    options: {
      thresholds: { critical: 50, warning: 25 },
      notify_no_data: false,
      no_data_timeframe: null,
      evaluation_delay: 0,
      require_full_window: false,
      notify_audit: false,
      renotify_interval: 30,
      include_tags: true,
      escalation_message: 'Still firing after 30m — escalating to on-call.',
      timeout_h: 0,
    },
    overall_state: 'Warn',
    state: {
      groups: {
        'service.name:checkout': {
          status: 'Warn',
          last_triggered_ts: 1759730400,
          last_notified_ts: 1759730460,
        },
        'service.name:payments': {
          status: 'OK',
          last_triggered_ts: 1759644000,
          last_resolved_ts: 1759644300,
        },
        'service.name:inventory': {
          status: 'OK',
          last_triggered_ts: 1759557600,
          last_resolved_ts: 1759557900,
        },
      },
    },
    silenced: {},
    priority: 3,
    restricted_roles: null,
    created: 1755001000,
    modified: 1759730400,
    creator: {
      id: 4242,
      name: 'Sasha Chen',
      email: 'sasha.chen@example.com',
      handle: 'sasha.chen@example.com',
    },
    draft_status: 'published',
    multi: true,
  },

  // 3. Metric alert with notify_no_data, currently in "No Data".
  {
    id: 12345680,
    name: '[iot-gateway] Telemetry heartbeat missing',
    message: [
      '{{#is_no_data}}',
      'No telemetry received from {{host.name}} in the last 10 minutes.',
      '@slack-backend-alerts @ops@example.com',
      '{{/is_no_data}}',
      '{{#is_recovery}}',
      'Telemetry resumed on {{host.name}}.',
      '@slack-backend-alerts',
      '{{/is_recovery}}',
    ].join('\n'),
    tags: ['service:backend-service', 'component:iot-gateway', 'env:prod'],
    type: 'query alert',
    query:
      'avg(last_10m):avg:iot.gateway.heartbeat{service:backend-service,component:iot-gateway} by {host} < 1',
    options: {
      thresholds: { critical: 1 },
      notify_no_data: true,
      no_data_timeframe: 10,
      evaluation_delay: 0,
      require_full_window: true,
      notify_audit: false,
      renotify_interval: 60,
      include_tags: true,
      escalation_message: 'Heartbeat still missing after 1h — paging on-call.',
      timeout_h: 0,
      new_group_delay: 120,
    },
    overall_state: 'No Data',
    state: {
      groups: {
        'host:iot-gw-07': {
          status: 'No Data',
          last_nodata_ts: 1759732200,
          last_triggered_ts: 1759728600,
          last_notified_ts: 1759728660,
        },
      },
    },
    silenced: {},
    priority: 1,
    restricted_roles: null,
    created: 1755002000,
    modified: 1759732200,
    creator: {
      id: 5150,
      name: 'Marcus Idowu',
      email: 'marcus.idowu@example.com',
      handle: 'marcus.idowu@example.com',
    },
    draft_status: 'published',
    multi: true,
  },

  // 4. Metric alert in "Warn" with one group Warn and others OK.
  {
    id: 12345681,
    name: '[backend-service] Heap usage climbing',
    message: [
      '{{#is_warning}}',
      'Heap usage is {{value}} on {{host.name}} (warn {{threshold}}).',
      '@slack-backend-alerts',
      '{{/is_warning}}',
      '{{#is_alert}}',
      'Heap usage is critical: {{value}} on {{host.name}}.',
      '@pagerduty-checkout-oncall',
      '{{/is_alert}}',
      '{{#is_recovery}}',
      'Heap usage recovered on {{host.name}}.',
      '{{/is_recovery}}',
    ].join('\n'),
    tags: ['service:backend-service', 'resource:memory', 'env:prod'],
    type: 'query alert',
    query:
      'avg(last_15m):avg:process.memory.heap_used{service:backend-service} by {host} > 800000000',
    options: {
      thresholds: {
        critical: 800000000,
        warning: 600000000,
        critical_recovery: 700000000,
        warning_recovery: 500000000,
      },
      notify_no_data: false,
      no_data_timeframe: null,
      evaluation_delay: 120,
      require_full_window: true,
      notify_audit: false,
      renotify_interval: 0,
      include_tags: true,
      escalation_message: '',
      timeout_h: 0,
      new_group_delay: 300,
    },
    overall_state: 'Warn',
    state: {
      groups: {
        'host:web-01': {
          status: 'Warn',
          last_triggered_ts: 1759729000,
          last_notified_ts: 1759729060,
        },
        'host:web-02': {
          status: 'OK',
          last_triggered_ts: 1759642600,
          last_resolved_ts: 1759643200,
        },
        'host:web-03': {
          status: 'OK',
          last_triggered_ts: 1759556200,
          last_resolved_ts: 1759556800,
        },
      },
    },
    silenced: {},
    priority: 3,
    restricted_roles: null,
    created: 1755003000,
    modified: 1759729000,
    creator: {
      id: 5150,
      name: 'Marcus Idowu',
      email: 'marcus.idowu@example.com',
      handle: 'marcus.idowu@example.com',
    },
    draft_status: 'published',
    multi: true,
  },

  // 5. Muted monitor (silenced indefinitely) — overall_state still reflects reality.
  {
    id: 12345682,
    name: '[backend-service] Event loop stalls',
    message: [
      '{{#is_alert}}',
      'Event loop delay is {{value}}s on {{host.name}} (threshold {{threshold}}s).',
      '@slack-backend-alerts',
      '{{/is_alert}}',
      '{{#is_recovery}}',
      'Event loop delay recovered on {{host.name}}.',
      '{{/is_recovery}}',
    ].join('\n'),
    tags: ['service:backend-service', 'runtime:nodejs', 'env:prod'],
    type: 'query alert',
    query:
      'avg(last_5m):avg:nodejs.eventloop.delay{service:backend-service} by {host} > 0.1',
    options: {
      thresholds: { critical: 0.1, warning: 0.05 },
      notify_no_data: false,
      no_data_timeframe: null,
      evaluation_delay: 0,
      require_full_window: false,
      notify_audit: false,
      renotify_interval: 0,
      include_tags: true,
      escalation_message: '',
      timeout_h: 0,
    },
    overall_state: 'OK',
    state: {
      groups: {
        'host:web-01': {
          status: 'OK',
          last_triggered_ts: 1759640000,
          last_resolved_ts: 1759640600,
        },
        'host:web-02': {
          status: 'OK',
          last_triggered_ts: 1759553600,
          last_resolved_ts: 1759554200,
        },
      },
    },
    silenced: { '*': null },
    priority: 4,
    restricted_roles: null,
    created: 1755004000,
    modified: 1759720000,
    creator: {
      id: 4242,
      name: 'Sasha Chen',
      email: 'sasha.chen@example.com',
      handle: 'sasha.chen@example.com',
    },
    draft_status: 'published',
    multi: false,
  },

  // 6. Composite monitor referencing two other monitor IDs.
  {
    id: 12345683,
    name: '[backend-service] Checkout degraded (composite)',
    message: [
      '{{#is_alert}}',
      'Checkout is degraded: latency alert AND error rate alert are both firing.',
      '@pagerduty-checkout-oncall @ops@example.com',
      '{{/is_alert}}',
      '{{#is_recovery}}',
      'Checkout composite recovered.',
      '@pagerduty-checkout-oncall',
      '{{/is_recovery}}',
    ].join('\n'),
    tags: ['service:backend-service', 'team:checkout', 'composite:true'],
    type: 'composite',
    query: '12345678 && 12345679',
    options: {
      thresholds: { critical: 1 },
      notify_no_data: false,
      no_data_timeframe: null,
      require_full_window: false,
      notify_audit: false,
      renotify_interval: 15,
      include_tags: true,
      escalation_message:
        'Composite still firing after 15m — escalating to checkout on-call.',
      timeout_h: 0,
    },
    overall_state: 'Alert',
    state: {
      groups: {
        '*': {
          status: 'Alert',
          last_triggered_ts: 1759731800,
          last_notified_ts: 1759731860,
        },
      },
    },
    silenced: {},
    priority: 1,
    restricted_roles: null,
    created: 1755005000,
    modified: 1759731800,
    creator: {
      id: 4242,
      name: 'Sasha Chen',
      email: 'sasha.chen@example.com',
      handle: 'sasha.chen@example.com',
    },
    draft_status: 'published',
    multi: false,
  },

  // 7. Metric alert with escalation_message + renotify_interval, OK overall.
  {
    id: 12345684,
    name: '[backend-service] Disk saturation on telemetry writers',
    message: [
      '{{#is_alert}}',
      'Disk usage on {{host.name}} is {{value}}% (threshold {{threshold}}%).',
      '@slack-backend-alerts @ops@example.com',
      '{{/is_alert}}',
      '{{#is_warning}}',
      'Disk usage on {{host.name}} is {{value}}% (warn {{threshold}}%).',
      '@slack-backend-alerts',
      '{{/is_warning}}',
      '{{#is_recovery}}',
      'Disk usage recovered on {{host.name}}.',
      '@slack-backend-alerts',
      '{{/is_recovery}}',
    ].join('\n'),
    tags: ['service:backend-service', 'resource:disk', 'env:prod'],
    type: 'query alert',
    query:
      'avg(last_15m):avg:system.disk.in_use{service:backend-service,role:telemetry-writer} by {host} > 0.85',
    options: {
      thresholds: {
        critical: 0.85,
        warning: 0.75,
        critical_recovery: 0.8,
        warning_recovery: 0.7,
      },
      notify_no_data: false,
      no_data_timeframe: null,
      evaluation_delay: 60,
      require_full_window: true,
      notify_audit: false,
      renotify_interval: 45,
      include_tags: true,
      escalation_message: 'Disk still saturated after 45m — escalating to ops.',
      timeout_h: 0,
      new_group_delay: 120,
    },
    overall_state: 'OK',
    state: {
      groups: {
        'host:telemetry-writer-01': {
          status: 'OK',
          last_triggered_ts: 1759648000,
          last_resolved_ts: 1759648600,
        },
        'host:telemetry-writer-02': {
          status: 'OK',
          last_triggered_ts: 1759561600,
          last_resolved_ts: 1759562200,
        },
      },
    },
    silenced: {},
    priority: 3,
    restricted_roles: null,
    created: 1755006000,
    modified: 1759728000,
    creator: {
      id: 5150,
      name: 'Marcus Idowu',
      email: 'marcus.idowu@example.com',
      handle: 'marcus.idowu@example.com',
    },
    draft_status: 'published',
    multi: true,
  },

  // 8. Metric alert currently in "Skipped" overall_state (mapped to neutral).
  {
    id: 12345685,
    name: '[backend-service] Payments auth failures',
    message: [
      '{{#is_alert}}',
      'Payment auth failures: {{value}} in the last 5m (threshold {{threshold}}).',
      '@pagerduty-checkout-oncall @ops@example.com',
      '{{/is_alert}}',
      '{{#is_recovery}}',
      'Payment auth failures recovered.',
      '@pagerduty-checkout-oncall',
      '{{/is_recovery}}',
    ].join('\n'),
    tags: ['service:backend-service', 'component:payments', 'env:prod'],
    type: 'query alert',
    query:
      'sum(last_5m):sum:payments.auth.failures{service:backend-service,component:payments} by {host} > 25',
    options: {
      thresholds: { critical: 25, warning: 10 },
      notify_no_data: false,
      no_data_timeframe: null,
      evaluation_delay: 0,
      require_full_window: false,
      notify_audit: false,
      renotify_interval: 30,
      include_tags: true,
      escalation_message: 'Payment auth failures still elevated after 30m.',
      timeout_h: 0,
    },
    overall_state: 'Skipped',
    state: {
      groups: {
        'host:web-01': { status: 'Skipped', last_resolved_ts: 1759725000 },
        'host:web-02': { status: 'Skipped', last_resolved_ts: 1759725000 },
      },
    },
    silenced: {},
    priority: 2,
    restricted_roles: null,
    created: 1755007000,
    modified: 1759725000,
    creator: {
      id: 4242,
      name: 'Sasha Chen',
      email: 'sasha.chen@example.com',
      handle: 'sasha.chen@example.com',
    },
    draft_status: 'published',
    multi: true,
  },
];

export type MonitorType = 'metric' | 'log' | 'other';

export type Aggregation = 'avg' | 'sum' | 'min' | 'max' | 'count';

export type Comparator =
  | 'above'
  | 'below'
  | 'above_or_equal'
  | 'below_or_equal';

export type MonitorStatus = 'OK' | 'Alert' | 'Warn' | 'No Data' | 'neutral';

export type NotificationTarget = 'email' | 'slack' | 'webhook' | 'pagerduty';

export interface MonitorView {
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
  'OK',
  'Warn',
  'Alert',
  'No Data',
  'neutral',
];
