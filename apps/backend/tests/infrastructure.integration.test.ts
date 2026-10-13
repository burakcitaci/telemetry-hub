import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { InfrastructureModule } from '../dist/modules/infrastructure/infrastructure.module.js';
import { KubernetesService } from '../dist/modules/infrastructure/kubernetes.service.js';
import { TransformInterceptor } from '../dist/common/interceptors/transform.interceptor.js';
import { AuthModule } from '../dist/modules/auth/auth.module.js';
import { hashPassword } from '../dist/modules/auth/password.js';

test('infrastructure HTTP route enforces auth and admin access and returns the bare cached host array', async () => {
  const password = 'integration-password';
  const passwordHash = await hashPassword(password);
  const settings = {
    AUTH_DB_PATH: ':memory:', AUTH_JWT_SECRET: 'integration-only-secret-at-least-32-characters',
    AUTH_USERS_JSON: JSON.stringify([
      { email: 'admin@example.com', tenantSlug: 'demo', role: 'admin', passwordHash },
      { email: 'member@example.com', tenantSlug: 'demo', role: 'user', teamId: 'platform', passwordHash },
    ]),
  };
  class TestApplication {}
  Module({ imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true,
    skipProcessEnv: true, load: [() => settings] }), AuthModule, InfrastructureModule] })(TestApplication);
  const app = await NestFactory.create(TestApplication, { logger: false });
  app.useGlobalInterceptors(new TransformInterceptor());
  let calls = 0;
  Object.assign(app.get(KubernetesService), {
    nodes: async () => { calls++; return [{ metadata: { uid: 'real-node-uid', name: 'worker' },
      status: { capacity: { cpu: '4', memory: '8Gi' }, conditions: [{ type: 'Ready', status: 'True' }] } }]; },
    metrics: async () => [{ metadata: { name: 'worker' }, usage: { cpu: '1800m', memory: '6Gi' } }],
  });
  await app.listen(0, '127.0.0.1');
  const base = await app.getUrl();
  const login = async (email: string) => {
    const result = await fetch(`${base}/api/auth/login`, { method: 'POST',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, tenantSlug: 'demo' }) });
    assert.equal(result.status, 201);
    return result.headers.get('set-cookie')!.split(';')[0];
  };
  const status = (cookie?: string) => fetch(`${base}/api/v1/infrastructure/status`, {
    headers: cookie ? { Cookie: cookie } : {},
  });
  try {
    assert.equal((await status()).status, 401);
    assert.equal((await status(await login('member@example.com'))).status, 403);
    assert.equal(calls, 0);
    const admin = await login('admin@example.com');
    const response = await status(admin);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.deepEqual(await response.json(), [{ id: 'real-node-uid', hostname: 'worker',
      status: 'ok', metrics: { cpu: 45, ram: 75, disk: 0 } }]);
    await status(admin);
    assert.equal(calls, 1);
  } finally { await app.close(); }
});
