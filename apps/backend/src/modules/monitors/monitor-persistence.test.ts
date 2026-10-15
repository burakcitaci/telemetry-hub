import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { ConfigService } from '@nestjs/config';
import { SqliteMonitorRepository } from './sqlite-monitor.repository';
import { SignalEvaluator } from './signal-evaluator';
import { alertRetentionConfig } from './monitoring.config';
import { AlertRetentionService } from './alert-retention.service';
import { PlatformStore } from '../auth/platform-store.service';
import type { Monitor } from './monitor.model';
import { MonitorEvaluatorService } from './monitor-evaluator.service';
import type { MonitorQueryService } from './monitor-query.service';

const epoch = Date.parse('2026-10-15T12:00:00Z');
const clock = { now: () => new Date(epoch) };
const legacy = { id: 'legacy', type: 'log', name: 'Existing', events: [
  { id: 'legacy-1', status: 'Alert', value: 20, at: new Date(epoch - 1000).toISOString() },
  { id: 'legacy-2', status: 'No Data', at: new Date(epoch - 2000).toISOString() },
] };
const monitor: Monitor = { id: 'unified', name: 'Errors', schemaVersion: 2, configurationVersion: 1, signal_type: 'LOG',
  query: '', aggregation: 'COUNT', comparator: 'GT', threshold: 10, window_seconds: 300, enabled: true, created_at: clock.now().toISOString() };

function seed(db: DatabaseSync, org = 'demo', record = legacy) {
  db.prepare('INSERT INTO monitors VALUES (?, ?, ?)').run(org, record.id, JSON.stringify(record));
}

test('first-read event migration is idempotent and strips JSON without inventing historical snapshots', () => {
  const db = new DatabaseSync(':memory:'), repo = new SqliteMonitorRepository(db, { clock });
  try {
    seed(db); repo.history.load('demo', legacy.id);
    const first = repo.history.list('demo'); repo.history.load('demo', legacy.id); repo.records('demo');
    assert.deepEqual(repo.history.list('demo'), first); assert.equal(first.items.length, 2);
    const stored = JSON.parse(String(db.prepare('SELECT body FROM monitors').get()?.body));
    assert.equal(stored.events, undefined); assert.equal(stored.legacyEventsMigrated, true);
    assert.deepEqual(repo.history.legacyEvents('demo', legacy.id), legacy.events);
    assert.deepEqual(first.items.map(event => event.id), legacy.events.map(event => event.id));
    for (const event of first.items) {
      assert.equal(event.threshold, null); assert.equal(event.signal_type, null); assert.equal(event.estimated, null);
      assert.equal('legacy' in event && event.legacy, true);
    }
  } finally { db.close(); }
});

test('failure after inserting imported events rolls back both events and the JSON migration marker', () => {
  const db = new DatabaseSync(':memory:'), repo = new SqliteMonitorRepository(db, { clock });
  try {
    seed(db);
    db.exec("CREATE TRIGGER fail_migration BEFORE UPDATE ON monitors BEGIN SELECT RAISE(ABORT, 'migration failure'); END");
    assert.throws(() => repo.history.load('demo', legacy.id), /migration failure/);
    assert.equal(repo.history.list('demo').items.length, 0);
    assert.deepEqual(JSON.parse(String(db.prepare('SELECT body FROM monitors').get()?.body)), legacy);
    db.exec('DROP TRIGGER fail_migration'); repo.history.load('demo', legacy.id);
    assert.equal(repo.history.list('demo').items.length, 2);
  } finally { db.close(); }
});

test('invalid embedded data cannot leave a partially migrated monitor', () => {
  const db = new DatabaseSync(':memory:'), repo = new SqliteMonitorRepository(db, { clock });
  try {
    seed(db, 'demo', { ...legacy, events: [legacy.events[0], { ...legacy.events[1], at: 'invalid' }] });
    assert.throws(() => repo.history.load('demo', legacy.id), /rolled back/);
    assert.equal(repo.history.list('demo').items.length, 0);
    assert.equal(JSON.parse(String(db.prepare('SELECT body FROM monitors').get()?.body)).events.length, 2);
  } finally { db.close(); }
});

test('historical IDs are deduplicated per organization and monitor, with bounded pagination', () => {
  const db = new DatabaseSync(':memory:'), repo = new SqliteMonitorRepository(db, { clock });
  try {
    seed(db); seed(db, 'other'); seed(db, 'demo', { ...legacy, id: 'second' });
    repo.records('demo'); repo.records('other');
    assert.equal(repo.history.list('demo').items.length, 4); assert.equal(repo.history.list('other').items.length, 2);
    const page = repo.history.list('demo', { monitor_id: legacy.id, limit: 1 });
    assert.equal(page.items.length, 1); assert.equal(page.next_offset, 1);
    assert.equal(repo.history.list('demo', { monitor_id: legacy.id, limit: 1, offset: 1 }).next_offset, null);
    assert.throws(() => repo.history.list('demo', { limit: 101 }));
    db.prepare('DELETE FROM monitors WHERE org = ?').run('demo');
    assert.equal(repo.history.list('demo').items.length, 4);
  } finally { db.close(); }
});

test('retention preserves the exact cutoff, prunes expired rows, and prevents reimport of expired snapshots', () => {
  const db = new DatabaseSync(':memory:');
  let at = epoch;
  const repo = new SqliteMonitorRepository(db, { clock: { now: () => new Date(at) }, retentionDays: 30 });
  const boundary = epoch - 30 * 86400000;
  const snapshot = { ...legacy, events: [legacy.events[0], { ...legacy.events[1], at: new Date(boundary).toISOString() }] };
  try {
    seed(db, 'demo', snapshot); repo.history.load('demo', legacy.id);
    assert.equal(repo.history.list('demo').items.length, 2);
    at++; assert.equal(repo.history.list('demo').items.length, 1); assert.equal(repo.history.prune(), 1);
    repo.saveRecord('demo', snapshot);
    assert.equal(repo.history.list('demo').items.length, 1);
    assert.equal(repo.history.prune(), 0);
  } finally { db.close(); }
});

test('file-backed restart preserves monitors, delivery receipts and imported event IDs without duplicate alerts', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'telemetry-monitor-test-'));
  const path = join(directory, 'platform.sqlite');
  let db: DatabaseSync | undefined;
  try {
    db = new DatabaseSync(path);
    let repo = new SqliteMonitorRepository(db, { clock });
    seed(db); repo.history.load('demo', legacy.id); repo.save('demo', monitor);
    let value = 12, notifications = 0;
    const adapter = { aggregate: async () => value, measure: async () => ({ value, unit: 'logs', estimated: false, warnings: [] }) };
    const make = () => new SignalEvaluator(repo, { get: () => adapter }, { notify: async () => { notifications++; } }, clock);
    await make().evaluate('demo', monitor.id);
    const original = repo.history.list('demo'); db.close(); db = undefined;
    db = new DatabaseSync(path); repo = new SqliteMonitorRepository(db, { clock });
    repo.history.load('demo', legacy.id); assert.deepEqual(repo.history.list('demo'), original);
    assert.equal(repo.find('demo', monitor.id)?.runtime?.notifications?.active_firing_status, 'SENT');
    await make().evaluate('demo', monitor.id); assert.equal(notifications, 1);
    value = 0; await make().evaluate('demo', monitor.id); assert.equal(notifications, 2);
  } finally {
    db?.close();
    assert.equal(dirname(resolve(directory)), resolve(tmpdir()));
    assert.ok(basename(directory).startsWith('telemetry-monitor-test-'));
    rmSync(directory, { recursive: true, force: true });
  }
});

test('configuration replacement preserves fresh runtime, invalidates changed measurements and cannot revive deletion', () => {
  const db = new DatabaseSync(':memory:'), repo = new SqliteMonitorRepository(db, { clock });
  try {
    repo.save('demo', monitor); const expected = repo.find('demo', monitor.id)!;
    const runtime = { revision: 5, state: 'FIRING' as const, operational_status: 'OK' as const, value: 12, unit: 'logs',
      estimated: false, warnings: [], checked_at: clock.now().toISOString(), error: null };
    repo.save('demo', { ...monitor, runtime });
    const renamed = repo.replaceConfiguration('demo', expected, { ...monitor, name: 'Renamed', configurationVersion: 2 })!;
    assert.deepEqual(renamed.runtime, runtime);
    const changed = repo.replaceConfiguration('demo', renamed, { ...renamed, threshold: 100, configurationVersion: 3 })!;
    assert.equal(changed.runtime?.state, 'FIRING'); assert.equal(changed.runtime?.value, null);
    assert.equal(repo.replaceConfiguration('demo', expected, monitor), undefined);
    db.prepare('DELETE FROM monitors').run(); assert.equal(repo.replaceConfiguration('demo', changed, monitor), undefined);
  } finally { db.close(); }
});

test('retention configuration validates explicit defaults and rejects invalid startup values', () => {
  assert.deepEqual(alertRetentionConfig({ get: () => undefined }), { days: 30, intervalSeconds: 3600 });
  for (const setting of [{ MONITOR_ALERT_RETENTION_DAYS: 0 }, { MONITOR_ALERT_RETENTION_DAYS: 'bad' },
    { MONITOR_ALERT_PRUNE_INTERVAL_SECONDS: -1 }, { MONITOR_ALERT_PRUNE_INTERVAL_SECONDS: 2147483648 }])
    assert.throws(() => alertRetentionConfig(new ConfigService(setting)));
});

test('pruning runs at startup and each configured interval, then stops cleanly', context => {
  context.mock.timers.enable({ apis: ['setInterval'] });
  let count = 0;
  const store = { registerMonitorCleanup() {}, monitorRepository: { history: { prune() { count++; } } } } as unknown as PlatformStore;
  const service = new AlertRetentionService(store, new ConfigService({ MONITOR_ALERT_PRUNE_INTERVAL_SECONDS: 1 }));
  service.onModuleInit(); assert.equal(count, 1);
  context.mock.timers.tick(1000); assert.equal(count, 2);
  service.onModuleDestroy(); context.mock.timers.tick(1000); assert.equal(count, 2);
});

test('shared database stays open until monitoring cleanup completes', async () => {
  const store = new PlatformStore(new ConfigService({ AUTH_DB_PATH: ':memory:' }));
  let release!: () => void;
  store.registerMonitorCleanup(() => new Promise<void>(resolve => { release = resolve; }));
  const closing = store.onModuleDestroy(); await Promise.resolve();
  assert.deepEqual(store.monitors('demo'), []);
  release(); await closing;
  assert.throws(() => store.monitors('demo'), /not open|closed/);
});

test('a failed first-read history migration cannot block other monitors in the evaluation loop', async () => {
  const store = new PlatformStore(new ConfigService({ AUTH_DB_PATH: ':memory:' }));
  const db = (store as unknown as { db: DatabaseSync }).db;
  seed(db, 'demo', { ...legacy, id: 'a-invalid', events: [{ ...legacy.events[0], at: 'invalid' }] });
  store.monitorRepository.save('demo', monitor);
  const adapter = { aggregate: async () => 12, measure: async () => ({ value: 12, unit: 'logs', estimated: false, warnings: [] }) };
  const core = new SignalEvaluator(store.monitorRepository, { get: () => adapter }, { notify: async () => {} }, clock);
  const facade = new MonitorEvaluatorService(store, {} as MonitorQueryService, core);
  try {
    await (facade as unknown as { tick(): Promise<void> }).tick();
    assert.equal(store.monitorRepository.find('demo', monitor.id)?.runtime?.state, 'FIRING');
    assert.equal(store.monitorRepository.events('demo', monitor.id).length, 1);
    assert.equal(JSON.parse(String(db.prepare('SELECT body FROM monitors WHERE id = ?').get('a-invalid')?.body)).events.length, 1);
  } finally { await store.onModuleDestroy(); }
});
