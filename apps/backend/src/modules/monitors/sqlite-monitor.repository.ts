import type { DatabaseSync } from 'node:sqlite';
import type { AlertEvent, Monitor, MonitorRuntime } from './monitor.model';
import type { MonitorRepository } from './monitor.repository';
import { MonitorAlertHistory, type HistoryOptions } from './monitor-alert-history';
import { configurationRuntime } from './monitor-state';

export class SqliteMonitorRepository implements MonitorRepository {
  readonly history: MonitorAlertHistory;
  constructor(private readonly db: DatabaseSync, options: HistoryOptions = {}) {
    this.db.exec(`CREATE TABLE IF NOT EXISTS monitors (org TEXT, id TEXT, body TEXT NOT NULL, PRIMARY KEY(org,id));
      CREATE TABLE IF NOT EXISTS monitor_alert_events (
        org TEXT NOT NULL, id TEXT NOT NULL, monitor_id TEXT NOT NULL, transition_revision INTEGER NOT NULL,
        fired_at TEXT NOT NULL, body TEXT NOT NULL, PRIMARY KEY(org,id), UNIQUE(org,monitor_id,transition_revision));
      CREATE INDEX IF NOT EXISTS monitor_alert_events_time ON monitor_alert_events(fired_at);`);
    this.history = new MonitorAlertHistory(db, operation => this.transaction(operation), options);
  }

  find(org: string, id: string): Monitor | undefined {
    const monitor = this.history.load(org, id);
    return monitor?.schemaVersion === 2 ? monitor as Monitor : undefined;
  }

  records(org: string): Record<string, any>[] {
    return this.db.prepare('SELECT id FROM monitors WHERE org = ? ORDER BY id').all(org)
      .map(row => this.history.load(org, String(row.id))!);
  }

  saveRecord(org: string, record: Record<string, any>): void {
    this.transaction(() => {
      const body = this.history.stripEmbedded(org, record);
      this.db.prepare('INSERT INTO monitors VALUES (?, ?, ?) ON CONFLICT(org,id) DO UPDATE SET body = excluded.body')
        .run(org, body.id, JSON.stringify(body));
    });
  }

  replaceConfiguration(org: string, expected: Record<string, any>, next: Monitor): Monitor | undefined {
    return this.transaction(() => {
      const row = this.db.prepare('SELECT body FROM monitors WHERE org = ? AND id = ?').get(org, expected.id);
      const current = row ? JSON.parse(String(row.body)) : undefined;
      if (!current || current.configurationVersion !== expected.configurationVersion) return undefined;
      const saved = { ...next, ...(current.legacyEventsMigrated ? { legacyEventsMigrated: true } : {}),
        ...(current.schemaVersion === 2 ? { runtime: configurationRuntime(current, next) } : {}) };
      this.save(org, saved);
      return saved;
    });
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
    this.db.prepare('INSERT INTO monitor_alert_events (org,id,monitor_id,transition_revision,fired_at,body) VALUES (?, ?, ?, ?, ?, ?)')
      .run(org, event.id, event.monitor_id, event.transition_revision, event.fired_at, JSON.stringify(event));
  }
}
