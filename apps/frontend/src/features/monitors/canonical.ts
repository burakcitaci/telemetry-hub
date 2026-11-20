import type { MonitorView } from './model';

const signals = ['LOG', 'METRIC', 'TRACE'] as const;
const aggregations = ['COUNT', 'AVG', 'SUM', 'MAX', 'MIN', 'P95', 'P99'] as const;
const comparators = ['GT', 'GTE', 'LT', 'LTE'] as const;
export { signals, aggregations, comparators };

export interface CanonicalRule {
  name: string;
  signal_type: typeof signals[number];
  query: string;
  aggregation: typeof aggregations[number];
  comparator: typeof comparators[number];
  threshold: number;
  window_seconds: number;
  enabled: boolean;
  metric_name?: string | null;
  field?: string | null;
  team_id?: string | null;
  service?: string | null;
  env?: string | null;
  muted_until?: string | null;
  cooldown_seconds?: number;
}

export interface MonitorRuntime {
  state: 'OK' | 'FIRING';
  operational_status: 'OK' | 'NO_DATA' | 'ERROR';
  value: number | null;
  unit: string;
  estimated: boolean;
  checked_at: string;
  warnings?: { code: string; key: string }[];
  error: string | null;
}

export interface CanonicalMonitor extends CanonicalRule {
  schemaVersion: 2;
  configurationVersion?: number;
  id: string;
  created_at: string;
  runtime?: MonitorRuntime;
}

export function canonicalMonitor(monitor: MonitorView | null): CanonicalMonitor | null {
  return monitor?.schemaVersion === 2 ? monitor as unknown as CanonicalMonitor : null;
}

export function readRule(form: FormData, signal_type: CanonicalRule['signal_type'], aggregation: CanonicalRule['aggregation']): CanonicalRule {
  const value = (key: string) => String(form.get(key) ?? '').trim();
  return {
    name: value('name'), signal_type, query: value('query'), aggregation,
    comparator: value('comparator') as CanonicalRule['comparator'],
    threshold: Number(value('threshold')), window_seconds: Number(value('window_seconds')),
    enabled: form.has('enabled'), cooldown_seconds: Number(value('cooldown_seconds')),
    metric_name: signal_type === 'METRIC' ? value('metric_name') || null : null,
    field: aggregation === 'COUNT' ? null : signal_type === 'METRIC' ? 'value' : value('field'),
    team_id: value('team_id') || null, service: value('service') || null, env: value('env') || null,
  };
}
