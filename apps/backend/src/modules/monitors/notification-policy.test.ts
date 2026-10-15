import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { DummyNotifier } from './dummy-notifier';
import { SignalEvaluator } from './signal-evaluator';
import { SqliteMonitorRepository } from './sqlite-monitor.repository';
import type { Monitor } from './monitor.model';
import type { SignalAdapter, SignalMeasurement } from './signal-adapter';

const epoch = Date.parse('2026-10-15T12:00:00Z');
const rule: Monitor = { schemaVersion: 2, configurationVersion: 1, id: 'monitor', name: 'Errors', signal_type: 'LOG',
  query: '', aggregation: 'COUNT', window_seconds: 300, threshold: 10, comparator: 'GT', enabled: true, created_at: new Date(epoch).toISOString() };
const measured = (value: number): SignalMeasurement => ({ value, unit: 'logs', estimated: false, warnings: [] });

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(release => { resolve = release; });
  return { promise, resolve };
}

function fixture() {
  const db = new DatabaseSync(':memory:'), repository = new SqliteMonitorRepository(db);
  repository.save('demo', rule);
  let at = epoch, value = 12;
  const output: any[] = [], failures: string[] = [];
  const adapter: SignalAdapter = { aggregate: async () => value, measure: async () => measured(value) };
  const notifier = new DummyNotifier(line => { output.push(JSON.parse(line)); });
  const create = () => new SignalEvaluator(repository, { get: () => adapter }, notifier, { now: () => new Date(at) },
    undefined, event => { failures.push(event.id); });
  const evaluator = create();
  const policy = (patch: Partial<Monitor>) => {
    const current = repository.find('demo', rule.id)!;
    repository.save('demo', { ...current, ...patch, configurationVersion: current.configurationVersion + 1 });
  };
  return { db, repository, output, failures, adapter, notifier, evaluator, create, policy,
    advance: (seconds: number) => { at += seconds * 1000; },
    evaluate: (next: number) => { value = next; return evaluator.evaluate('demo', rule.id); } };
}

test('mute preserves every transition, expires at the boundary, and never replays a suppressed firing', async () => {
  const f = fixture();
  try {
    f.policy({ muted_until: new Date(epoch + 60000).toISOString() });
    await f.evaluate(12); f.advance(60); await f.evaluate(12);
    assert.equal(f.output.length, 0); assert.equal(f.repository.events('demo', rule.id).length, 1);
    assert.equal(f.repository.find('demo', rule.id)?.runtime?.notifications?.last_firing_sent_at, undefined);
    await f.evaluate(0); await f.evaluate(12);
    const history = f.repository.events('demo', rule.id);
    assert.deepEqual(history.map(event => event.notification?.status), ['SUPPRESSED', 'SUPPRESSED', 'SENT']);
    assert.equal(history[0].notification?.reason, 'MUTED');
    assert.equal(history[0].notification?.attempted_at, undefined);
    assert.equal(history[1].notification?.reason, 'UNPAIRED_RECOVERY');
    assert.equal(f.output.length, 1);
  } finally { f.db.close(); }
});

test('muted recovery is persisted even when a matching firing was previously delivered', async () => {
  const f = fixture();
  try {
    await f.evaluate(12);
    f.policy({ muted_until: new Date(epoch + 60000).toISOString() });
    await f.evaluate(0);
    assert.equal(f.output.length, 1);
    assert.deepEqual(f.repository.events('demo', rule.id).map(event => event.state), ['FIRING', 'RECOVERED']);
    assert.equal(f.repository.events('demo', rule.id)[1].notification?.reason, 'MUTED');
  } finally { f.db.close(); }
});

test('cooldown survives evaluator recreation, limits firings, and allows matching recoveries', async () => {
  const f = fixture();
  try {
    f.policy({ cooldown_seconds: 60 });
    await f.evaluate(12); f.advance(1); await f.evaluate(0); f.advance(1);
    const measure = f.adapter.measure;
    f.adapter.measure = async () => measured(12);
    await f.create().evaluate('demo', rule.id);
    f.adapter.measure = measure;
    f.advance(1); await f.evaluate(0);
    f.advance(57); await f.evaluate(12); await f.evaluate(0);
    const history = f.repository.events('demo', rule.id);
    assert.deepEqual(history.map(event => event.notification?.status), ['SENT', 'SENT', 'SUPPRESSED', 'SUPPRESSED', 'SENT', 'SENT']);
    assert.equal(history[2].notification?.reason, 'COOLDOWN');
    assert.equal(history[3].notification?.reason, 'UNPAIRED_RECOVERY');
    assert.deepEqual(f.output.map(row => row.status), ['firing', 'resolved', 'firing', 'resolved']);
  } finally { f.db.close(); }
});

test('failed output is audited, consumes one cooldown attempt and cannot cause an unmatched recovery', async () => {
  const f = fixture();
  try {
    f.policy({ cooldown_seconds: 60 });
    f.notifier.notify = async () => { throw new Error('private output details'); };
    await f.evaluate(12); await f.evaluate(12); await f.evaluate(0); f.advance(1); await f.evaluate(12);
    const history = f.repository.events('demo', rule.id);
    assert.deepEqual(history.map(event => event.notification?.status), ['FAILED', 'SUPPRESSED', 'SUPPRESSED']);
    assert.equal(history[2].notification?.reason, 'COOLDOWN'); assert.equal(f.failures.length, 1);
    assert.equal(f.repository.find('demo', rule.id)?.runtime?.notifications?.last_firing_sent_at, undefined);
    assert.doesNotMatch(JSON.stringify(history), /private output/);
  } finally { f.db.close(); }
});

test('delivery receipt invalidates an in-flight evaluation so confirmation cannot be overwritten', async () => {
  const f = fixture(), started = deferred<void>(), acknowledged = deferred<void>();
  try {
    const notifications: string[] = [];
    f.notifier.notify = async event => { notifications.push(event.state); started.resolve(); await acknowledged.promise; };
    const first = f.evaluate(12); await started.promise;
    const pending = deferred<SignalMeasurement>();
    f.adapter.measure = async () => pending.promise;
    const stale = f.create().evaluate('demo', rule.id);
    acknowledged.resolve(); await first;
    pending.resolve(measured(12)); await stale;
    assert.equal(f.repository.find('demo', rule.id)?.runtime?.notifications?.active_firing_status, 'SENT');
    f.adapter.measure = async () => measured(0); await f.evaluator.evaluate('demo', rule.id);
    assert.deepEqual(notifications, ['FIRING', 'RECOVERED']);
    assert.deepEqual(f.repository.events('demo', rule.id).map(event => event.notification?.status), ['SENT', 'SENT']);
  } finally { f.db.close(); }
});

test('recording a delivery receipt twice is idempotent and tenant scoped', async () => {
  const f = fixture();
  try {
    await f.evaluate(12);
    const event = f.repository.events('demo', rule.id)[0], before = f.repository.find('demo', rule.id);
    assert.equal(f.repository.completeNotification('foreign', event.id, 'FAILED', new Date(epoch).toISOString()), false);
    assert.equal(f.repository.completeNotification('demo', event.id, 'FAILED', new Date(epoch).toISOString()), false);
    assert.deepEqual(f.repository.find('demo', rule.id), before);
    assert.equal(f.repository.events('demo', rule.id)[0].notification?.status, 'SENT');
  } finally { f.db.close(); }
});

test('delivery receipts roll back event and runtime updates together without repeating stdout', async () => {
  const f = fixture();
  try {
    f.db.exec(`CREATE TRIGGER reject_receipt BEFORE UPDATE ON monitors
      WHEN json_extract(NEW.body, '$.runtime.notifications.active_firing_status') = 'SENT'
      BEGIN SELECT RAISE(ABORT, 'receipt failure'); END`);
    await assert.rejects(f.evaluate(12), /receipt failure/);
    const event = f.repository.events('demo', rule.id)[0];
    assert.equal(event.notification?.status, 'PENDING');
    assert.equal(f.repository.find('demo', rule.id)?.runtime?.notifications?.active_firing_status, 'PENDING');
    await f.evaluate(12); assert.equal(f.output.length, 1);
    f.db.exec('DROP TRIGGER reject_receipt');
    assert.equal(f.repository.completeNotification('demo', event.id, 'SENT', new Date(epoch).toISOString()), true);
    assert.equal(f.repository.events('demo', rule.id)[0].notification?.status, 'SENT');
  } finally { f.db.close(); }
});

test('mute expiry is checked at delivery decision time after the signal query completes', async () => {
  const f = fixture();
  try {
    f.policy({ muted_until: new Date(epoch + 60000).toISOString() });
    f.adapter.measure = async () => { f.advance(60); return measured(12); };
    await f.evaluate(12);
    assert.equal(f.output.length, 1);
    assert.equal(f.repository.events('demo', rule.id)[0].notification?.attempted_at, new Date(epoch + 60000).toISOString());
  } finally { f.db.close(); }
});

for (const patch of [{ cooldown_seconds: -1 }, { cooldown_seconds: 0.5 }, { muted_until: 'invalid' }]) {
  test(`invalid notification policy is isolated: ${JSON.stringify(patch)}`, async () => {
    const f = fixture();
    try {
      f.policy(patch);
      let calls = 0;
      f.adapter.measure = async () => { calls++; return measured(12); };
      assert.equal((await f.evaluate(12))?.runtime?.operational_status, 'ERROR');
      assert.equal(calls, 0); assert.equal(f.output.length, 0);
    } finally { f.db.close(); }
  });
}
