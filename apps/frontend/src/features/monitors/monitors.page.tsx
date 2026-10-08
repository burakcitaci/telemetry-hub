import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Activity, AlertCircle, ArrowLeft, Bell, BellOff, CheckCircle,
  ChevronDown, Clock, Filter, Info, PanelLeft, Pause, Play,
  Plus, RefreshCw, Search, Settings, Trash2, X, Zap,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { TimeRangePicker } from '@/app/components/timer-range.picker';
import { parseTimeRange, resolveTimeRange } from '@/shared/lib/time-range';

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 1 — Datadog Monitor API v1 types
// ═════════════════════════════════════════════════════════════════════════════

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

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 2 — Mock fixtures shaped like GET /api/v1/monitors
// ═════════════════════════════════════════════════════════════════════════════

// Mock data shaped like the Datadog Monitor API v1 response.
// All timestamps are Unix seconds and are before 2026-10-07.
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
      thresholds: { critical: 0.5, warning: 0.3, critical_recovery: 0.4, warning_recovery: 0.25 },
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
      escalation_message: 'Composite still firing after 15m — escalating to checkout on-call.',
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

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 3 — Adapter (DatadogMonitor → view model)
// ═════════════════════════════════════════════════════════════════════════════

export type MonitorType = 'metric' | 'log' | 'other';
export type Aggregation = 'avg' | 'sum' | 'min' | 'max' | 'count';
export type Comparator = 'above' | 'below' | 'above_or_equal' | 'below_or_equal';
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

export function mapOverallState(state: DatadogMonitorOverallState): MonitorStatus {
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

const COMPARATOR_TOKENS: Array<{ token: string; value: Comparator }> = [
  { token: '>=', value: 'above_or_equal' },
  { token: '<=', value: 'below_or_equal' },
  { token: '>', value: 'above' },
  { token: '<', value: 'below' },
];

function findComparator(
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

/**
 * Parse a Datadog metric or log query string.
 *
 * Metric:  avg(last_5m):avg:http.response_time{service:backend-service,route:/checkout} by {host} > 0.5
 * Log:     logs("status:error service:backend-service").index("*").rollup("count").by("service.name").last("5m") > 50
 */
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
      if (agg === 'avg' || agg === 'sum' || agg === 'min' || agg === 'max' || agg === 'count') {
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
    if (agg === 'avg' || agg === 'sum' || agg === 'min' || agg === 'max' || agg === 'count') {
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

const TARGET_PATTERNS: Array<{ target: NotificationTarget; re: RegExp }> = [
  { target: 'slack', re: /@slack-[A-Za-z0-9_-]+/g },
  { target: 'pagerduty', re: /@pagerduty-[A-Za-z0-9_-]+/g },
  { target: 'email', re: /@[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g },
];

export function extractTargets(message: string, escalation?: string): NotificationTarget[] {
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
    targets: extractTargets(monitor.message, monitor.options.escalation_message),

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

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 3b — Synthetic time series (dummy data, no API)
// ═════════════════════════════════════════════════════════════════════════════

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

// Deterministic PRNG so the graph doesn't jump around on every render.
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function unitFor(monitor: DatadogMonitor): string | undefined {
  if (monitor.type === 'log alert') return 'count';
  if (monitor.query.includes('response_time')) return 's';
  if (monitor.query.includes('disk.in_use')) return '%';
  if (monitor.query.includes('heap_used')) return 'B';
  if (monitor.query.includes('eventloop.delay')) return 's';
  if (monitor.query.includes('auth.failures')) return 'count';
  return undefined;
}

/**
 * Build a 24h @ 5-minute-resolution series for a monitor.
 * Shape depends on overall_state so the graph reads consistently with the
 * badge: Alert sits above critical, Warn sits between warn and critical,
 * No Data has a flat gap, etc.
 */
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
  const below =
    monitor.query.includes(' < ') || monitor.query.includes(' <= ');

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
          warn * (1.05 + 0.1 * Math.sin(k * 10)) +
          (rand() - 0.5) * warn * 0.08;
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

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 4 — Page config, helpers, and sub-components
// ═════════════════════════════════════════════════════════════════════════════

const API_BASE = (import.meta as any).env?.VITE_API_BASE ?? 'http://localhost:3001';
const SIDEBAR_STORAGE_KEY = 'monitors:sidebar';

interface MonitorEvent {
  id: string;
  monitorId: string;
  at: string;
  status: MonitorStatus;
  value?: number;
  message?: string;
}

const statusTone = (
  s: MonitorStatus,
): 'success' | 'warning' | 'error' | 'neutral' | 'info' => {
  if (s === 'OK') return 'success';
  if (s === 'Warn') return 'warning';
  if (s === 'Alert') return 'error';
  if (s === 'No Data') return 'info';
  return 'neutral';
};

const statusBg = (s: MonitorStatus): string => {
  if (s === 'OK') return 'bg-emerald-500';
  if (s === 'Warn') return 'bg-amber-500';
  if (s === 'Alert') return 'bg-red-500';
  if (s === 'No Data') return 'bg-blue-500';
  return 'bg-slate-400';
};

const statusLabel = (s: MonitorStatus) =>
  ({
    OK: 'OK',
    Warn: 'Warn',
    Alert: 'Alert',
    'No Data': 'No data',
    neutral: '—',
  }[s]);

const typeIcon = (t: MonitorType) =>
  t === 'metric' ? (
    <Activity className="h-3.5 w-3.5" />
  ) : t === 'log' ? (
    <Filter className="h-3.5 w-3.5" />
  ) : (
    <Info className="h-3.5 w-3.5" />
  );

const formatRelative = (iso?: string) => {
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

const formatNumber = (n: number) => {
  if (Math.abs(n) >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return n.toLocaleString();
};

const STATUS_FILTERS: MonitorStatus[] = [
  'OK',
  'Warn',
  'Alert',
  'No Data',
  'neutral',
];

const StatusDot: React.FC<{ status: MonitorStatus; pulse?: boolean }> = ({
  status,
  pulse,
}) => (
  <span className="relative inline-flex h-2.5 w-2.5 shrink-0">
   
   
  </span>
);

const StatusBadge: React.FC<{ status: MonitorStatus }> = ({ status }) => {
  const tone = statusTone(status);
  const cls =
    tone === 'success'
      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
      : tone === 'warning'
        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30'
        : tone === 'error'
          ? 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30'
          : tone === 'info'
            ? 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30'
            : 'bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-500/30';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${statusBg(status)}`} />
      {statusLabel(status)}
    </span>
  );
};

const MutedBadge: React.FC = () => (
  <span className="inline-flex items-center gap-1 rounded-full border border-slate-500/30 bg-slate-500/15 px-2 py-0.5 text-xs font-medium text-slate-700 dark:text-slate-400">
    <BellOff className="h-3 w-3" />
    Muted
  </span>
);

const TypeBadge: React.FC<{ type: MonitorType }> = ({ type }) => (
  <span className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
    {typeIcon(type)}
    {type}
  </span>
);

const TargetIcon: React.FC<{ target: NotificationTarget }> = ({ target }) => {
  const label = { email: '@', slack: '#', webhook: '{}', pagerduty: '!' }[target];
  return (
    <span
      title={target}
      className="inline-flex h-4 min-w-4 items-center justify-center rounded-sm bg-muted px-1 text-[10px] font-mono text-muted-foreground"
    >
      {label}
    </span>
  );
};

// ─── Graph (pure SVG) ────────────────────────────────────────────────────────

const MonitorGraph: React.FC<{
  series: MonitorSeries;
  status: MonitorStatus;
  height?: number;
  compact?: boolean;
}> = ({ series, status, height = 140, compact = false }) => {
  const { points, threshold, warnThreshold, unit } = series;

  const W = compact ? 100 : 600;
  const H = compact ? 28 : height;
  const padL = compact ? 0 : 44;
  const padR = compact ? 0 : 12;
  const padT = compact ? 2 : 10;
  const padB = compact ? 2 : 22;

  const finite = points.filter((p) => Number.isFinite(p.v));
  if (finite.length === 0) {
    if (compact) {
      return (
        <svg viewBox="0 0 100 28" className="w-full" style={{ height: 28 }}>
          <line
            x1={0}
            x2={100}
            y1={14}
            y2={14}
            stroke="#cbd5e1"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        </svg>
      );
    }
    return (
      <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
        No data in range
      </div>
    );
  }

  const vMin = Math.min(
    ...finite.map((p) => p.v),
    threshold,
    warnThreshold ?? threshold,
  );
  const vMax = Math.max(
    ...finite.map((p) => p.v),
    threshold,
    warnThreshold ?? threshold,
  );
  const vPad = (vMax - vMin) * 0.1 || 1;
  const yMin = vMin - vPad;
  const yMax = vMax + vPad;

  const tMin = points[0].t;
  const tMax = points[points.length - 1].t;

  const x = (t: number) =>
    padL + ((t - tMin) / (tMax - tMin || 1)) * (W - padL - padR);
  const y = (v: number) =>
    padT + (1 - (v - yMin) / (yMax - yMin || 1)) * (H - padT - padB);

  const segments: string[] = [];
  let current = '';
  for (const p of points) {
    if (!Number.isFinite(p.v)) {
      if (current) segments.push(current);
      current = '';
      continue;
    }
    const cmd = current ? 'L' : 'M';
    current += `${cmd}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)} `;
  }
  if (current) segments.push(current);

  const strokeColor =
    status === 'Alert'
      ? '#ef4444'
      : status === 'Warn'
        ? '#f59e0b'
        : status === 'No Data'
          ? '#3b82f6'
          : status === 'OK'
            ? '#10b981'
            : '#94a3b8';

  const fmt = (v: number) =>
    Math.abs(v) >= 1_000_000
      ? `${(v / 1_000_000).toFixed(1)}M`
      : Math.abs(v) >= 1_000
        ? `${(v / 1_000).toFixed(1)}k`
        : v.toFixed(v < 10 ? 2 : 0);

  // ── Compact: line + faint thresholds only, no labels ────────────────────
  if (compact) {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
        {warnThreshold !== undefined && (
          <line
            x1={0}
            x2={W}
            y1={y(warnThreshold)}
            y2={y(warnThreshold)}
            stroke="#f59e0b"
            strokeWidth={0.75}
            strokeDasharray="2 2"
            opacity={0.5}
          />
        )}
        <line
          x1={0}
          x2={W}
          y1={y(threshold)}
          y2={y(threshold)}
          stroke="#ef4444"
          strokeWidth={0.75}
          strokeDasharray="2 2"
          opacity={0.5}
        />
        {segments.map((d, i) => (
          <path key={i} d={d} fill="none" stroke={strokeColor} strokeWidth={1.25} />
        ))}
        {series.hasGap && series.gapStart && series.gapEnd && (
          <rect
            x={x(series.gapStart)}
            y={0}
            width={x(series.gapEnd) - x(series.gapStart)}
            height={H}
            fill="#3b82f6"
            opacity={0.1}
          />
        )}
      </svg>
    );
  }

  // ── Full: axes, labels, bands ───────────────────────────────────────────
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ height }}
      preserveAspectRatio="none"
    >
      {warnThreshold !== undefined && (
        <rect
          x={padL}
          y={Math.min(y(warnThreshold), y(threshold))}
          width={W - padL - padR}
          height={Math.abs(y(warnThreshold) - y(threshold))}
          fill="#f59e0b"
          opacity={0.08}
        />
      )}

      <line
        x1={padL}
        x2={W - padR}
        y1={y(threshold)}
        y2={y(threshold)}
        stroke="#ef4444"
        strokeWidth={1}
        strokeDasharray="4 3"
        opacity={0.8}
      />

      {warnThreshold !== undefined && (
        <line
          x1={padL}
          x2={W - padR}
          y1={y(warnThreshold)}
          y2={y(warnThreshold)}
          stroke="#f59e0b"
          strokeWidth={1}
          strokeDasharray="2 3"
          opacity={0.7}
        />
      )}

      {segments.map((d, i) => (
        <path key={i} d={d} fill="none" stroke={strokeColor} strokeWidth={1.5} />
      ))}

      {series.hasGap && series.gapStart && series.gapEnd && (
        <>
          <rect
            x={x(series.gapStart)}
            y={padT}
            width={x(series.gapEnd) - x(series.gapStart)}
            height={H - padT - padB}
            fill="#3b82f6"
            opacity={0.08}
          />
          <text
            x={(x(series.gapStart) + x(series.gapEnd)) / 2}
            y={padT + 14}
            textAnchor="middle"
            fontSize={10}
            fill="#3b82f6"
          >
            No data
          </text>
        </>
      )}

      <text
        x={padL - 6}
        y={y(yMax) + 4}
        textAnchor="end"
        fontSize={10}
        fill="#94a3b8"
      >
        {fmt(yMax)}
        {unit ? ` ${unit}` : ''}
      </text>
      <text
        x={padL - 6}
        y={y(yMin) + 4}
        textAnchor="end"
        fontSize={10}
        fill="#94a3b8"
      >
        {fmt(yMin)}
      </text>

      {[0, 0.5, 1].map((f) => {
        const t = tMin + f * (tMax - tMin);
        const label = f === 0 ? '24h ago' : f === 0.5 ? '12h ago' : 'now';
        return (
          <text
            key={f}
            x={x(t)}
            y={H - 6}
            textAnchor={f === 0 ? 'start' : f === 1 ? 'end' : 'middle'}
            fontSize={10}
            fill="#94a3b8"
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
};

// ─── Monitor row ─────────────────────────────────────────────────────────────

const MonitorRow: React.FC<{
  monitor: MonitorView;
  series: MonitorSeries;
  onToggleMute: (id: string) => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}> = ({ monitor, series, onToggleMute, onOpen, onDelete }) => {
  return (
    <div
      className="group grid cursor-pointer grid-cols-[16px_minmax(0,1fr)_112px_120px_auto_auto] items-center gap-4 border-b px-4 py-3 transition-colors hover:bg-accent/40"
      onClick={() => onOpen(monitor.id)}
    >
      {/* 1. Status dot */}
      <StatusDot status={monitor.status} pulse={monitor.status === 'Alert'} />

      {/* 2. Name + badges + query (truncates) */}
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{monitor.name}</span>
          <TypeBadge type={monitor.type} />
          {monitor.isMuted && <MutedBadge />}
        </div>
        <div className="mt-0.5">
          <span
            className="block truncate font-mono text-xs text-muted-foreground"
            title={monitor.query}
          >
            {monitor.query}
          </span>
        </div>
      </div>

      {/* 3. Sparkline — own fixed column */}
      <div className="hidden lg:block h-7">
        <MonitorGraph series={series} status={monitor.status} compact />
      </div>

      {/* 4. Condition (comparator + threshold + window) */}
      <div className="hidden lg:flex flex-col items-end text-xs text-muted-foreground">
        <span className="text-foreground font-medium whitespace-nowrap">
          {monitor.comparator.replace(/_/g, ' ')} {formatNumber(monitor.threshold)}
        </span>
        <span className="whitespace-nowrap">over {monitor.evaluationWindow}</span>
      </div>

      {/* 5. Last trigger */}
      <div className="hidden sm:block text-right">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
          Last trigger
        </div>
        <div className="text-xs font-medium whitespace-nowrap">
          {formatRelative(monitor.lastTriggeredAt)}
        </div>
      </div>

      {/* 6. Status badge + actions */}
      <div className="flex items-center gap-1">
        <StatusBadge status={monitor.status} />
        <div
          className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title={monitor.isMuted ? 'Unmute' : 'Mute'}
            onClick={() => onToggleMute(monitor.id)}
          >
            {monitor.isMuted ? (
              <BellOff className="h-3.5 w-3.5" />
            ) : (
              <Bell className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            title="Delete"
            onClick={() => onDelete(monitor.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

// ─── Detail pane (rendered inside the Sheet) ─────────────────────────────────

const MonitorDetail: React.FC<{
  monitor: MonitorView;
  datadogMonitor: DatadogMonitor;
  events: MonitorEvent[];
  onClose: () => void;
  onToggleMute: (id: string) => void;
}> = ({ monitor, datadogMonitor, events, onToggleMute }) => {
  const series = useMemo(
    () => synthesizeSeries(datadogMonitor),
    [datadogMonitor],
  );
  const lastPoint = series.points.filter((p) => Number.isFinite(p.v)).slice(-1)[0];
  const lastValue = lastPoint?.v;
  const fmtValue = (v?: number) =>
    v === undefined
      ? '—'
      : Math.abs(v) >= 1_000_000
        ? `${(v / 1_000_000).toFixed(2)}M`
        : Math.abs(v) >= 1_000
          ? `${(v / 1_000).toFixed(2)}k`
          : v.toFixed(v < 10 ? 3 : 0);

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-start justify-between gap-3 border-b p-4 pr-12">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-base font-semibold">{monitor.name}</h2>
            <TypeBadge type={monitor.type} />
            <StatusBadge status={monitor.status} />
            {monitor.isMuted && <MutedBadge />}
          </div>
          <p className="mt-1 font-mono text-xs text-muted-foreground break-all">
            {monitor.query}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onToggleMute(monitor.id)}
          >
            {monitor.isMuted ? (
              <>
                <Play className="mr-1.5 h-3.5 w-3.5" /> Unmute
              </>
            ) : (
              <>
                <Pause className="mr-1.5 h-3.5 w-3.5" /> Mute
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Condition summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Condition</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-muted-foreground">Trigger</div>
              <div className="font-mono">
                {monitor.aggregation}: {monitor.metric ?? monitor.logSource}{' '}
                {monitor.comparator.replace(/_/g, ' ')}{' '}
                {formatNumber(monitor.threshold)}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Evaluation window</div>
              <div className="font-mono">{monitor.evaluationWindow}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Group by</div>
              <div className="font-mono">{monitor.groupBy?.join(', ') || '—'}</div>
            </div>
            {monitor.warnThreshold !== undefined && (
              <div>
                <div className="text-muted-foreground">Warn threshold</div>
                <div className="font-mono">
                  {formatNumber(monitor.warnThreshold)}
                </div>
              </div>
            )}
            <div>
              <div className="text-muted-foreground">Notify</div>
              <div className="flex gap-1.5">
                {monitor.targets.length
                  ? monitor.targets.map((t) => (
                      <TargetIcon key={t} target={t} />
                    ))
                  : '—'}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Graph */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Evaluated data</CardTitle>
              <span className="font-mono text-xs text-muted-foreground">
                now {fmtValue(lastValue)}
                {series.unit ? ` ${series.unit}` : ''} · critical{' '}
                {fmtValue(series.threshold)}
                {series.warnThreshold !== undefined
                  ? ` · warn ${fmtValue(series.warnThreshold)}`
                  : ''}
              </span>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <MonitorGraph series={series} status={monitor.status} />
            <p className="mt-2 text-[10px] text-muted-foreground">
              Dummy series · 24h @ 5m resolution ·{' '}
              {/* TODO: replace with GET /api/v1/query or the Snapshot API */}
              replace with <code>GET /api/v1/query</code> once wired up.
            </p>
          </CardContent>
        </Card>

        {/* History */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              State history
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {events.length} event{events.length === 1 ? '' : 's'}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {events.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-muted-foreground">
                No state changes yet
              </p>
            ) : (
              <ul className="divide-y">
                {events.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center gap-3 px-4 py-2 text-xs"
                  >
                    <StatusDot status={e.status} />
                    <span className="w-40 shrink-0 text-muted-foreground">
                      {new Date(e.at).toLocaleString()}
                    </span>
                    <StatusBadge status={e.status} />
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">
                      {e.message ??
                        (e.value !== undefined ? `value=${e.value}` : '')}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="text-[11px] text-muted-foreground">
          Created {new Date(monitor.createdAt).toLocaleString()} · Updated{' '}
          {new Date(monitor.updatedAt).toLocaleString()} · Last triggered{' '}
          {formatRelative(monitor.lastTriggeredAt)}
        </div>
      </div>
    </div>
  );
};

// ─── Create / edit form (rendered inside the Sheet) ──────────────────────────

const MonitorForm: React.FC<{
  initial?: MonitorView | null;
  onCancel: () => void;
  onSave: (draft: Partial<MonitorView>) => void;
}> = ({ initial, onCancel, onSave }) => {
  const [type, setType] = useState<MonitorType>(initial?.type ?? 'metric');
  const [name, setName] = useState(initial?.name ?? '');
  const [query, setQuery] = useState(initial?.query ?? '');
  const [aggregation, setAggregation] = useState<Aggregation>(
    initial?.aggregation ?? 'avg',
  );
  const [groupBy, setGroupBy] = useState((initial?.groupBy ?? []).join(', '));
  const [comparator, setComparator] = useState<Comparator>(
    initial?.comparator ?? 'above',
  );
  const [threshold, setThreshold] = useState(String(initial?.threshold ?? 100));
  const [warnThreshold, setWarnThreshold] = useState(
    initial?.warnThreshold !== undefined ? String(initial.warnThreshold) : '',
  );
  const [evaluationWindow, setEvaluationWindow] = useState(
    initial?.evaluationWindow ?? '5m',
  );
  const [message, setMessage] = useState(initial?.message ?? '');
  const [targets, setTargets] = useState<Set<NotificationTarget>>(
    new Set(initial?.targets ?? ['slack']),
  );

  const canSave = name.trim() && query.trim() && threshold.trim();

  const toggleTarget = (t: NotificationTarget) => {
    setTargets((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b p-4 pr-12">
        <div>
          <h2 className="text-base font-semibold">
            {initial ? 'Edit monitor' : 'New monitor'}
          </h2>
          <p className="text-xs text-muted-foreground">
            {initial
              ? `Editing ${initial.name}`
              : 'Define a query, a threshold, and who to notify.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            disabled={!canSave}
            onClick={() =>
              onSave({
                type,
                name: name.trim(),
                query: query.trim(),
                aggregation,
                groupBy: groupBy
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean),
                comparator,
                threshold: Number(threshold),
                warnThreshold: warnThreshold ? Number(warnThreshold) : undefined,
                evaluationWindow,
                message,
                targets: Array.from(targets),
              })
            }
          >
            {initial ? 'Save' : 'Create monitor'}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Type + name */}
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[160px_1fr]">
              <div>
                <label className="mb-1.5 block text-xs font-medium">Type</label>
                <Select
                  value={type}
                  onValueChange={(v) => setType(v as MonitorType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="metric">Metric</SelectItem>
                    <SelectItem value="log">Log</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium">Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={
                    type === 'metric'
                      ? 'High checkout latency'
                      : 'Elevated error rate'
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Query */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Query</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium">
                {type === 'metric'
                  ? 'Metric query'
                  : type === 'log'
                    ? 'Log query'
                    : 'Query'}
              </label>
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  type === 'metric'
                    ? 'avg(last_5m):avg:http.response_time{service:backend-service} by {host} > 0.5'
                    : type === 'log'
                      ? 'logs("status:error service:backend-service").rollup("count").last("5m") > 50'
                      : '12345678 && 12345679'
                }
                className="font-mono text-xs"
              />
            </div>

            {type === 'metric' && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium">
                    Aggregation
                  </label>
                  <Select
                    value={aggregation}
                    onValueChange={(v) => setAggregation(v as Aggregation)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(['avg', 'sum', 'min', 'max', 'count'] as Aggregation[]).map(
                        (a) => (
                          <SelectItem key={a} value={a}>
                            {a}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-xs font-medium">
                    Group by{' '}
                    <span className="text-muted-foreground font-normal">
                      (optional, comma-separated)
                    </span>
                  </label>
                  <Input
                    value={groupBy}
                    onChange={(e) => setGroupBy(e.target.value)}
                    placeholder="host.name, service.version"
                    className="font-mono text-xs"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Condition */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Alert condition</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-end gap-2">
              <span className="pb-2 text-xs text-muted-foreground">
                Trigger when the value is
              </span>
              <div className="w-40">
                <Select
                  value={comparator}
                  onValueChange={(v) => setComparator(v as Comparator)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="above">Above</SelectItem>
                    <SelectItem value="above_or_equal">Above or equal to</SelectItem>
                    <SelectItem value="below">Below</SelectItem>
                    <SelectItem value="below_or_equal">Below or equal to</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-40">
                <Input
                  type="number"
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  placeholder="500"
                />
              </div>
              <span className="pb-2 text-xs text-muted-foreground">over</span>
              <div className="w-28">
                <Input
                  value={evaluationWindow}
                  onChange={(e) => setEvaluationWindow(e.target.value)}
                  placeholder="5m"
                  className="font-mono text-xs"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-3 border-t pt-3">
              <div className="w-40">
                <label className="mb-1.5 block text-xs font-medium">
                  Warn threshold{' '}
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </label>
                <Input
                  type="number"
                  value={warnThreshold}
                  onChange={(e) => setWarnThreshold(e.target.value)}
                  placeholder="300"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notify */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Notify</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="{{#is_alert}}Checkout latency is {{value}}s (threshold {{threshold}}s).{{/is_alert}} @slack-backend-alerts"
                className="w-full rounded-md border bg-background px-3 py-2 text-xs font-mono outline-none focus:ring-1 focus:ring-ring"
              />
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                Supports Datadog template syntax:{' '}
                <code>{'{{#is_alert}}…{{/is_alert}}'}</code>,{' '}
                <code>{'{{value}}'}</code>, <code>{'{{threshold}}'}</code>,{' '}
                <code>{'{{host.name}}'}</code>, plus <code>@slack-…</code>,{' '}
                <code>@pagerduty-…</code>, and email handles.
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium">Targets</label>
              <div className="flex flex-wrap gap-2">
                {(
                  ['slack', 'email', 'pagerduty', 'webhook'] as NotificationTarget[]
                ).map((t) => {
                  const on = targets.has(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleTarget(t)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${
                        on
                          ? 'border-transparent bg-accent text-accent-foreground'
                          : 'border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground/60'
                      }`}
                    >
                      <TargetIcon target={t} />
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 5 — Page
// ═════════════════════════════════════════════════════════════════════════════

const MonitorsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [monitors, setMonitors] = useState<MonitorView[]>(() =>
    toMonitorViews(DATADOG_MONITORS),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<Set<MonitorStatus>>(new Set());
  const [typeFilter, setTypeFilter] = useState<Set<MonitorType>>(new Set());
  const [timeRange, setTimeRange] = useState('24h');

  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) !== 'collapsed';
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(
        SIDEBAR_STORAGE_KEY,
        sidebarOpen ? 'expanded' : 'collapsed',
      );
    } catch {}
  }, [sidebarOpen]);

  const [openId, setOpenId] = useState<string | null>(searchParams.get('id'));
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (openId) next.set('id', openId);
    else next.delete('id');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId]);

  // Simulated fetch — replace with GET /api/v1/monitors
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // TODO: GET /api/v1/monitors
        // const res = await fetch(`${API_BASE}/api/v1/monitors`);
        // if (!res.ok) throw new Error(`HTTP ${res.status}`);
        // const json: DatadogMonitor[] = await res.json();
        // if (cancelled) return;
        // setMonitors(toMonitorViews(json));
        await new Promise((r) => setTimeout(r, 250));
        if (cancelled) return;
        setError(null);
      } catch (err) {
        if (!cancelled)
          setError(
            err instanceof Error ? err.message : 'Failed to load monitors',
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Derive state history from state.groups for now.
  // TODO: GET /api/v1/monitors/{id}/events
  const events = useMemo<Record<string, MonitorEvent[]>>(() => {
    const out: Record<string, MonitorEvent[]> = {};
    for (const m of DATADOG_MONITORS) {
      const groups = m.state?.groups ?? {};
      out[String(m.id)] = Object.entries(groups)
        .filter(
          ([, g]) =>
            g.last_triggered_ts || g.last_resolved_ts || g.last_nodata_ts,
        )
        .map(([groupName, g], idx) => {
          const ts =
            g.last_triggered_ts ?? g.last_resolved_ts ?? g.last_nodata_ts ?? 0;
          const status = mapOverallState(g.status as DatadogMonitorOverallState);
          return {
            id: `${m.id}-${idx}`,
            monitorId: String(m.id),
            at: new Date(ts * 1000).toISOString(),
            status,
            message: groupName,
          };
        })
        .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    }
    return out;
  }, []);

  // Precompute a synthetic series per monitor id.
  const seriesById = useMemo<Record<string, MonitorSeries>>(() => {
    const out: Record<string, MonitorSeries> = {};
    for (const m of DATADOG_MONITORS) out[String(m.id)] = synthesizeSeries(m);
    return out;
  }, []);

  // Filtering
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return monitors.filter((m) => {
      if (
        q &&
        !(m.name.toLowerCase().includes(q) || m.query.toLowerCase().includes(q))
      )
        return false;
      if (statusFilter.size && !statusFilter.has(m.status)) return false;
      if (typeFilter.size && !typeFilter.has(m.type)) return false;
      return true;
    });
  }, [monitors, search, statusFilter, typeFilter]);

  const statusCounts = useMemo(() => {
    const out: Record<MonitorStatus, number> = {
      OK: 0,
      Warn: 0,
      Alert: 0,
      'No Data': 0,
      neutral: 0,
    };
    monitors.forEach((m) => {
      out[m.status] = (out[m.status] ?? 0) + 1;
    });
    return out;
  }, [monitors]);

  const toggleStatusFilter = (s: MonitorStatus) => {
    setStatusFilter((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  };

  const toggleTypeFilter = (t: MonitorType) => {
    setTypeFilter((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };

  const handleToggleMute = (id: string) => {
    const target = monitors.find((m) => m.id === id);
    setMonitors((prev) =>
      prev.map((m) => (m.id === id ? { ...m, isMuted: !m.isMuted } : m)),
    );
    if (target?.isMuted) {
      // TODO: POST /api/v1/monitors/{id}/unmute
    } else {
      // TODO: POST /api/v1/monitors/{id}/mute
    }
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this monitor?')) return;
    setMonitors((prev) => prev.filter((m) => m.id !== id));
    if (openId === id) setOpenId(null);
    // TODO: DELETE /api/v1/monitors/{id}
  };

  const handleSave = (draft: Partial<MonitorView>) => {
    if (creating) {
      const now = new Date().toISOString();
      const created: MonitorView = {
        id: `mon-${Math.random().toString(36).slice(2, 8)}`,
        name: draft.name ?? 'Untitled monitor',
        type: draft.type ?? 'metric',
        datadogType: draft.type === 'log' ? 'log alert' : 'query alert',
        query: draft.query ?? '',
        metric:
          draft.type === 'metric'
            ? (draft.query ?? '').split(':')[1]?.split('{')[0]
            : undefined,
        logSource: draft.type === 'log' ? 'logs' : undefined,
        aggregation: draft.aggregation,
        groupBy: draft.groupBy,
        comparator: draft.comparator ?? 'above',
        threshold: draft.threshold ?? 0,
        warnThreshold: draft.warnThreshold,
        evaluationWindow: draft.evaluationWindow ?? '5m',
        message: draft.message ?? '',
        targets: draft.targets ?? [],
        createdAt: now,
        updatedAt: now,
        status: 'OK',
        isMuted: false,
      };
      setMonitors((prev) => [created, ...prev]);
      setCreating(false);
      setOpenId(created.id);
      // TODO: POST /api/v1/monitors
    } else if (openId) {
      setMonitors((prev) =>
        prev.map((m) =>
          m.id === openId
            ? { ...m, ...draft, updatedAt: new Date().toISOString() }
            : m,
        ),
      );
      // TODO: PUT /api/v1/monitors/{id}
    }
  };

  const openMonitor = openId
    ? monitors.find((m) => m.id === openId) ?? null
    : null;

  const datadogForOpen = openMonitor
    ? DATADOG_MONITORS.find((d) => String(d.id) === openMonitor.id)
    : undefined;

  const detailVisible = creating || !!openMonitor;

  return (
    <div className="flex h-screen flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-20 shrink-0 border-b bg-background/95 backdrop-blur">
        <div className="flex h-14 items-center gap-2 px-3 sm:gap-3 sm:px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
            onClick={() => setSidebarOpen((v) => !v)}
          >
            <PanelLeft className="h-4 w-4" />
          </Button>

          <Bell className="h-4 w-4 text-indigo-500 shrink-0" />
          <h1 className="text-sm font-semibold shrink-0">Monitors</h1>
          <span className="text-muted-foreground hidden md:inline shrink-0">
            /
          </span>
          <span className="text-sm text-muted-foreground truncate min-w-0">
            {filtered.length} of {monitors.length} shown
            {statusCounts.Alert > 0 && (
              <span className="ml-2 text-red-600 font-medium">
                · {statusCounts.Alert} alerting
              </span>
            )}
          </span>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2 shrink-0">
            <TimeRangePicker value={timeRange} onChange={setTimeRange} />
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                setCreating(true);
                setOpenId(null);
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">New monitor</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMonitors((prev) => [...prev])}
              disabled={loading}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
              />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`hidden md:flex h-full min-h-0 shrink-0 flex-col border-r bg-muted/30 transition-all duration-200 ${
            sidebarOpen ? 'w-64 sm:w-72' : 'w-11'
          }`}
        >
          {sidebarOpen ? (
            <>
              <div className="flex shrink-0 items-center justify-between border-b px-3 py-2">
                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Filters
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarOpen(false)}
                  className="h-7 w-7"
                >
                  <PanelLeft className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-3 space-y-4">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search monitors…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8"
                  />
                </div>

                <div>
                  <p className="mb-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                    Status
                  </p>
                  <div className="space-y-0.5">
                    {STATUS_FILTERS.map((s) => {
                      const on = statusFilter.has(s);
                      const count = statusCounts[s] ?? 0;
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => toggleStatusFilter(s)}
                          className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-xs transition-colors ${
                            on
                              ? 'bg-accent text-accent-foreground'
                              : 'text-muted-foreground hover:bg-accent/50'
                          }`}
                        >
                          <span
                            className={`h-2 w-2 shrink-0 rounded-full ${statusBg(s)}`}
                          />
                          <span className="flex-1">{statusLabel(s)}</span>
                          <span className="text-[10px] tabular-nums text-muted-foreground">
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                    Type
                  </p>
                  <div className="space-y-0.5">
                    {(['metric', 'log', 'other'] as MonitorType[]).map((t) => {
                      const on = typeFilter.has(t);
                      const count = monitors.filter((m) => m.type === t).length;
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => toggleTypeFilter(t)}
                          className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-xs transition-colors ${
                            on
                              ? 'bg-accent text-accent-foreground'
                              : 'text-muted-foreground hover:bg-accent/50'
                          }`}
                        >
                          {typeIcon(t)}
                          <span className="flex-1 capitalize">{t}</span>
                          <span className="text-[10px] tabular-nums text-muted-foreground">
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center py-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(true)}
                className="h-8 w-8"
              >
                <PanelLeft className="h-4 w-4" />
              </Button>
            </div>
          )}
        </aside>

        {/* List (full width) + Sheet */}
        <div className="flex flex-1 min-w-0">
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center justify-between border-b px-4 py-2">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>
                  {filtered.length} monitor{filtered.length === 1 ? '' : 's'}
                </span>
                {(statusFilter.size > 0 || typeFilter.size > 0 || search) && (
                  <button
                    className="text-indigo-600 hover:underline"
                    onClick={() => {
                      setStatusFilter(new Set());
                      setTypeFilter(new Set());
                      setSearch('');
                    }}
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </div>

            {error && (
              <Alert variant="destructive" className="m-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">{error}</AlertDescription>
              </Alert>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto">
              {loading && monitors.length === 0 ? (
                <div className="space-y-2 p-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-14 animate-pulse rounded bg-muted" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
                  <Bell className="h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    {monitors.length === 0
                      ? 'No monitors yet. Create one to start getting notified.'
                      : 'No monitors match the current filters.'}
                  </p>
                  {monitors.length === 0 && (
                    <Button
                      onClick={() => {
                        setCreating(true);
                        setOpenId(null);
                      }}
                    >
                      <Plus className="mr-1.5 h-4 w-4" /> New monitor
                    </Button>
                  )}
                </div>
              ) : (
                filtered.map((m) => (
                  <MonitorRow
                    key={m.id}
                    monitor={m}
                    series={seriesById[m.id] ?? { points: [], threshold: 0 }}
                    onToggleMute={handleToggleMute}
                    onOpen={(id) => {
                      setOpenId(id);
                      setCreating(false);
                    }}
                    onDelete={handleDelete}
                  />
                ))
              )}
            </div>
          </div>

          {/* Detail / form as a right-side sheet */}
          <Sheet
            open={detailVisible}
            onOpenChange={(open) => {
              if (!open) {
                setOpenId(null);
                setCreating(false);
              }
            }}
          >
            <SheetContent
              side="right"
              className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl lg:max-w-3xl"
            >
              {/* Radix requires a title for accessibility; hide it visually. */}
              <SheetHeader className="sr-only">
                <SheetTitle>
                  {creating ? 'New monitor' : openMonitor?.name ?? 'Monitor'}
                </SheetTitle>
                <SheetDescription>
                  {creating
                    ? 'Define a query, a threshold, and who to notify.'
                    : 'Monitor detail and state history.'}
                </SheetDescription>
              </SheetHeader>

              {creating ? (
                <MonitorForm
                  onCancel={() => setCreating(false)}
                  onSave={handleSave}
                />
              ) : openMonitor && datadogForOpen ? (
                <MonitorDetail
                  monitor={openMonitor}
                  datadogMonitor={datadogForOpen}
                  events={events[openMonitor.id] ?? []}
                  onClose={() => setOpenId(null)}
                  onToggleMute={handleToggleMute}
                />
              ) : null}
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
  );
};

export default MonitorsPage;