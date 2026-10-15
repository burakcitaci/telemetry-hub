import type { AlertEvent } from './monitor.model';
import type { Notifier } from './notifier';

export type NotificationWriter = (line: string) => void | Promise<void>;

function stdout(line: string): Promise<void> {
  const output = process.stdout;
  return new Promise((resolve, reject) => {
    const onError = (error: Error) => reject(error);
    output.once('error', onError);
    try {
      output.write(line, error => {
        if (error) {
          queueMicrotask(() => output.removeListener('error', onError));
          reject(error); return;
        }
        output.removeListener('error', onError);
        resolve();
      });
    } catch (error) {
      output.removeListener('error', onError);
      reject(error);
    }
  });
}

export class DummyNotifier implements Notifier {
  constructor(private readonly write: NotificationWriter = stdout) {}

  async notify(event: AlertEvent): Promise<void> {
    const { notification: _delivery, ...snapshot } = event;
    await this.write(`${JSON.stringify({ event: 'monitor.alert',
      status: event.state === 'FIRING' ? 'firing' : 'resolved', ...snapshot })}\n`);
  }
}
