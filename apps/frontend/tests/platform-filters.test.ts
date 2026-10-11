import assert from 'node:assert/strict';
import { test } from 'node:test';
import { platformFilterKey, platformFilterSearch, readPlatformFilters } from '../src/shared/lib/platform-filters';
import { api } from '../src/shared/api/client';

test('no implicit team or environment boundary, and explorer facets do not become global service filters', () => {
  assert.deepEqual(readPlatformFilters(''), { team: undefined, service: undefined, env: 'all' });
  assert.deepEqual(readPlatformFilters('?service=local-service&env=all&team=all'), { team: undefined, service: undefined, env: 'all' });
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
