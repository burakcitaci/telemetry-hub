import type { AlertEvent, Monitor, MonitorRuntime } from './monitor.model';

export interface MonitorRepository {
  find(org: string, id: string): Monitor | undefined;
  commitEvaluation(org: string, expected: Monitor, runtime: MonitorRuntime, event?: AlertEvent): boolean;
  completeNotification(org: string, id: string, status: 'SENT' | 'FAILED', at: string): boolean;
}
