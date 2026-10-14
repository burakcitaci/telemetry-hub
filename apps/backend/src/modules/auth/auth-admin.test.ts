import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PlatformStore } from './platform-store.service';
import { AdminService, OrgAdminGuard } from './admin.service';
import { AuthService } from './auth.service';
import { TenantJwtGuard } from './tenant-jwt.guard';
import { MonitorsController } from './monitors.controller';
import { ClickhouseService } from '../telemetry/services/clickhouse.service';
import { MetricsService } from '../telemetry/services/metrics.service';
import { hashPassword, passwordMatches } from './password';

const config = () => new ConfigService({ AUTH_DB_PATH: ':memory:', cors: { origin: ['http://localhost:5000'] } });
function context(request: any): any { return { switchToHttp: () => ({ getRequest: () => request }) }; }
function request(token: string, headers: Record<string, string> = {}) {
  return { method: 'GET', query: {}, headers: { cookie: `telemetry_session=${token}` },
    header: (key: string) => headers[key.toLowerCase()] } as any;
}

test('password hashing, normalization, organization boundary and public user responses', async () => {
  const store = new PlatformStore(config()); const admin = new AdminService(store);
  try {
    store.createTeam('demo', { id: 'platform', name: 'Platform' });
    const user = await admin.createUser('demo', { email: 'Member@example.com', role: 'user', teamId: 'platform', password: 'a-strong-password' });
    assert.equal(user.email, 'member@example.com'); assert.equal('passwordHash' in user, false);
    assert.equal(await passwordMatches('a-strong-password', store.user('demo', user.id)!.passwordHash), true);
    assert.equal(await passwordMatches('incorrect-password', store.user('demo', user.id)!.passwordHash), false);
    assert.equal(store.user('another-org', user.id), undefined);
    assert.throws(() => admin.updateUser('another-org', user.id, { role: 'admin' }));
    await assert.rejects(admin.createUser('other', { email: 'x@example.com', role: 'user', teamId: 'platform', password: 'a-strong-password' }));
    assert.throws(() => store.deleteTeam('demo', 'platform'));
  } finally { store.onModuleDestroy(); }
});

test('member session sees all org teams; guard rejects revoked sessions after password and role changes', async () => {
  const settings = config(); const store = new PlatformStore(settings); const admin = new AdminService(store);
  const jwt = new JwtService({ secret: 'test-only-secret-at-least-32-characters', signOptions: { expiresIn: '8h' } });
  const auth = new AuthService(store, jwt); const guard = new TenantJwtGuard(jwt, store, settings);
  try {
    store.createTeam('demo', { id: 'platform', name: 'Platform' }); store.createTeam('demo', { id: 'frontend', name: 'Frontend' });
    const user = await admin.createUser('demo', { email: 'user@example.com', role: 'user', password: 'a-strong-password' });
    const credentials = { tenantSlug: 'demo', email: user.email, password: 'a-strong-password' };
    const signed = await auth.login(credentials);
    const claims = await jwt.verifyAsync(signed.token);
    assert.equal(store.isSessionActive(claims), true);
    assert.deepEqual(signed.session.teams.sort(), ['frontend', 'platform']);
    const req = request(signed.token, { 'x-team-filter': 'frontend', 'x-service-filter': 'api', 'x-environment-filter': 'dev' });
    assert.equal(await guard.canActivate(context(req)), true);
    assert.equal(req.tenant, 'demo'); assert.equal(req.userRole, 'user'); assert.equal(req.teamFilter, 'frontend');
    assert.equal(req.serviceFilter, 'api'); assert.equal(req.envFilter, 'dev');
    assert.throws(() => new OrgAdminGuard().canActivate(context(req)));
    await admin.resetPassword('demo', user.id, 'replacement-password');
    assert.equal(store.isSessionActive(claims), false);
    await assert.rejects(guard.canActivate(context(request(signed.token))));
    await assert.rejects(auth.login(credentials));
    const next = await auth.login({ ...credentials, password: 'replacement-password' });
    admin.updateUser('demo', user.id, { role: 'admin' });
    await assert.rejects(guard.canActivate(context(request(next.token))));
  } finally { store.onModuleDestroy(); }
});

test('logout revokes copied tokens and failed logins are bounded per identity source', async () => {
  const settings = config(); const store = new PlatformStore(settings); const admin = new AdminService(store);
  const jwt = new JwtService({ secret: 'test-only-secret-at-least-32-characters', signOptions: { expiresIn: '8h' } });
  const auth = new AuthService(store, jwt);
  try {
    const user = await admin.createUser('demo', { email: 'user@example.com', role: 'user', password: 'a-strong-password' });
    const credentials = { tenantSlug: 'demo', email: user.email, password: 'wrong-password' };
    for (let attempt = 0; attempt < 5; attempt += 1) await assert.rejects(auth.login(credentials, '127.0.0.1'));
    await assert.rejects(auth.login(credentials, '127.0.0.1'), error => (error as any).getStatus() === 429);
    const signed = await auth.login({ ...credentials, password: 'a-strong-password' }, '127.0.0.2');
    const claims = await jwt.verifyAsync(signed.token);
    assert.equal(store.isSessionActive(claims), true);
    auth.logout(claims);
    assert.equal(store.isSessionActive(claims), false);
  } finally { store.onModuleDestroy(); }
});

test('last admin protection and mutations from untrusted origins', async () => {
  const settings = config(); const store = new PlatformStore(settings); const admin = new AdminService(store);
  const jwt = new JwtService({ secret: 'test-only-secret-at-least-32-characters', signOptions: { expiresIn: '8h' } });
  try {
    const user = await admin.createUser('demo', { email: 'admin@example.com', role: 'admin', password: 'a-strong-password' });
    assert.throws(() => admin.deleteUser('demo', user.id));
    assert.throws(() => admin.updateUser('demo', user.id, { role: 'user' }));
    const auth = new AuthService(store, jwt);
    const { token } = await auth.login({ email: user.email, tenantSlug: 'demo', password: 'a-strong-password' });
    const req = request(token, { origin: 'https://malicious.example' }); req.method = 'POST';
    await assert.rejects(new TenantJwtGuard(jwt, store, settings).canActivate(context(req)));
    const invalid = request(token, { 'x-team-filter': 'unsafe team' });
    await assert.rejects(new TenantJwtGuard(jwt, store, settings).canActivate(context(invalid)));
  } finally { store.onModuleDestroy(); }
});

test('SQLite restart preserves changes and does not resurrect deleted bootstrap users or teams', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'telemetry-admin-test-'));
  const passwordHash = await hashPassword('a-strong-password');
  const settings = new ConfigService({ AUTH_DB_PATH: join(directory, 'platform.sqlite'), AUTH_USERS_JSON: JSON.stringify([
    { tenantSlug: 'demo', email: 'admin@example.com', role: 'admin', passwordHash, teams: ['platform'] },
    { tenantSlug: 'demo', email: 'member@example.com', role: 'user', passwordHash },
  ]) });
  let store = new PlatformStore(settings);
  try {
    const admin = new AdminService(store);
    const firstId = store.identity('demo', 'admin@example.com')!.id;
    admin.deleteUser('demo', store.identity('demo', 'member@example.com')!.id);
    store.deleteTeam('demo', 'platform'); store.createTeam('demo', { id: 'new', name: 'New' });
    await admin.resetPassword('demo', firstId, 'replacement-password');
    store.onModuleDestroy(); store = new PlatformStore(settings);
    assert.equal(store.identity('demo', 'admin@example.com')!.id, firstId);
    assert.equal(await passwordMatches('replacement-password', store.identity('demo', 'admin@example.com')!.passwordHash), true);
    assert.equal(store.identity('demo', 'member@example.com'), undefined);
    assert.deepEqual(store.teams('demo').map(team => team.id), ['new']);
  } finally { store.onModuleDestroy(); rmSync(directory, { recursive: true }); }
});

test('mandatory organization SQL and opt-in team/service/environment filters are identical for both roles', () => {
  const clickhouse = new ClickhouseService({} as any, new ConfigService());
  for (const role of ['admin', 'user'] as const) {
    const base = { tenantSlug: 'demo', role, teamId: 'own-team' };
    assert.equal(clickhouse.buildTenantFilter(base).where, 'WHERE org_slug = {tenant:String}');
    const filtered = clickhouse.buildTenantFilter({ ...base, teamFilter: 'other-team', serviceFilter: 'api', envFilter: 'dev' });
    assert.match(filtered.where, /org_slug = \{tenant:String\} AND team_id = \{teamId:String\}/);
    assert.match(filtered.where, /ServiceName = \{filterService:String\}/);
    assert.deepEqual(filtered.params, { tenant: 'demo', teamId: 'other-team', filterService: 'api', filterEnv: 'dev' });
  }
});

test('monitors are persistent organization-owned configurations with all three optional filters', () => {
  const store = new PlatformStore(config()); const controller = new MonitorsController(store, new AdminService(store));
  try {
    store.createTeam('demo', { id: 'platform', name: 'Platform' });
    const scope = { tenantSlug: 'demo', role: 'user' as const };
    const dto = { name: 'Latency', type: 'metric', query: 'avg:latency', comparator: 'above', threshold: 10,
      evaluationWindow: '5m', teamId: 'platform', service: 'api', env: 'dev' };
    const first = controller.create(scope, dto);
    controller.create(scope, { ...dto, name: 'Other', service: 'worker', env: 'production', teamId: undefined });
    assert.equal(controller.list(scope).length, 2);
    assert.equal(controller.list({ ...scope, teamFilter: 'platform', serviceFilter: 'api', envFilter: 'dev' }).length, 1);
    assert.equal(controller.list({ tenantSlug: 'other', role: 'admin' }).length, 0);
    assert.throws(() => controller.delete({ tenantSlug: 'other', role: 'admin' }, first.id));
    assert.equal(first.status, 'No Data'); assert.equal('tenantSlug' in first, false);
  } finally { store.onModuleDestroy(); }
});

test('generated SQL for logs, traces, services, live signals and all metric detail tables carries the same scope', async () => {
  const captured: any[] = [];
  const logger = { log() {}, warn() {}, error() {} } as any;
  const clickhouse = new ClickhouseService(logger, new ConfigService());
  (clickhouse as any).tenantSchemaReady = Promise.resolve();
  (clickhouse as any).client = { query: async (options: any) => {
    captured.push(options); return { json: async () => [] };
  } };
  const metrics = new MetricsService(clickhouse, logger);
  const window = { from: '2026-10-11T12:00:00Z', to: '2026-10-11T13:00:00Z', env: 'all' };
  for (const role of ['admin', 'user'] as const) {
    for (const selected of [false, true]) {
      captured.length = 0;
      const scope = { tenantSlug: 'demo', role, teamId: 'own-team', ...(selected ?
        { teamFilter: 'frontend', serviceFilter: 'api', envFilter: 'dev' } : {}) };
      await clickhouse.getLogs(scope, window); await clickhouse.getTraces(scope, { env: 'all' });
      await clickhouse.getTraceById(scope, 'trace', 'all'); await clickhouse.getServices(scope, 'all');
      await clickhouse.getServiceMetrics(scope, 'api', window);
      await clickhouse.getRecentTraceSignal(scope, { since: new Date(window.from), until: new Date(window.to) });
      await clickhouse.getRecentLogSignal(scope, { since: new Date(window.from), until: new Date(window.to) });
      await metrics.getMetricDetail(scope, 'api', 'http.requests', 100, window);
      assert.equal(captured.length, 10);
      for (const options of captured) {
        assert.match(options.query, /org_slug = \{tenant:String\}/);
        assert.equal(options.query_params.tenant, 'demo');
        assert.equal(options.query.includes('team_id = {teamId:String}'), selected);
        assert.equal(options.query.includes('ServiceName = {filterService:String}'), selected);
        assert.equal(options.query.includes("ResourceAttributes['deployment.environment.name'] = {filterEnv:String}"), selected);
        if (selected) assert.equal(options.query_params.teamId, 'frontend');
      }
      await assert.rejects(clickhouse.executeTenantQuery(scope, 'SELECT * FROM otel_logs'));
    }
  }
});
