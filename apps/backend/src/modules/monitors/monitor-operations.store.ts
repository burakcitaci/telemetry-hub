import type { DatabaseSync } from 'node:sqlite';

export interface MaintenanceWindow {
  id: string;
  name: string;
  team_id?: string;
  service?: string;
  starts_at: string;
  ends_at: string;
  cancelled_at?: string;
}
export interface TestDelivery {
  id: string;
  destination: string;
  at: string;
  status: 'PENDING' | 'SENT' | 'FAILED';
}

export class MonitorOperationsStore {
  constructor(private readonly db: DatabaseSync) {
    db.exec(`CREATE TABLE IF NOT EXISTS monitor_team_routes (
      org TEXT NOT NULL, team TEXT NOT NULL, destination TEXT NOT NULL, PRIMARY KEY(org,team));
      CREATE TABLE IF NOT EXISTS monitor_maintenance (
        org TEXT NOT NULL, id TEXT NOT NULL, body TEXT NOT NULL, PRIMARY KEY(org,id));
      CREATE TABLE IF NOT EXISTS monitor_test_delivery (
        org TEXT NOT NULL, team TEXT NOT NULL, id TEXT NOT NULL, at TEXT NOT NULL, body TEXT NOT NULL,
        PRIMARY KEY(org,team,id));`);
  }

  destination(org: string, team: string): string | undefined {
    const row = this.db.prepare('SELECT destination FROM monitor_team_routes WHERE org = ? AND team = ?').get(org, team);
    return row?.destination as string | undefined;
  }

  setDestination(org: string, team: string, destination: string | null) {
    if (destination === null) {
      this.db.prepare('DELETE FROM monitor_team_routes WHERE org = ? AND team = ?').run(org, team);
    } else {
      this.db.prepare('INSERT INTO monitor_team_routes VALUES (?, ?, ?) ON CONFLICT(org,team) DO UPDATE SET destination=excluded.destination')
        .run(org, team, destination);
    }
  }

  windows(org: string): MaintenanceWindow[] {
    return this.db.prepare('SELECT body FROM monitor_maintenance WHERE org = ? ORDER BY json_extract(body, \'$.starts_at\') DESC')
      .all(org).map(row => JSON.parse(String(row.body)));
  }

  maintenanceFor(org: string, team?: string, service?: string, at = new Date().toISOString()) {
    return this.db.prepare(`SELECT 1 FROM monitor_maintenance WHERE org = ?
      AND json_extract(body, '$.cancelled_at') IS NULL
      AND json_extract(body, '$.starts_at') <= ? AND json_extract(body, '$.ends_at') > ?
      AND (json_extract(body, '$.team_id') IS NULL OR json_extract(body, '$.team_id') = ?)
      AND (json_extract(body, '$.service') IS NULL OR json_extract(body, '$.service') = ?) LIMIT 1`)
      .get(org, at, at, team ?? null, service ?? null) !== undefined;
  }

  saveWindow(org: string, window: MaintenanceWindow) {
    this.db.prepare('INSERT INTO monitor_maintenance VALUES (?, ?, ?)').run(org, window.id, JSON.stringify(window));
  }

  cancelWindow(org: string, id: string, now: string) {
    return this.db.prepare(`UPDATE monitor_maintenance SET body = json_set(body, '$.cancelled_at', ?)
      WHERE org = ? AND id = ? AND json_extract(body, '$.cancelled_at') IS NULL
      AND json_extract(body, '$.ends_at') > ?`).run(now, org, id, now).changes > 0;
  }

  removeTeamConfiguration(org: string, team: string, now: string) {
    this.setDestination(org, team, null);
    this.db.prepare('DELETE FROM monitor_test_delivery WHERE org = ? AND team = ?').run(org, team);
    this.db.prepare(`UPDATE monitor_maintenance SET body = json_set(body, '$.cancelled_at', ?)
      WHERE org = ? AND json_extract(body, '$.team_id') = ? AND json_extract(body, '$.cancelled_at') IS NULL
      AND json_extract(body, '$.ends_at') > ?`).run(now, org, team, now);
  }

  deliveries(org: string, team: string): TestDelivery[] {
    return this.db.prepare('SELECT body FROM monitor_test_delivery WHERE org = ? AND team = ? ORDER BY at DESC, id DESC LIMIT 20')
      .all(org, team).map(row => JSON.parse(String(row.body)));
  }

  saveDelivery(org: string, team: string, receipt: TestDelivery) {
    if (receipt.status !== 'PENDING') {
      this.db.prepare('UPDATE monitor_test_delivery SET body = ? WHERE org = ? AND team = ? AND id = ?')
        .run(JSON.stringify(receipt), org, team, receipt.id);
      return;
    }
    this.db.prepare('INSERT INTO monitor_test_delivery VALUES (?, ?, ?, ?, ?)')
      .run(org, team, receipt.id, receipt.at, JSON.stringify(receipt));
    this.db.prepare(`DELETE FROM monitor_test_delivery WHERE org = ? AND team = ?
      AND id NOT IN (SELECT id FROM monitor_test_delivery WHERE org = ? AND team = ? ORDER BY at DESC, id DESC LIMIT 20)`)
      .run(org, team, org, team);
  }
}
