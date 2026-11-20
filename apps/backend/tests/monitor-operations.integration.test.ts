import assert from 'node:assert/strict';
import { test } from 'node:test';
import { unifiedMonitorApp } from './helpers/unified-monitor-app';

test('team routing, maintenance, alert triage, and overview work together over HTTP', async context => {
  const destination = 'https://monitors.example.test/ops';
  const nextDestination = 'https://monitors.example.test/next';
  const original = globalThis.fetch;
  const deliveries: { url: string; body: Record<string, unknown> }[] = [];
  context.mock.method(globalThis, 'fetch', (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url !== destination && url !== nextDestination) return original(input, init);
    deliveries.push({ url, body: JSON.parse(String(init?.body)) });
    return Promise.resolve(new Response(null, { status: 204 }));
  });
  const app = await unifiedMonitorApp({ MONITOR_TEAM_DESTINATIONS: JSON.stringify({ demo: { ops: destination, next: nextDestination } }) });
  try {
    const admin = await app.login('demo');
    const foreign = await app.login('other');
    await exercise(app, admin, foreign, deliveries);
  } finally { await app.app.close(); }
});

async function exercise(app: Awaited<ReturnType<typeof unifiedMonitorApp>>, admin: string, foreign: string,
  deliveries: { url: string; body: Record<string, unknown> }[]) {
  const path = '/admin/teams/platform';
  const call = async (route: string, method = 'GET', body?: unknown, cookie = admin) => app.call(route, method, body, cookie);
  const json = async (route: string, method = 'GET', body?: unknown) => {
    const response = await call(route, method, body);
    const data = await response.json();
    assert.ok(response.ok, JSON.stringify(data));
    return data;
  };
  await json('/admin/teams', 'POST', { id: 'platform', name: 'Platform' });
  app.store.saveServiceMetadata('demo', 'api', { serviceName: 'api', team: 'platform' });
  app.store.createIngestionKey({ id: 'synthetic', orgSlug: 'demo', teamId: 'platform', name: 'API telemetry',
    keyHash: 'synthetic-digest', createdAt: Date.now(), expiresAt: Date.now() + 86_400_000 });
  assert.equal((await call(path + '/overview', 'GET', undefined, foreign)).status, 404);
  assert.equal((await call(path + '/notifications', 'PATCH', { destination: 'missing' })).status, 400);
  await json(path + '/notifications', 'PATCH', { destination: 'ops' });
  const receipt = await json(path + '/notifications/test', 'POST');
  assert.equal(receipt.status, 'SENT');
  assert.equal(deliveries[0].body.type, 'monitor.test');
  assert.equal((await call(path + '/notifications/test', 'POST')).status, 409);
  assert.equal((await json(path + '/notifications')).tests[0].id, receipt.id);

  const window = await json('/admin/maintenance', 'POST', { name: 'Deploy API', service: 'api', team_id: 'platform',
    starts_at: new Date(Date.now() - 1000).toISOString(), ends_at: new Date(Date.now() + 300_000).toISOString() });
  const monitor = await json('/monitors', 'POST', { name: 'API error logs', signal_type: 'LOG', query: '', aggregation: 'COUNT',
    comparator: 'GT', threshold: 10, window_seconds: 300, service: 'api' });
  const evaluate = () => json('/monitors/' + monitor.id + '/evaluate', 'POST');
  const history = async () => (await json('/alerts?monitor_id=' + monitor.id + '&team_id=platform')).items;
  await evaluate();
  const [first] = await history();
  assert.equal(first.state, 'FIRING');
  assert.equal(first.team_id, 'platform');
  assert.equal(first.notification.reason, 'MAINTENANCE');
  assert.equal(deliveries.length, 1);
  await json('/admin/maintenance/' + window.id + '/cancel', 'POST');
  app.state.value = 0;
  await evaluate();
  assert.equal((await history())[0].notification.reason, 'UNPAIRED_RECOVERY');
  app.state.value = 12;
  await evaluate();
  const [firing] = await history();
  assert.equal(firing.notification.status, 'SENT');
  assert.equal(firing.notification.destination, 'ops');
  assert.equal(deliveries.at(-1)?.url, 'https://monitors.example.test/ops');

  const triagePath = '/alerts/' + firing.id + '/triage';
  assert.equal((await call(triagePath, 'GET', undefined, foreign)).status, 404);
  const member = await json('/admin/users', 'POST', { email: 'member@example.test', role: 'user', teamId: 'platform', password: 'fixture-member-password' });
  const login = await app.call('/auth/login', 'POST', { tenantSlug: 'demo', email: member.email, password: 'fixture-member-password' });
  assert.equal(login.status, 201);
  const memberCookie = login.headers.get('set-cookie')!.split(';')[0];
  const details = await (await call(triagePath, 'GET', undefined, memberCookie)).json();
  assert.deepEqual(details.assignees, [{ id: member.id, email: member.email }]);
  const claim = await call(triagePath, 'PATCH', { version: 0, action: 'assign', assignee_id: member.id }, memberCookie);
  assert.equal(claim.status, 200);
  assert.equal((await claim.json()).assignee.id, member.id);
  assert.equal((await call(triagePath, 'PATCH', { version: 0, action: 'note', note: 'Old tab' })).status, 409);
  await json(triagePath, 'PATCH', { version: 1, action: 'acknowledge' });
  const noted = await json(triagePath, 'PATCH', { version: 2, action: 'note', note: 'Inspecting deployment logs.' });
  assert.equal(noted.notes[0].text, 'Inspecting deployment logs.');
  const overview = await json(path + '/overview');
  assert.deepEqual(overview.services, ['api']);
  assert.equal(overview.monitors[0].firing, true);
  assert.deepEqual(Object.keys(overview.ingestion_keys[0]).sort(), ['expiresAt', 'id', 'name']);

  await json(path + '/notifications', 'PATCH', { destination: 'next' });
  app.state.value = 0;
  await evaluate();
  const [recovered] = await history();
  assert.equal(recovered.state, 'RECOVERED');
  assert.equal(recovered.notification.destination, 'ops');
  assert.equal(deliveries.at(-1)?.url, 'https://monitors.example.test/ops');
  assert.equal((await json(triagePath)).triage.acknowledgment.by, 'admin@example.com');
  assert.equal((await json(path + '/overview')).monitors[0].firing, false);
}
