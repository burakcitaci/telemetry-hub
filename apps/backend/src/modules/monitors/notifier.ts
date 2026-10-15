import type { AlertEvent } from './monitor.model';

export const MONITOR_NOTIFIER = 'MONITOR_NOTIFIER';

export interface Notifier {
  notify(event: AlertEvent): Promise<void>;
}
