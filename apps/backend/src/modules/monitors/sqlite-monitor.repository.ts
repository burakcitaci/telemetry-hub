import type { DatabaseSync } from 'node:sqlite';
import type { AlertEvent, Monitor, MonitorRuntime } from './monitor.model';
import type { MonitorRepository } from './monitor.repository';

export class SqliteMonitorRepository implements MonitorRepository {
  constructor(private readonly db: DatabaseSync) {
    this.db.exec(`CREATE TABLE IF NOT EXISTS monitors (org TEXT, id TEXT, body TEXT NOT NULL, PRIMARY KEY(org,id));
      CREATE TABLE IF NOT EXISTS monitor_alert_events (
        org TEXT NOT NULL, id TEXT NOT NULL, monitor_id TEXT NOT NULL, transition_revision INTEGER NOT NULL,
        fired_at TEXT NOT NULL, body TEXT NOT NULL, PRIMARY KEY(org,id), UNIQUE(org,monitor_id,transition_revision));
      CREATE INDEX IF NOT EXISTS monitor_alert_events_time ON monitor_alert_events(fired_at);`);
  }

  find(org: string, id: string): Monitor | undefined {
    const row = this.db.prepare('SELECT body FROM monitors WHERE org = ? AND id = ?').get(org, id);
    const monitor = row ? JSON.parse(String(row.body)) : undefined;
    return monitor?.schemaVersion === 2 ? monitor : undefined;
  }

  save(org: string, monitor: Monitor): void {
    this.db.prepare('INSERT INTO monitors VALUES (?, ?, ?) ON CONFLICT(org,id) DO UPDATE SET body = excluded.body')
      .run(org, monitor.id, JSON.stringify(monitor));
  }

  events(org: string, id: string): AlertEvent[] {
    return this.db.prepare('SELECT body FROM monitor_alert_events WHERE org = ? AND monitor_id = ? ORDER BY transition_revision')
      .all(org, id).map(row => JSON.parse(String(row.body)) as AlertEvent);
  }

  commitEvaluation(org: string, expected: Monitor, runtime: MonitorRuntime, event?: AlertEvent): boolean {
    return this.transaction(() => {
      const current = this.find(org, expected.id);
      if (!this.canCommit(current, expected)) return false;
      this.save(org, { ...current!, runtime });
      if (event) this.insertEvent(org, event);
      return true;
    });
  }

  completeNotification(org: string, id: string, status: 'SENT' | 'FAILED', at: string): boolean {
    return this.transaction(() => {
      const row = this.db.prepare('SELECT body FROM monitor_alert_events WHERE org = ? AND id = ?').get(org, id);
      const event = row ? JSON.parse(String(row.body)) as AlertEvent : undefined;
      if (event?.notification?.status !== 'PENDING') return false;
      const receipt = { ...event, notification: { ...event.notification, status, completed_at: at } };
      this.db.prepare('UPDATE monitor_alert_events SET body = ? WHERE org = ? AND id = ?').run(JSON.stringify(receipt), org, id);
      this.recordFiringReceipt(org, receipt);
      return true;
    });
  }

  private recordFiringReceipt(org: string, event: AlertEvent): void {
    const current = this.find(org, event.monitor_id);
    if (event.state !== 'FIRING' || !current?.runtime || current.runtime.notifications?.active_firing_event_id !== event.id) return;
    const notifications = { ...current.runtime.notifications, active_firing_status: event.notification!.status,
      ...(event.notification!.status === 'SENT' ? { last_firing_sent_at: event.notification!.completed_at } : {}) };
    // Receipt changes must invalidate evaluations that read the previous delivery state.
    this.save(org, { ...current, runtime: { ...current.runtime, notifications, revision: current.runtime.revision + 1 } });
  }

  private transaction<T>(operation: () => T): T {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const result = operation();
      this.db.exec('COMMIT');
      return result;
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }

  private canCommit(current: Monitor | undefined, expected: Monitor): boolean {
    return !!current?.enabled && current.created_at === expected.created_at && current.configurationVersion === expected.configurationVersion
      && (current.runtime?.revision ?? 0) === (expected.runtime?.revision ?? 0);
  }

  private insertEvent(org: string, event: AlertEvent): void {
    this.db.prepare('INSERT INTO monitor_alert_events VALUES (?, ?, ?, ?, ?, ?)')
      .run(org, event.id, event.monitor_id, event.transition_revision, event.fired_at, JSON.stringify(event));
  }
}
