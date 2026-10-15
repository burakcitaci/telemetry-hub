import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { unifiedMonitorApp } from './helpers/unified-monitor-app';

const definition = { name: 'Unified monitor', signal_type: 'LOG', query: 'service.name:api',
  aggregation: 'COUNT', comparator: 'GT', threshold: 10, window_seconds: 300, enabled: false };

test('HTTP create persists a configured default window and keeps explicit windows through PATCH', { timeout: 60000 }, async () => {
  const f = await unifiedMonitorApp({ MONITOR_DEFAULT_WINDOW_SECONDS: '600' });
  try {
    const cookie = await f.login('demo');
    const { window_seconds: _window, ...withoutWindow } = definition;
    const created = await f.call('/monitors', 'POST', withoutWindow, cookie);
    assert.equal(created.status, 201); const monitor = await created.json();
    assert.equal(monitor.window_seconds, 600);
    const renamed = await f.call(`/monitors/${monitor.id}`, 'PATCH', { name: 'Renamed' }, cookie);
    assert.equal((await renamed.json()).window_seconds, 600);
    const changed = await f.call(`/monitors/${monitor.id}`, 'PATCH', { window_seconds: 120 }, cookie);
    assert.equal((await changed.json()).window_seconds, 120);
    const explicit = await f.call('/monitors', 'POST', definition, cookie);
    assert.equal((await explicit.json()).window_seconds, 300);
    for (const window_seconds of [null, 0, -1, '300'])
      assert.equal((await f.call('/monitors', 'POST', { ...definition, window_seconds }, cookie)).status, 400);
  } finally { await f.app.close(); }
});

test('unified HTTP CRUD/status/history works across signals with strict bodies and organization boundaries', { timeout: 60000 }, async () => {
  const f = await unifiedMonitorApp();
  try {
    const cookie = await f.login('demo'), foreign = await f.login('other');
    assert.equal((await f.call('/monitors', 'POST', definition)).status, 401);
    assert.equal((await f.call('/alerts')).status, 401);
    for (const invalid of [{ runtime: {} }, { id: 'spoofed' }, { schemaVersion: 2 }, { enabled: null }, { name: '  ' },
      { aggregation: 'P95' }, { signal_type: 'METRIC' }, { query: 'service.name:api OR status.code:ERROR' }, { query: 'status.code:ERROR' },
      { comparator: 'above' }, { window_seconds: 0 }, { cooldown_seconds: -1 }, { muted_until: 'bad' }, { targets: ['slack'] }])
      assert.equal((await f.call('/monitors', 'POST', { ...definition, ...invalid }, cookie)).status, 400, JSON.stringify(invalid));
    for (const signal_type of ['LOG', 'METRIC', 'TRACE']) {
      f.state.value = 12; f.state.overflow = false;
      const body = { ...definition, signal_type, ...(signal_type === 'METRIC'
        ? { metric_name: 'http.server.request.duration', aggregation: 'P95', field: 'value' } : {}) };
      const response = await f.call('/monitors', 'POST', body, cookie); assert.equal(response.status, 201);
      const monitor = await response.json(); assert.equal(monitor.schemaVersion, 2);
      const before = await (await f.call(`/monitors/${monitor.id}/status`, 'GET', undefined, cookie)).json();
      assert.equal(before.enabled, false); assert.equal(before.operational_status, 'NOT_EVALUATED');
      const queries = f.state.queries;
      assert.equal((await f.call(`/monitors/${monitor.id}/evaluate`, 'POST', undefined, cookie)).status, 201);
      assert.equal(f.state.queries, queries);
      assert.equal((await f.call(`/monitors/${monitor.id}`, 'GET', undefined, foreign)).status, 404);
      assert.equal((await f.call(`/monitors/${monitor.id}`, 'PATCH', { name: 'foreign' }, foreign)).status, 404);
      assert.equal((await f.call(`/monitors/${monitor.id}`, 'PATCH', { enabled: true }, cookie)).status, 200);
      await f.call(`/monitors/${monitor.id}/evaluate`, 'POST', undefined, cookie);
      const status = await (await f.call(`/monitors/${monitor.id}/status`, 'GET', undefined, cookie)).json();
      assert.equal(status.state, 'FIRING'); assert.equal(status.value, 12); assert.equal(status.estimated, signal_type === 'METRIC');
      await f.call(`/monitors/${monitor.id}`, 'PATCH', { name: 'Renamed' }, cookie);
      await f.call(`/monitors/${monitor.id}/evaluate`, 'POST', undefined, cookie);
      let history = await (await f.call(`/alerts?monitor_id=${monitor.id}`, 'GET', undefined, cookie)).json();
      assert.equal(history.items.length, 1); assert.equal(history.items[0].notification.status, 'SENT');
      if (signal_type === 'METRIC') {
        f.state.overflow = true; await f.call(`/monitors/${monitor.id}/evaluate`, 'POST', undefined, cookie);
        const absent = await (await f.call(`/monitors/${monitor.id}/status`, 'GET', undefined, cookie)).json();
        assert.equal(absent.state, 'FIRING'); assert.equal(absent.operational_status, 'NO_DATA'); assert.equal(absent.estimated, true);
        f.state.overflow = false;
      }
      f.state.value = 0; await f.call(`/monitors/${monitor.id}/evaluate`, 'POST', undefined, cookie);
      history = await (await f.call(`/alerts?monitor_id=${monitor.id}`, 'GET', undefined, cookie)).json();
      assert.equal(history.items.length, 2); assert.ok(history.items.some(event => event.state === 'RECOVERED'));
      assert.equal(history.items[0].estimated, signal_type === 'METRIC');
      assert.equal((await f.call(`/monitors/${monitor.id}`, 'PATCH', { enabled: false }, cookie)).status, 200);
      if (signal_type === 'LOG') {
        assert.equal((await f.call(`/monitors/${monitor.id}`, 'DELETE', undefined, foreign)).status, 404);
        assert.equal((await f.call(`/monitors/${monitor.id}`, 'DELETE', undefined, cookie)).status, 200);
        assert.equal((await f.call(`/monitors/${monitor.id}`, 'GET', undefined, cookie)).status, 404);
        assert.equal((await (await f.call(`/alerts?monitor_id=${monitor.id}`, 'GET', undefined, cookie)).json()).items.length, 2);
      }
    }
    assert.deepEqual((await (await f.call('/alerts', 'GET', undefined, foreign)).json()).items, []);
    assert.equal((await f.call('/alerts?limit=101', 'GET', undefined, cookie)).status, 400);
    assert.equal((await f.call('/alerts?offset=-1', 'GET', undefined, cookie)).status, 400);
    const page = await (await f.call('/alerts?limit=1', 'GET', undefined, cookie)).json();
    assert.equal(page.items.length, 1); assert.equal(page.next_offset, 1);
    const warned = await (await f.call('/monitors', 'POST', { ...definition, enabled: true, query: 'unknown.key:private' }, cookie)).json();
    await f.call(`/monitors/${warned.id}/evaluate`, 'POST', undefined, cookie);
    const warnedStatus = await (await f.call(`/monitors/${warned.id}/status`, 'GET', undefined, cookie)).json();
    assert.deepEqual(warnedStatus.warnings, [{ code: 'UNKNOWN_QUERY_KEY', key: 'unknown.key' }]);
    await f.call(`/monitors/${warned.id}`, 'DELETE', undefined, cookie);
    const listed = await (await f.call('/monitors', 'GET', undefined, cookie)).json();
    assert.equal(listed.length, 2); assert.ok(listed.every(monitor => monitor.enabled === false));
  } finally { await f.app.close(); }
});

test('legacy events have one physical source of truth and an explicit PATCH can upgrade a monitor in place', { timeout: 60000 }, async () => {
  const f = await unifiedMonitorApp();
  try {
    const cookie = await f.login('demo');
    f.store.saveMonitor('demo', { id: 'legacy', name: 'Legacy', type: 'log', query: '*', comparator: 'above', aggregation: 'count',
      threshold: 10, evaluationWindow: '5m', createdAt: new Date().toISOString(), configurationVersion: 1,
      events: [{ id: 'old-event', at: new Date().toISOString(), status: 'Alert', value: 12 }] });
    const record = await (await f.call('/monitors/legacy', 'GET', undefined, cookie)).json();
    assert.equal(record.events[0].id, 'old-event');
    assert.equal(f.store.monitorRepository.history.load('demo', 'legacy')?.events, undefined);
    assert.equal((await f.call('/monitors/legacy', 'PATCH', { name: 'Ambiguous migration' }, cookie)).status, 400);
    const upgraded = await f.call('/monitors/legacy', 'PATCH', definition, cookie);
    assert.equal(upgraded.status, 200); assert.equal((await upgraded.json()).schemaVersion, 2);
    let history = await (await f.call('/alerts?monitor_id=legacy', 'GET', undefined, cookie)).json();
    assert.equal(history.items[0].id, 'old-event'); assert.equal(history.items[0].legacy, true);
    assert.equal(history.items[0].threshold, null); assert.equal(history.items[0].signal_type, null);
    const failedPatch = await f.call('/monitors/legacy', 'PATCH', { runtime: {} }, cookie); assert.equal(failedPatch.status, 400);
    assert.equal((await f.call('/monitors/legacy', 'PATCH', {}, cookie)).status, 400);
    assert.equal((await f.call('/monitors/legacy', 'PATCH', { enabled: null }, cookie)).status, 400);
    await f.call('/monitors/legacy', 'DELETE', undefined, cookie);
    history = await (await f.call('/alerts?monitor_id=legacy', 'GET', undefined, cookie)).json();
    assert.equal(history.items.length, 1); assert.equal(history.items[0].id, 'old-event');
  } finally { await f.app.close(); }
});
