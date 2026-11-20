import type { AlertEvent } from './monitor.model';
import type { Notifier } from './notifier';

export class WebhookNotifier implements Notifier {
  constructor(private readonly url: string, private readonly request = globalThis.fetch) {}

  notify(event: AlertEvent): Promise<void> { return this.publish(event); }

  async publish<T extends { id: string }>(event: T): Promise<void> {
    const response = await this.request(this.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': event.id },
      body: JSON.stringify(event),
      redirect: 'error',
      signal: AbortSignal.timeout(5_000),
    });
    await response.body?.cancel().catch(() => undefined);
    if (!response.ok) throw new Error('Monitor webhook delivery failed.');
  }
}
