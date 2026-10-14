import assert from 'node:assert/strict';
import { test } from 'node:test';
import { platformFilterKey, platformFilterSearch, readPlatformFilters } from '../src/shared/lib/platform-filters';
import { api } from '../src/shared/api/client';
import { createEventSource } from '../src/shared/api/event-stream';
import { filterOptionsSource, getFilterOptions } from '../src/shared/api/filter-options';

test('no implicit team or environment boundary, and explorer facets do not become global service filters', () => {
  assert.deepEqual(readPlatformFilters(''), { team: [], service: [], env: [], status: [] });
  assert.deepEqual(readPlatformFilters('?service=local-service&env=all&team=all'), { team: [], service: [], env: [], status: [] });
});

test('multi-select values survive navigation with canonical keys and live streams', async () => {
  const search = '?team=backend&team=frontend&team=backend&globalService=a%2Cb&globalService=api&env=dev&env=production&globalStatus=ERROR&globalStatus=WARN';
  assert.deepEqual(readPlatformFilters(search), { team: ['backend', 'frontend'], service: ['a,b', 'api'], env: ['dev', 'production'], status: ['ERROR', 'WARN'] });
  assert.deepEqual(readPlatformFilters(platformFilterSearch(search)), readPlatformFilters(search));
  assert.equal(platformFilterKey(search), platformFilterKey('?env=production&env=dev&team=frontend&team=backend&globalService=api&globalService=a%2Cb&globalStatus=WARN&globalStatus=ERROR'));
  const previousWindow = globalThis.window, previousAdapter = api.defaults.adapter;
  const previousEventSource = globalThis.EventSource;
  globalThis.window = { location: { search, pathname: '/org/demo/logs' } } as any;
  api.defaults.adapter = async config => {
    assert.deepEqual(JSON.parse(String(config.headers.get('X-Team-Filter'))), ['backend', 'frontend']);
    assert.deepEqual(JSON.parse(String(config.headers.get('X-Status-Filter'))), ['ERROR', 'WARN']);
    assert.equal(config.params.env, 'all');
    return { data: [], status: 200, statusText: 'OK', headers: {}, config };
  };
  globalThis.EventSource = class {
    constructor(url: string, options: any) {
      const query = new URL(url).searchParams;
      assert.deepEqual(query.getAll('team'), ['backend', 'frontend', 'backend']);
      assert.deepEqual(query.getAll('globalEnv'), ['dev', 'production']);
      assert.deepEqual(query.getAll('globalStatus'), ['ERROR', 'WARN']);
      assert.equal(options.withCredentials, true);
    }
  } as any;
  try { await api.get('/logs'); createEventSource(); }
  finally { api.defaults.adapter = previousAdapter; globalThis.window = previousWindow; globalThis.EventSource = previousEventSource; }
});

test('navigation preserves unified filters, drops page-local state and encodes special characters', () => {
  const search = '?team=platform&globalService=checkout%2Fapi&env=dev&id=trace&status=error&range=24h';
  assert.equal(platformFilterSearch(search), '?team=platform&globalService=checkout%2Fapi&env=dev');
  assert.equal(platformFilterKey(search), platformFilterKey('?env=dev&globalService=checkout%2Fapi&team=platform'));
  assert.notEqual(platformFilterKey(search), platformFilterKey('?env=production'));
});

test('shared client applies filters to every explorer, overrides stale environments and keeps auth credentials', async () => {
  const previousWindow = globalThis.window;
  const previousAdapter = api.defaults.adapter;
  const requests: any[] = [];
  globalThis.window = { location: { search: '?team=frontend&globalService=web&env=dev', pathname: '/org/demo/metrics' } } as any;
  api.defaults.adapter = async config => {
    requests.push(config);
    return { data: [], status: 200, statusText: 'OK', headers: {}, config };
  };
  try {
    for (const path of ['/metrics?env=production&limit=200', '/logs', '/traces', '/services', '/monitors']) {
      await api.get(path, { params: { env: 'production' } });
      const config = requests.at(-1);
      assert.equal(config.headers.get('X-Team-Filter'), 'frontend');
      assert.equal(config.headers.get('X-Service-Filter'), 'web');
      assert.equal(config.headers.get('X-Environment-Filter'), 'dev');
      assert.equal(config.params.env, 'dev'); assert.equal(config.withCredentials, true);
      assert.equal(config.url.includes('env=production'), false);
    }
    await api.get('/admin/users'); assert.equal(requests.at(-1).headers.has('X-Team-Filter'), false);
    await api.get('/auth/session'); assert.equal(requests.at(-1).params, undefined);
    globalThis.window.location.search = '';
    await api.get('/metrics'); assert.equal(requests.at(-1).params.env, 'all');
    assert.equal(requests.at(-1).headers.get('X-Team-Filter'), 'all');
  } finally { api.defaults.adapter = previousAdapter; globalThis.window = previousWindow; }
});

test('filter discovery sends only supported query fields and keeps scope in headers', async () => {
  const previousWindow = globalThis.window, previousAdapter = api.defaults.adapter;
  globalThis.window = { location: { search: '?env=dev&team=backend', pathname: '/org/demo/metrics' } } as any;
  const options = { services: ['api'], environments: ['dev'], statuses: [] };
  api.defaults.adapter = async config => {
    assert.deepEqual(Object.keys(config.params).sort(), ['from', 'source', 'to']);
    assert.equal(config.headers.get('X-Environment-Filter'), 'dev');
    assert.equal(config.headers.get('X-Team-Filter'), 'backend');
    return { data: { data: options }, status: 200, statusText: 'OK', headers: {}, config };
  };
  try {
    assert.deepEqual(await getFilterOptions({ source: 'metrics', from: '2026-10-14T12:00:00Z', to: '2026-10-14T13:00:00Z' }), options);
    assert.equal(filterOptionsSource('/org/demo/metrics'), 'metrics');
    assert.equal(filterOptionsSource('/org/demo/infrastructure'), 'all');
    assert.equal(filterOptionsSource('/org/demo/admin'), 'all');
  } finally { api.defaults.adapter = previousAdapter; globalThis.window = previousWindow; }
});
