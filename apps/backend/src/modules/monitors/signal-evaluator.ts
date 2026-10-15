import { randomUUID } from 'node:crypto';
import type { SignalAdapter, SignalQuery, SignalType } from './signal-adapter';
import type { AlertEvent, Clock, Monitor } from './monitor.model';
import type { MonitorRepository } from './monitor.repository';
import type { Notifier } from './notifier';
import { alertTransition, failedEvaluation, successfulEvaluation, validateEvaluation } from './monitor-state';
import { planNotification, validateNotificationPolicy } from './notification-policy';

export const SIGNAL_EVALUATOR = 'MONITOR_SIGNAL_EVALUATOR';
export interface AdapterRegistry { get(signal: SignalType): SignalAdapter; }

export class SignalEvaluator {
  private readonly pending = new Map<string, Promise<Monitor | undefined>>();
  private stopped = false;

  constructor(private readonly repository: MonitorRepository, private readonly adapters: AdapterRegistry,
    private readonly notifier: Notifier, private readonly clock: Clock, private readonly id: () => string = randomUUID,
    private readonly notificationFailure: (event: AlertEvent) => void = event =>
      console.error({ event: 'monitor.notification_failed', monitor_id: event.monitor_id, event_id: event.id })) {}

  evaluate(org: string, id: string): Promise<Monitor | undefined> {
    if (this.stopped) return Promise.resolve(undefined);
    const key = JSON.stringify([org, id]);
    const existing = this.pending.get(key);
    if (existing) return existing;
    const task = this.evaluateOnce(org, id).finally(() => this.pending.delete(key));
    this.pending.set(key, task);
    return task;
  }

  async stop(): Promise<void> {
    this.stopped = true;
    await Promise.allSettled([...this.pending.values()]);
  }

  private async evaluateOnce(org: string, id: string): Promise<Monitor | undefined> {
    const monitor = this.repository.find(org, id);
    if (!monitor?.enabled) return monitor;
    const runtime = await this.measure(org, monitor);
    if (this.stopped) return this.repository.find(org, id);
    const planned = planNotification(monitor, runtime, alertTransition(monitor, runtime, this.id), this.clock.now().toISOString());
    if (!this.repository.commitEvaluation(org, monitor, planned.runtime, planned.event)) return this.repository.find(org, id);
    if (planned.event?.notification?.status === 'PENDING') await this.notify(org, planned.event);
    return this.repository.find(org, id);
  }

  private async measure(org: string, monitor: Monitor) {
    const until = new Date(this.clock.now().getTime());
    const at = until.toISOString();
    try {
      validateEvaluation(monitor);
      validateNotificationPolicy(monitor);
      const since = new Date(until.getTime() - monitor.window_seconds * 1000);
      const query: SignalQuery = { ...monitor, scope: { tenantSlug: org, role: 'admin', teamFilter: monitor.team_id,
        serviceFilter: monitor.service, envFilter: monitor.env } };
      const result = await this.adapters.get(monitor.signal_type).measure(query, since, until);
      return successfulEvaluation(monitor, result, at);
    } catch (error) { return failedEvaluation(monitor, error, at); }
  }

  private async notify(org: string, event: AlertEvent): Promise<void> {
    let status: 'SENT' | 'FAILED' = 'SENT';
    try { await this.notifier.notify(event); }
    catch { status = 'FAILED'; }
    this.repository.completeNotification(org, event.id, status, this.clock.now().toISOString());
    if (status === 'FAILED') this.notificationFailure(event);
  }
}
