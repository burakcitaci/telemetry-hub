import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { ConfigService } from '@nestjs/config';
import { SignalEvaluator } from './signal-evaluator';
import { SqliteMonitorRepository } from './sqlite-monitor.repository';
import { NoDataError, SIGNAL_TYPES, type SignalAdapter, type SignalMeasurement } from './signal-adapter';
import type { AlertEvent, Monitor } from './monitor.model';
import { MonitorEvaluatorService } from './monitor-evaluator.service';
import { PlatformStore } from '../auth/platform-store.service';
import type { MonitorQueryService } from './monitor-query.service';

const now = new Date('2026-10-15T12:00:00Z');
const rule: Monitor = { schemaVersion: 2, configurationVersion: 1, id: 'test', name: 'Test monitor',
  signal_type: 'LOG', query: '', aggregation: 'COUNT', window_seconds: 300, threshold: 10,
  comparator: 'GT', enabled: true, created_at: now.toISOString() };
const measured = (value: number): SignalMeasurement => ({ value, unit: 'observations', estimated: false, warnings: [] });

function deferred() {
  let resolve!: (value: SignalMeasurement) => void;
  const promise = new Promise<SignalMeasurement>(release => { resolve = release; });
  return { promise, resolve };
}

function fixture() {
  const db = new DatabaseSync(':memory:');
  const repository = new SqliteMonitorRepository(db);
  repository.save('demo', rule);
  const events: AlertEvent[] = [], failures: AlertEvent[] = [];
  const adapter: SignalAdapter = { aggregate: async () => { throw new Error('Use measurement metadata.'); },
    measure: async () => measured(12) };
  const notifier = { notify: async (event: AlertEvent) => { events.push(event); } };
  const create = () => new SignalEvaluator(repository, { get: () => adapter }, notifier, { now: () => now },
    undefined, event => failures.push(event));
  const evaluator = create();
  return { db, repository, adapter, notifier, events, failures, evaluator, create };
}

test('initial healthy evaluation is quiet; firing and recovery persist and notify once each', async () => {
  const f = fixture();
  try {
    f.adapter.measure = async () => measured(1);
    await f.evaluator.evaluate('demo', rule.id);
    assert.equal(f.repository.events('demo', rule.id).length, 0);
    f.adapter.measure = async () => measured(12);
    await f.evaluator.evaluate('demo', rule.id); await f.evaluator.evaluate('demo', rule.id);
    f.adapter.measure = async () => measured(1);
    await f.evaluator.evaluate('demo', rule.id); await f.evaluator.evaluate('demo', rule.id);
    assert.deepEqual(f.repository.events('demo', rule.id).map(event => event.state), ['FIRING', 'RECOVERED']);
    assert.deepEqual(f.events.map(event => event.state), ['FIRING', 'RECOVERED']);
    assert.equal(f.events[0].threshold, 10); assert.equal(f.events[0].window_seconds, 300);
    assert.equal(f.events[0].monitor_name, rule.name); assert.equal(f.events[0].signal_type, 'LOG');
  } finally { f.db.close(); }
});

test('two simultaneous calls on one evaluator produce exactly one row and notification per transition', async () => {
  const f = fixture();
  let calls = 0;
  try {
    for (const [value, state] of [[12, 'FIRING'], [1, 'RECOVERED']] as const) {
      const pending = deferred();
      f.adapter.measure = async () => { calls++; return pending.promise; };
      const first = f.evaluator.evaluate('demo', rule.id), second = f.evaluator.evaluate('demo', rule.id);
      assert.equal(first, second);
      pending.resolve(measured(value)); await Promise.all([first, second]);
      assert.equal(f.repository.events('demo', rule.id).filter(event => event.state === state).length, 1);
      assert.equal(f.events.filter(event => event.state === state).length, 1);
    }
    assert.equal(calls, 2);
  } finally { f.db.close(); }
});

test('independent evaluators racing the same SQLite snapshot cannot duplicate rows or notifications', async () => {
  const f = fixture();
  const other = f.create();
  try {
    for (const [value, state] of [[12, 'FIRING'], [1, 'RECOVERED']] as const) {
      const pending = deferred();
      let calls = 0;
      f.adapter.measure = async () => { calls++; return pending.promise; };
      const evaluations = [f.evaluator.evaluate('demo', rule.id), other.evaluate('demo', rule.id)];
      assert.equal(calls, 2);
      pending.resolve(measured(value)); await Promise.all(evaluations);
      assert.equal(f.repository.events('demo', rule.id).filter(event => event.state === state).length, 1);
      assert.equal(f.events.filter(event => event.state === state).length, 1);
    }
  } finally { f.db.close(); }
});

for (const mutation of ['edit', 'disable', 'delete'] as const) {
  test(`${mutation} during evaluation prevents stale state writes and notifications`, async () => {
    const f = fixture(), pending = deferred();
    try {
      f.adapter.measure = async () => pending.promise;
      const evaluation = f.evaluator.evaluate('demo', rule.id);
      if (mutation === 'delete') f.db.prepare('DELETE FROM monitors WHERE org = ? AND id = ?').run('demo', rule.id);
      else f.repository.save('demo', { ...rule, configurationVersion: 2,
        ...(mutation === 'edit' ? { threshold: 100 } : { enabled: false }) });
      pending.resolve(measured(12)); await evaluation;
      assert.equal(f.repository.events('demo', rule.id).length, 0); assert.equal(f.events.length, 0);
      if (mutation === 'delete') assert.equal(f.repository.find('demo', rule.id), undefined);
      else assert.equal(f.repository.find('demo', rule.id)?.runtime, undefined);
    } finally { f.db.close(); }
  });
}

test('NoData, query failures and non-finite samples preserve firing state without false recovery', async () => {
  const f = fixture();
  try {
    await f.evaluator.evaluate('demo', rule.id);
    f.adapter.measure = async () => { throw new NoDataError('Histogram overflow.', true); };
    const absent = await f.evaluator.evaluate('demo', rule.id);
    assert.equal(absent?.runtime?.state, 'FIRING'); assert.equal(absent?.runtime?.operational_status, 'NO_DATA');
    assert.equal(absent?.runtime?.estimated, true); assert.equal(absent?.runtime?.value, null);
    f.adapter.measure = async () => { throw new Error('private database credentials'); };
    const failed = await f.evaluator.evaluate('demo', rule.id);
    assert.equal(failed?.runtime?.state, 'FIRING'); assert.equal(failed?.runtime?.operational_status, 'ERROR');
    assert.doesNotMatch(failed?.runtime?.error ?? '', /credentials/);
    f.adapter.measure = async () => measured(Infinity);
    assert.equal((await f.evaluator.evaluate('demo', rule.id))?.runtime?.state, 'FIRING');
    assert.equal(f.events.length, 1);
    f.adapter.measure = async () => measured(0); await f.evaluator.evaluate('demo', rule.id);
    assert.equal(f.events[1].state, 'RECOVERED');
  } finally { f.db.close(); }
});

test('all signals use the same mocked adapter contract, injected clock and immutable metadata', async () => {
  const f = fixture();
  try {
    for (const signal_type of SIGNAL_TYPES) {
      f.repository.save('demo', { ...rule, id: signal_type, signal_type });
      f.adapter.measure = async (query, since, until) => {
        assert.equal(query.signal_type, signal_type); assert.equal(query.scope.tenantSlug, 'demo');
        assert.equal(since.getTime(), now.getTime() - 300000); assert.equal(until.getTime(), now.getTime());
        return { ...measured(12), estimated: true, warnings: [{ code: 'UNKNOWN_QUERY_KEY', key: 'unknown' }] };
      };
      const result = await f.evaluator.evaluate('demo', signal_type);
      assert.equal(result?.runtime?.checked_at, now.toISOString()); assert.equal(result?.runtime?.warnings.length, 1);
      assert.equal(f.repository.events('demo', signal_type)[0].estimated, true);
    }
  } finally { f.db.close(); }
});

test('disabled, missing and legacy monitors never invoke the adapter; organizations remain isolated', async () => {
  const f = fixture();
  try {
    let calls = 0;
    f.adapter.measure = async () => { calls++; return measured(12); };
    f.repository.save('demo', { ...rule, enabled: false });
    await f.evaluator.evaluate('demo', rule.id); await f.evaluator.evaluate('foreign', rule.id);
    f.db.prepare('INSERT INTO monitors VALUES (?, ?, ?)').run('demo', 'legacy', JSON.stringify({ id: 'legacy', type: 'log' }));
    await f.evaluator.evaluate('demo', 'legacy'); assert.equal(calls, 0);
    f.repository.save('foreign', rule); await f.evaluator.evaluate('foreign', rule.id);
    assert.equal(f.repository.events('foreign', rule.id).length, 1);
    assert.equal(f.repository.events('demo', rule.id).length, 0);
  } finally { f.db.close(); }
});

test('event insert failure rolls back monitor state atomically and never calls the notifier', async () => {
  const f = fixture();
  try {
    f.db.exec("CREATE TRIGGER reject_alert BEFORE INSERT ON monitor_alert_events BEGIN SELECT RAISE(ABORT, 'injected failure'); END");
    await assert.rejects(f.evaluator.evaluate('demo', rule.id), /injected failure/);
    assert.equal(f.repository.find('demo', rule.id)?.runtime, undefined);
    assert.equal(f.repository.events('demo', rule.id).length, 0); assert.equal(f.events.length, 0);
    f.db.exec('DROP TRIGGER reject_alert'); await f.evaluator.evaluate('demo', rule.id);
    assert.equal(f.repository.events('demo', rule.id).length, 1); assert.equal(f.events.length, 1);
  } finally { f.db.close(); }
});

test('notification failure leaves the committed transition intact and does not repeat it', async () => {
  const f = fixture();
  try {
    let attempts = 0;
    f.notifier.notify = async () => { attempts++; throw new Error('notifier unavailable'); };
    await f.evaluator.evaluate('demo', rule.id); await f.evaluator.evaluate('demo', rule.id);
    assert.equal(attempts, 1); assert.equal(f.failures.length, 1);
    assert.equal(f.repository.events('demo', rule.id).length, 1);
    assert.equal(f.repository.find('demo', rule.id)?.runtime?.state, 'FIRING');
  } finally { f.db.close(); }
});

test('shutdown waits for in-flight evaluation and prevents its commit', async () => {
  const f = fixture(), pending = deferred();
  try {
    f.adapter.measure = async () => pending.promise;
    const evaluation = f.evaluator.evaluate('demo', rule.id), stopped = f.evaluator.stop();
    pending.resolve(measured(12)); await Promise.all([evaluation, stopped]);
    assert.equal(f.repository.events('demo', rule.id).length, 0); assert.equal(f.events.length, 0);
    assert.equal(await f.evaluator.evaluate('demo', rule.id), undefined);
  } finally { f.db.close(); }
});

test('one misconfigured monitor does not prevent other evaluations', async () => {
  const f = fixture();
  try {
    f.repository.save('demo', { ...rule, id: 'broken', window_seconds: 0 });
    const [broken, healthy] = await Promise.all([f.evaluator.evaluate('demo', 'broken'), f.evaluator.evaluate('demo', rule.id)]);
    assert.equal(broken?.runtime?.operational_status, 'ERROR');
    assert.equal(healthy?.runtime?.state, 'FIRING');
    assert.equal(f.repository.events('demo', 'broken').length, 0); assert.equal(f.events.length, 1);
  } finally { f.db.close(); }
});

test('the existing scheduler facade delegates versioned monitors to the new engine', async () => {
  const store = new PlatformStore(new ConfigService({ AUTH_DB_PATH: ':memory:' }));
  const calls: string[] = [];
  store.saveMonitor('demo', rule);
  const engine = { evaluate: async (org: string, id: string) => { calls.push(org, id); return rule; }, stop: async () => {} } as unknown as SignalEvaluator;
  const legacy = { evaluate: () => { throw new Error('Legacy query must not run.'); } } as unknown as MonitorQueryService;
  const facade = new MonitorEvaluatorService(store, legacy, engine);
  try {
    assert.equal((await facade.evaluate('demo', rule.id))?.id, rule.id);
    assert.deepEqual(calls, ['demo', rule.id]);
  } finally { await facade.onModuleDestroy(); store.onModuleDestroy(); }
});
