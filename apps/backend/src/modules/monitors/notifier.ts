import type { AlertEvent } from './monitor.model';

export interface Notifier {
  notify(event: AlertEvent): Promise<void>;
}
