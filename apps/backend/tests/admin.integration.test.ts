import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../dist/modules/auth/auth.module.js';
import { MonitorsController } from '../dist/modules/auth/monitors.controller.js';
import { PlatformStore } from '../dist/modules/auth/platform-store.service.js';
import { ValidationPipe } from '../dist/common/pipes/validation.pipe.js';
import { hashPassword } from '../dist/modules/auth/password.js';

// Run after the backend TypeScript build: tests exercise emitted Nest DI metadata and HTTP routing.
test('HTTP login, admin CRUD, member authorization, monitor filters and session revocation', async () => {
  const password = 'integration-password';
  const hash = await hashPassword(password);
  const settings = { AUTH_DB_PATH: ':memory:', AUTH_JWT_SECRET: 'integration-only-secret-at-least-32-characters',
    cors: { origin: ['http://localhost:5000'] }, AUTH_USERS_JSON: JSON.stringify([
      { email: 'admin@example.com', tenantSlug: 'demo', role: 'admin', passwordHash: hash },
      { email: 'admin@example.com', tenantSlug: 'other', role: 'admin', passwordHash: hash },
    ]) };
  class TestApplication {}
  Module({ imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true,
    skipProcessEnv: true, load: [() => settings] }), AuthModule], controllers: [MonitorsController] })(TestApplication);
  const app = await NestFactory.create(TestApplication, { logger: false });
  app.useGlobalPipes(new ValidationPipe());
  await app.listen(0, '127.0.0.1');
  const base = await app.getUrl();
  const call = (path: string, method = 'GET', body?: unknown, cookie?: string, extra = {}) => fetch(`${base}/api${path}`, {
    method, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...extra },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const login = async (tenantSlug: string, email: string, supplied = password) => {
    const response = await call('/auth/login', 'POST', { tenantSlug, email, password: supplied });
    assert.equal(response.status, 201);
    const cookie = response.headers.get('set-cookie')!;
    assert.match(cookie, /HttpOnly/); assert.match(cookie, /Secure/); assert.match(cookie, /SameSite=Lax/);
    return cookie.split(';')[0];
  };
  try {
    const admin = await login('demo', 'admin@example.com');
    const other = await login('other', 'admin@example.com');
    assert.equal((await call('/admin/users')).status, 401);
    assert.equal((await call('/admin/teams', 'POST', { id: 'platform', name: 'Platform' }, admin)).status, 201);
    assert.equal((await call('/admin/teams', 'POST', { id: 'frontend', name: 'Frontend' }, admin)).status, 201);
    assert.equal((await call('/admin/users', 'POST', { email: 'bad@example.com', role: 'superadmin', password }, admin)).status, 400);
    assert.equal((await call('/admin/users', 'POST', { email: 'member@example.com', role: 'user', password,
      teamId: 'platform', tenantSlug: 'other' }, admin)).status, 400);
    const response = await call('/admin/users', 'POST', { email: 'member@example.com', role: 'user', password,
      teamId: 'platform' }, admin);
    assert.equal(response.status, 201); const member = await response.json();
    assert.equal('passwordHash' in member, false);
    assert.equal(app.get(PlatformStore).identity('other', 'member@example.com'), undefined);
    const memberCookie = await login('demo', 'member@example.com');
    assert.equal((await call('/admin/users', 'GET', undefined, memberCookie)).status, 403);
    const session = await (await call('/auth/session', 'GET', undefined, memberCookie)).json();
    assert.deepEqual(session.teams.sort(), ['frontend', 'platform']);
    const dto = { name: 'Latency', type: 'metric', query: 'avg:latency', comparator: 'above', threshold: 10,
      evaluationWindow: '5m', teamId: 'platform', service: 'api', env: 'dev' };
    const saved = await (await call('/monitors', 'POST', dto, admin)).json();
    assert.equal(saved.status, 'No Data');
    assert.equal((await call('/monitors', 'POST', { ...dto, teamId: 'frontend', service: 'web', env: 'production' }, admin)).status, 201);
    assert.equal((await (await call('/monitors', 'GET', undefined, memberCookie)).json()).length, 2);
    const headers = { 'X-Team-Filter': 'frontend', 'X-Service-Filter': 'web', 'X-Environment-Filter': 'production' };
    assert.equal((await (await call('/monitors', 'GET', undefined, memberCookie, headers)).json()).length, 1);
    assert.equal((await (await call('/monitors', 'GET', undefined, other)).json()).length, 0);
    assert.equal((await call(`/monitors/${saved.id}`, 'DELETE', undefined, other)).status, 404);
    assert.equal((await call('/admin/teams', 'POST', { id: 'blocked', name: 'Blocked' }, admin,
      { Origin: 'https://malicious.example' })).status, 403);
    assert.equal((await call(`/admin/users/${member.id}/password`, 'PUT', { password: 'replacement-password' }, admin)).status, 200);
    assert.equal((await call('/auth/session', 'GET', undefined, memberCookie)).status, 401);
    await login('demo', 'member@example.com', 'replacement-password');
    const edited = await call(`/admin/users/${member.id}`, 'PATCH', { role: 'admin', password: 'role-change-password' }, admin);
    assert.equal(edited.status, 200);
    const promotedCookie = await login('demo', 'member@example.com', 'role-change-password');
    assert.equal((await (await call('/auth/session', 'GET', undefined, promotedCookie)).json()).role, 'admin');
    const loggedOut = await call('/auth/logout', 'POST', undefined, admin);
    assert.equal(loggedOut.status, 201); assert.match(loggedOut.headers.get('set-cookie')!, /Expires=Thu, 01 Jan 1970/);
  } finally { await app.close(); }
});
