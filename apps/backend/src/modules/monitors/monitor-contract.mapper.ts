import type { Monitor } from './monitor.model';
import type { CreateMonitorDto } from './dto/unified-monitor.dto';

const FIELDS = ['name', 'signal_type', 'query', 'aggregation', 'comparator', 'threshold', 'window_seconds',
  'enabled', 'metric_name', 'field', 'team_id', 'service', 'env', 'muted_until', 'cooldown_seconds'] as const;

export function monitorConfiguration(record: Record<string, any>): CreateMonitorDto {
  return Object.fromEntries(FIELDS.filter(key => record[key] !== undefined).map(key => [key, record[key]])) as unknown as CreateMonitorDto;
}

export function monitorView(record: Record<string, any>) {
  if (record.schemaVersion !== 2) return record;
  const monitor = record as Monitor, runtime = monitor.runtime;
  const status = !runtime || runtime.operational_status === 'ERROR' ? 'Unknown'
    : runtime.operational_status === 'NO_DATA' ? 'No Data' : runtime.state === 'FIRING' ? 'Alert' : 'OK';
  return { ...monitor, type: monitor.signal_type.toLowerCase(), teamId: monitor.team_id, status,
    value: runtime?.value ?? null, unit: runtime?.unit ?? '', estimated: runtime?.estimated ?? false,
    isMuted: !!monitor.muted_until && Date.parse(monitor.muted_until) > Date.now(),
    createdAt: monitor.created_at, evaluationWindow: `${monitor.window_seconds}s`, lastEvaluatedAt: runtime?.checked_at ?? null,
    evaluationEnabled: monitor.enabled, evaluationError: runtime?.error ?? null, targets: [], history: [], groups: [], events: [] };
}

export function monitorStatus(monitor: Monitor) {
  return { id: monitor.id, signal_type: monitor.signal_type, enabled: monitor.enabled, threshold: monitor.threshold,
    comparator: monitor.comparator, window_seconds: monitor.window_seconds, state: monitor.runtime?.state ?? null,
    operational_status: monitor.runtime?.operational_status ?? 'NOT_EVALUATED', value: monitor.runtime?.value ?? null,
    unit: monitor.runtime?.unit ?? '', estimated: monitor.runtime?.estimated ?? false,
    warnings: monitor.runtime?.warnings ?? [], checked_at: monitor.runtime?.checked_at ?? null,
    error: monitor.runtime?.error ?? null, notifications: monitor.runtime?.notifications ?? {} };
}
