import type { QueryWarning } from './query-parser';
import type { SignalQuery } from './signal-adapter';

export const COMPARATORS = ['GT', 'LT', 'GTE', 'LTE'] as const;
export type Comparator = typeof COMPARATORS[number];
export type FiringState = 'OK' | 'FIRING';
export type DeliveryStatus = 'PENDING' | 'SENT' | 'FAILED' | 'SUPPRESSED';
export interface AlertDelivery {
  status: DeliveryStatus;
  reason?: 'MUTED' | 'COOLDOWN' | 'UNPAIRED_RECOVERY';
  attempted_at?: string;
  completed_at?: string;
}
export interface NotificationRuntime {
  last_firing_attempt_at?: string;
  last_firing_sent_at?: string;
  active_firing_event_id?: string;
  active_firing_status?: DeliveryStatus;
}

export interface MonitorRuntime {
  revision: number;
  state: FiringState;
  operational_status: 'OK' | 'NO_DATA' | 'ERROR';
  value: number | null;
  unit: string;
  estimated: boolean;
  warnings: QueryWarning[];
  checked_at: string;
  error: string | null;
  notifications?: NotificationRuntime;
}

export interface Monitor extends Omit<SignalQuery, 'scope'> {
  schemaVersion: 2;
  configurationVersion: number;
  id: string;
  name: string;
  window_seconds: number;
  threshold: number;
  comparator: Comparator;
  enabled: boolean;
  created_at: string;
  muted_until?: string;
  cooldown_seconds?: number;
  team_id?: string;
  service?: string;
  env?: string;
  runtime?: MonitorRuntime;
}

export interface AlertEvent {
  id: string;
  monitor_id: string;
  monitor_name: string;
  signal_type: Monitor['signal_type'];
  state: 'FIRING' | 'RECOVERED';
  value: number;
  threshold: number;
  comparator: Comparator;
  window_seconds: number;
  unit: string;
  estimated: boolean;
  fired_at: string;
  transition_revision: number;
  notification?: AlertDelivery;
}

export interface Clock { now(): Date; }
