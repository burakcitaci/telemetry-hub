import { createHash } from 'node:crypto';
import type { AlertEvent } from './monitor.model';

export interface LegacyAlertEvent {
  id: string; monitor_id: string; legacy: true; legacy_event_id: string;
  state: string; value: number | null; fired_at: string;
  threshold: null; signal_type: null; monitor_name: null; comparator: null;
  window_seconds: null; unit: null; estimated: null;
  original: Record<string, unknown>;
}
export type HistoricalAlertEvent = AlertEvent | LegacyAlertEvent;

export function legacyAlert(monitorId: string, original: Record<string, unknown>): LegacyAlertEvent {
  if (typeof original.id !== 'string' || !original.id || typeof original.at !== 'string' || !Number.isFinite(Date.parse(original.at)))
    throw new Error('Legacy alert has no stable ID or valid timestamp; migration was rolled back.');
  return { id: original.id, monitor_id: monitorId, legacy: true, legacy_event_id: original.id,
    state: String(original.status ?? 'Unknown'), value: typeof original.value === 'number' && Number.isFinite(original.value) ? original.value : null,
    fired_at: new Date(original.at).toISOString(), threshold: null, signal_type: null, monitor_name: null, comparator: null,
    window_seconds: null, unit: null, estimated: null, original };
}

export function legacyStorageId(org: string, monitorId: string, eventId: string): string {
  return `legacy:${createHash('sha256').update(JSON.stringify([org, monitorId, eventId])).digest('hex')}`;
}
