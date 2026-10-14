import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from '../dist/modules/auth/auth.module.js';
import { MonitorsController } from '../dist/modules/auth/monitors.controller.js';
import { MonitorEvaluatorService } from '../dist/modules/monitors/monitor-evaluator.service.js';
import { MonitorQueryService } from '../dist/modules/monitors/monitor-query.service.js';
import { ClickhouseService } from '../dist/modules/telemetry/services/clickhouse.service.js';
import { ValidationPipe } from '../dist/common/pipes/validation.pipe.js';
import { hashPassword } from '../dist/modules/auth/password.js';

test('HTTP monitor authoring, preview, evaluation, mute and org isolation use real Nest DI and strict DTOs', async () => {
  const password = 'monitor-integration-password';
  const passwordHash = await hashPassword(password);
  const settings = { AUTH_DB_PATH: ':memory:', AUTH_JWT_SECRET: 'monitor-integration-secret-at-least-32-characters',
    AUTH_USERS_JSON: JSON.stringify(['demo', 'other'].map(tenantSlug =>
      ({ tenantSlug, email: 'admin@example.com', role: 'admin', passwordHash }))) };
  let fail = false, empty = false;
  const scopes: string[] = [];
  const clickhouse = new ClickhouseService({} as any, new ConfigService());
  clickhouse.onModuleInit = async () => {};
  clickhouse.onModuleDestroy = async () => {};
  clickhouse.executeTenantQuery = async (scope, sql, params) => {
    scopes.push(scope.tenantSlug); assert.equal(params?.tenant, scope.tenantSlug);
    assert.match(sql, /org_slug = \{tenant:String\}/);
    if (fail) throw new Error('Private database detail');
    return (empty ? [] : [{ groupKey: '[]', sampleCount: 20, matchCount: 12, value: 12, unit: 'logs', unitCount: 1 }]) as any;
  };
  class TestApplication {}
  Module({ imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, skipProcessEnv: true,
    load: [() => settings] }), AuthModule], controllers: [MonitorsController], providers: [MonitorEvaluatorService,
    MonitorQueryService, { provide: ClickhouseService, useValue: clickhouse }] })(TestApplication);
  const app = await NestFactory.create(TestApplication, { logger: false });
  app.useGlobalPipes(new ValidationPipe()); await app.listen(0, '127.0.0.1');
  const base = await app.getUrl();
  const call = (path: string, method = 'GET', body?: unknown, cookie?: string) => fetch(`${base}/api${path}`, {
    method, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const login = async (tenantSlug: string) => {
    const response = await call('/auth/login', 'POST', { tenantSlug, email: 'admin@example.com', password });
    assert.equal(response.status, 201); return response.headers.get('set-cookie')!.split(';')[0];
  };
  try {
    const cookie = await login('demo'), foreign = await login('other');
    const rule = { name: 'Errors', type: 'log', query: '*', aggregation: 'count', comparator: 'above',
      threshold: 10, warnThreshold: 5, evaluationWindow: '5m', signalStatus: 'ERROR' };
    assert.equal((await call('/monitors', 'POST', rule)).status, 401);
    assert.equal((await call('/monitors', 'POST', { ...rule, status: 'OK' }, cookie)).status, 400);
    assert.equal((await call('/monitors', 'POST', { ...rule, evaluationWindow: 'invalid' }, cookie)).status, 400);
    const preview = await call('/monitors/preview', 'POST', rule, cookie);
    assert.equal(preview.status, 201); assert.equal((await preview.json()).status, 'Alert');
    assert.deepEqual(await (await call('/monitors', 'GET', undefined, cookie)).json(), []);
    const measured = await call('/monitors', 'POST', { ...rule, query: 'max(custom.value)' }, cookie);
    assert.equal(measured.status, 201);
    const savedMeasure = await measured.json();
    assert.equal(savedMeasure.logAttribute, 'custom.value'); assert.equal(savedMeasure.aggregation, 'max');
    assert.equal(savedMeasure.query, '*');
    const reread = await (await call('/monitors', 'GET', undefined, cookie)).json();
    assert.equal(reread.find((item: any) => item.id === savedMeasure.id).logAttribute, 'custom.value');
    assert.equal((await call('/monitors/preview', 'POST', { ...rule, logAttribute: 'custom.value', aggregation: 'max' }, cookie)).status, 201);
    assert.equal((await call('/monitors/preview', 'POST', { ...rule, query: '@custom.value:>bad' }, cookie)).status, 400);
    assert.equal((await call('/monitors/preview', 'POST', { ...rule, logAttribute: 'custom.value', aggregation: 'max', noDataPolicy: 'zero' }, cookie)).status, 400);
    await call(`/monitors/${savedMeasure.id}`, 'DELETE', undefined, cookie);
    const created = await (await call('/monitors', 'POST', rule, cookie)).json();
    const evaluated = await (await call(`/monitors/${created.id}/evaluate`, 'POST', undefined, cookie)).json();
    assert.equal(evaluated.status, 'Alert'); assert.equal(evaluated.value, 12); assert.ok(evaluated.lastEvaluatedAt);
    assert.ok(evaluated.history.length); assert.ok(evaluated.events.length);
    const edited = await call(`/monitors/${created.id}`, 'PUT', { ...rule, name: 'Renamed rule', threshold: 30 }, cookie);
    assert.equal(edited.status, 200);
    const preserved = await edited.json();
    assert.ok(preserved.history.length >= evaluated.history.length);
    assert.equal(preserved.history[0].t, evaluated.history[0].t);
    assert.ok(preserved.events.length >= evaluated.events.length);
    const chartTo = new Date(), chartFrom = new Date(chartTo.getTime() - 30 * 60_000);
    const path = `/monitors/${created.id}/history?from=${chartFrom.toISOString()}&to=${chartTo.toISOString()}`;
    const beforeHistory = await (await call('/monitors', 'GET', undefined, cookie)).json();
    const chart = await call(path, 'GET', undefined, cookie);
    assert.equal(chart.status, 200); assert.equal((await chart.json()).points.length, 6);
    assert.equal((await call(path, 'GET', undefined, foreign)).status, 404);
    assert.equal((await call(`/monitors/${created.id}/history?from=bad&to=bad`, 'GET', undefined, cookie)).status, 400);
    const afterHistory = await (await call('/monitors', 'GET', undefined, cookie)).json();
    assert.deepEqual(afterHistory, beforeHistory);
    assert.equal((await call(`/monitors/${created.id}/evaluate`, 'POST', undefined, foreign)).status, 404);
    assert.equal((await call(`/monitors/${created.id}/mute`, 'POST', { isMuted: true }, cookie)).status, 201);
    empty = true;
    assert.equal((await (await call(`/monitors/${created.id}/evaluate`, 'POST', undefined, cookie)).json()).status, 'No Data');
    fail = true;
    const failed = await (await call(`/monitors/${created.id}/evaluate`, 'POST', undefined, cookie)).json();
    assert.equal(failed.status, 'Unknown'); assert.doesNotMatch(failed.evaluationError, /Private database detail/);
    assert.ok(scopes.every(scope => scope === 'demo'));
    assert.equal((await call(`/monitors/${created.id}`, 'DELETE', undefined, cookie)).status, 200);
  } finally { await app.close(); }
});
