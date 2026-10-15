import type { DatabaseSync } from 'node:sqlite';
import type { Clock } from './monitor.model';
import { legacyAlert, legacyStorageId, type HistoricalAlertEvent } from './legacy-alert';
import { DEFAULT_ALERT_RETENTION_DAYS } from './monitoring.config';

export interface AlertPageQuery { monitor_id?: string; limit?: number; offset?: number; }
export interface HistoryOptions { clock?: Clock; retentionDays?: number; }
export const MAX_ALERT_PAGE_SIZE = 100;

export class MonitorAlertHistory {
  private readonly clock: Clock;
  private readonly days: number;
  constructor(private readonly db: DatabaseSync, private readonly transaction: <T>(operation: () => T) => T, options: HistoryOptions) {
    this.clock = options.clock ?? { now: () => new Date() };
    this.days = options.retentionDays ?? DEFAULT_ALERT_RETENTION_DAYS;
    if (!Number.isSafeInteger(this.days) || this.days <= 0 || !Number.isFinite(Date.parse(this.cutoff())))
      throw new Error('Alert retention must be a positive, representable number of days.');
    const columns = this.db.prepare('PRAGMA table_info(monitor_alert_events)').all();
    if (!columns.some(column => column.name === 'legacy_event_id')) this.db.exec('ALTER TABLE monitor_alert_events ADD COLUMN legacy_event_id TEXT');
    this.db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS monitor_alert_legacy_id ON monitor_alert_events(org,monitor_id,legacy_event_id)
      WHERE legacy_event_id IS NOT NULL;`);
  }

  load(org: string, id: string): Record<string, any> | undefined {
    const record = this.raw(org, id);
    if (!Array.isArray(record?.events)) return record;
    return this.transaction(() => {
      const current = this.raw(org, id);
      if (!current) return undefined;
      const migrated = this.stripEmbedded(org, current);
      this.db.prepare('UPDATE monitors SET body = ? WHERE org = ? AND id = ?').run(JSON.stringify(migrated), org, id);
      return migrated;
    });
  }

  stripEmbedded(org: string, record: Record<string, any>): Record<string, any> {
    if (!Array.isArray(record.events)) return record;
    for (const original of record.events) {
      const event = legacyAlert(record.id, original);
      if (event.fired_at >= this.cutoff()) this.insertLegacy(org, event);
    }
    const { events: _events, ...rest } = record;
    return { ...rest, legacyEventsMigrated: true };
  }

  list(org: string, query: AlertPageQuery = {}) {
    const limit = query.limit ?? 50, offset = query.offset ?? 0;
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_ALERT_PAGE_SIZE || !Number.isSafeInteger(offset) || offset < 0)
      throw new Error('Invalid alert pagination.');
    const params = [org, this.cutoff(), ...(query.monitor_id ? [query.monitor_id] : []), limit + 1, offset];
    const rows = this.db.prepare(`SELECT body FROM monitor_alert_events WHERE org = ? AND fired_at >= ?
      ${query.monitor_id ? 'AND monitor_id = ?' : ''} ORDER BY fired_at DESC, id DESC LIMIT ? OFFSET ?`).all(...params);
    return { items: rows.slice(0, limit).map(row => JSON.parse(String(row.body)) as HistoricalAlertEvent),
      limit, offset, next_offset: rows.length > limit ? offset + limit : null };
  }

  legacyEvents(org: string, id: string): Record<string, unknown>[] {
    return this.db.prepare(`SELECT body FROM monitor_alert_events WHERE org = ? AND monitor_id = ?
      AND legacy_event_id IS NOT NULL AND fired_at >= ? ORDER BY fired_at DESC, id DESC LIMIT ?`)
      .all(org, id, this.cutoff(), MAX_ALERT_PAGE_SIZE).map(row => JSON.parse(String(row.body)).original);
  }

  prune(): number {
    return Number(this.db.prepare('DELETE FROM monitor_alert_events WHERE fired_at < ?').run(this.cutoff()).changes);
  }

  private cutoff(): string {
    return new Date(this.clock.now().getTime() - this.days * 86400000).toISOString();
  }

  private raw(org: string, id: string): Record<string, any> | undefined {
    const row = this.db.prepare('SELECT body FROM monitors WHERE org = ? AND id = ?').get(org, id);
    return row ? JSON.parse(String(row.body)) : undefined;
  }

  private insertLegacy(org: string, event: ReturnType<typeof legacyAlert>): void {
    const row = this.db.prepare('SELECT min(transition_revision) AS minimum FROM monitor_alert_events WHERE org = ? AND monitor_id = ?')
      .get(org, event.monitor_id);
    const revision = Math.min(0, Number(row?.minimum ?? 0)) - 1;
    this.db.prepare(`INSERT OR IGNORE INTO monitor_alert_events
      (org,id,monitor_id,transition_revision,fired_at,body,legacy_event_id) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(org, legacyStorageId(org, event.monitor_id, event.id), event.monitor_id, revision, event.fired_at, JSON.stringify(event), event.id);
  }
}
