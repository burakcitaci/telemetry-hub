import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../dist/modules/auth/auth.module.js';
import { TracesController } from '../dist/modules/telemetry/controllers/traces.controller.js';
import { ClickhouseService } from '../dist/modules/telemetry/services/clickhouse.service.js';
import { ValidationPipe } from '../dist/common/pipes/validation.pipe.js';
import { hashPassword } from '../dist/modules/auth/password.js';

test('trace detail accepts traceId and env together while enforcing strict validation and authenticated scope', async () => {
  const traceId = '5059cad5a22d742694e38e851d32f4a0', password = 'trace-integration-password';
  const passwordHash = await hashPassword(password);
  const settings = { AUTH_DB_PATH: ':memory:', AUTH_JWT_SECRET: 'trace-integration-secret-at-least-32-characters',
    AUTH_USERS_JSON: JSON.stringify(['demo', 'other'].map(tenantSlug => ({ tenantSlug, email: 'admin@example.com', role: 'admin', passwordHash }))) };
  const queries: Array<{ org: string; traceId: string; env: string }> = [];
  const clickhouse = { getTraceById: async (scope, id, env) => {
    queries.push({ org: scope.tenantSlug, traceId: id, env });
    return [{ TraceId: id, SpanId: '1234567890abcdef', ServiceName: 'dotnet-api' }];
  } };
  class TestApplication {}
  Module({ imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, skipProcessEnv: true, load: [() => settings] }), AuthModule],
    controllers: [TracesController], providers: [{ provide: ClickhouseService, useValue: clickhouse }] })(TestApplication);
  const app = await NestFactory.create(TestApplication, { logger: false });
  app.useGlobalPipes(new ValidationPipe());
  try {
    await app.listen(0, '127.0.0.1'); const base = await app.getUrl();
    const get = (path: string, cookie?: string) => fetch(`${base}/api/traces${path}`, { headers: cookie ? { Cookie: cookie } : {} });
    const login = async (tenantSlug: string) => {
      const response = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantSlug, email: 'admin@example.com', password }) });
      assert.equal(response.status, 201); return response.headers.get('set-cookie')!.split(';')[0];
    };
    assert.equal((await get(`/detail?traceId=${traceId}&env=all`)).status, 401);
    assert.equal(queries.length, 0);
    for (const org of ['demo', 'other']) {
      const cookie = await login(org);
      for (const [path, env] of [[`/detail?traceId=${traceId}&env=all`, 'all'],
        [`/detail?traceId=${traceId}`, 'all'], [`/detail?traceId=${traceId}&env=production`, 'production'],
        [`/${traceId}?env=all`, 'all']]) {
        const response = await get(path, cookie);
        assert.equal(response.status, 200, JSON.stringify(await response.clone().json()));
        assert.equal((await response.json())[0].TraceId, traceId);
        assert.deepEqual(queries.at(-1), { org, traceId, env });
      }
      const count = queries.length;
      for (const path of ['/detail?env=all', '/detail?traceId=bad&env=all',
        `/detail?traceId=${traceId}&env=bad%20environment`, `/detail?traceId=${traceId}&unexpected=1`,
        `/detail?traceId=${traceId}&traceId=${traceId}`]) assert.equal((await get(path, cookie)).status, 400);
      assert.equal(queries.length, count, 'invalid requests must never reach ClickHouse');
    }
  } finally { await app.close(); }
});
