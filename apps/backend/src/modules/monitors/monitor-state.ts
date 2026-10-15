import { NoDataError, type SignalMeasurement } from './signal-adapter';
import { COMPARATORS, type AlertEvent, type Comparator, type Monitor, type MonitorRuntime } from './monitor.model';

export function crossesThreshold(value: number, threshold: number, comparator: Comparator): boolean {
  if (!Number.isFinite(value) || !Number.isFinite(threshold)) throw new Error('Threshold comparison requires finite numbers.');
  if (comparator === 'GT') return value > threshold;
  if (comparator === 'GTE') return value >= threshold;
  if (comparator === 'LT') return value < threshold;
  if (comparator === 'LTE') return value <= threshold;
  throw new Error('Invalid threshold comparator.');
}

export function validateEvaluation(monitor: Monitor): void {
  if (!COMPARATORS.includes(monitor.comparator) || !Number.isFinite(monitor.threshold)) throw new Error('Invalid monitor threshold.');
  if (!Number.isSafeInteger(monitor.window_seconds) || monitor.window_seconds <= 0) throw new Error('Invalid monitor window.');
  if (!Number.isFinite(new Date(-monitor.window_seconds * 1000).getTime())) throw new Error('Monitor window exceeds the supported date range.');
}

export function successfulEvaluation(monitor: Monitor, result: SignalMeasurement, at: string): MonitorRuntime {
  return { revision: (monitor.runtime?.revision ?? 0) + 1,
    state: crossesThreshold(result.value, monitor.threshold, monitor.comparator) ? 'FIRING' : 'OK',
    operational_status: 'OK', value: result.value, unit: result.unit, estimated: result.estimated,
    warnings: result.warnings, checked_at: at, error: null };
}

export function failedEvaluation(monitor: Monitor, error: unknown, at: string): MonitorRuntime {
  const noData = error instanceof NoDataError;
  return { revision: (monitor.runtime?.revision ?? 0) + 1, state: monitor.runtime?.state ?? 'OK',
    operational_status: noData ? 'NO_DATA' : 'ERROR', value: null, unit: monitor.runtime?.unit ?? '',
    estimated: noData ? error.estimated : monitor.runtime?.estimated ?? false,
    warnings: noData ? error.warnings : [], checked_at: at,
    error: noData ? error.message : 'Signal evaluation failed.' };
}

export function alertTransition(monitor: Monitor, runtime: MonitorRuntime, id: () => string): AlertEvent | undefined {
  if (runtime.operational_status !== 'OK' || runtime.state === (monitor.runtime?.state ?? 'OK')) return undefined;
  return { id: id(), monitor_id: monitor.id, monitor_name: monitor.name, signal_type: monitor.signal_type,
    state: runtime.state === 'FIRING' ? 'FIRING' : 'RECOVERED', value: runtime.value!,
    threshold: monitor.threshold, comparator: monitor.comparator, window_seconds: monitor.window_seconds,
    unit: runtime.unit, estimated: runtime.estimated, fired_at: runtime.checked_at, transition_revision: runtime.revision };
}

export function configurationRuntime(current: Monitor, next: Monitor): MonitorRuntime | undefined {
  if (!current.runtime) return undefined;
  const fields = ['signal_type', 'query', 'aggregation', 'field', 'metric_name', 'window_seconds',
    'threshold', 'comparator', 'team_id', 'service', 'env'] as const;
  const changed = fields.some(key => current[key] !== next[key]) || !current.enabled && next.enabled;
  return changed ? { ...current.runtime, revision: current.runtime.revision + 1, value: null, unit: '', estimated: false,
    operational_status: 'NO_DATA', warnings: [], error: 'Configuration changed; awaiting evaluation.' } : current.runtime;
}
