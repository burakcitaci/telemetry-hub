import type { AlertEvent, Monitor } from './monitor.model';

export type EvaluationOutcome = 'OK' | 'NO_DATA' | 'ERROR' | 'STALE' | 'CANCELLED';
export interface MonitorObserver {
  run<T>(org: string, monitor: Monitor, action: () => Promise<T>): Promise<T>;
  evaluated(monitor: Monitor, outcome: EvaluationOutcome): void;
  transition(event: AlertEvent): void;
  notification(event: AlertEvent, status: 'SENT' | 'FAILED'): void;
}

export const quietMonitorObserver: MonitorObserver = {
  run: (_org, _monitor, action) => action(), evaluated() {}, transition() {}, notification() {},
};
