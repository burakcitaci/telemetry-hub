import assert from 'node:assert/strict';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from '../../dist/modules/auth/auth.module.js';
import { PlatformStore } from '../../dist/modules/auth/platform-store.service.js';
import { MonitorsController } from '../../dist/modules/auth/monitors.controller.js';
import { MonitorEvaluatorService } from '../../dist/modules/monitors/monitor-evaluator.service.js';
import { MonitorQueryService } from '../../dist/modules/monitors/monitor-query.service.js';
import { MonitoringService } from '../../dist/modules/monitors/monitoring.service.js';
import { AlertsController } from '../../dist/modules/monitors/alerts.controller.js';
import { AlertRetentionService } from '../../dist/modules/monitors/alert-retention.service.js';
import { ClickhouseService } from '../../dist/modules/telemetry/services/clickhouse.service.js';
import { ValidationPipe } from '../../dist/common/pipes/validation.pipe.js';
import { hashPassword } from '../../dist/modules/auth/password.js';
import { signalProviders } from '../../dist/modules/monitors/monitors.module.js';
import { MONITOR_NOTIFIER } from '../../dist/modules/monitors/notifier.js';

export async function unifiedMonitorApp(overrides: Record<string, unknown> = {}) {
  const password = 'monitor-http-password', passwordHash = await hashPassword(password);
  const settings = { AUTH_DB_PATH: ':memory:', AUTH_JWT_SECRET: 'unified-monitor-integration-secret-at-least-32',
    AUTH_USERS_JSON: JSON.stringify(['demo', 'other'].map(tenantSlug => ({ tenantSlug, email: 'admin@example.com', role: 'admin', passwordHash }))), ...overrides };
  const state = { value: 12, overflow: false, fail: false, queries: 0 };
  const notifications: any[] = [];
  const clickhouse = new ClickhouseService({ error() {} } as any, new ConfigService());
  clickhouse.onModuleInit = async () => {}; clickhouse.onModuleDestroy = async () => {};
  clickhouse.executeTenantQuery = async (scope, sql, params) => {
    state.queries++; assert.equal(params?.tenant, scope.tenantSlug); assert.match(sql, /org_slug = \{tenant:String\}/);
    if (state.fail) throw new Error('private database error');
    if (sql.includes('AS kind')) return [{ kind: 'histogram', samples: 1, unit: 'ms', unitCount: 1 }] as any;
    if (sql.includes('AS bound')) return [{ bound: state.overflow ? null : state.value, weight: 100, invalid: 0, units: ['ms'] }] as any;
    if (sql.includes('AS groupKey')) return [{ groupKey: '[]', sampleCount: 1, matchCount: 1, value: state.value, unit: 'logs', unitCount: 1 }] as any;
    return [{ samples: 1, value: state.value, unitCount: 1 }] as any;
  };
  class TestApplication {}
  Module({ imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, skipProcessEnv: true, load: [() => settings] }), AuthModule],
    controllers: [MonitorsController, AlertsController], providers: [MonitorEvaluatorService, MonitorQueryService, MonitoringService,
      AlertRetentionService, ...signalProviders, { provide: ClickhouseService, useValue: clickhouse },
      { provide: MONITOR_NOTIFIER, useValue: { notify: async event => { notifications.push(event); } } },
    ] })(TestApplication);
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
  return { app, call, login, state, notifications, store: app.get(PlatformStore) };
}
