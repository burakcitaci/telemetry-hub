import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ConfigService } from '@nestjs/config';
import { monitoringConfig } from './monitoring.config';
import { MonitorEvaluatorService } from './monitor-evaluator.service';
import type { PlatformStore } from '../auth/platform-store.service';
import type { MonitorQueryService } from './monitor-query.service';
import type { MonitoringTelemetry } from './monitoring.telemetry';
import { signalProviders } from './monitors.module';
import { MONITOR_NOTIFIER } from './notifier';
import { DummyNotifier } from './dummy-notifier';

test('monitoring startup configuration has explicit defaults and accepts environment strings', () => {
  assert.deepEqual(monitoringConfig(new ConfigService({})), { intervalMs: 30000, initialDelayMs: 1000,
    defaultWindowSeconds: 300, notifier: 'dummy', retention: { days: 30, intervalSeconds: 3600 } });
  assert.deepEqual(monitoringConfig(new ConfigService({ MONITOR_CHECK_INTERVAL_SECONDS: '60', MONITOR_INITIAL_DELAY_SECONDS: '0',
    MONITOR_DEFAULT_WINDOW_SECONDS: '600', MONITOR_ALERT_RETENTION_DAYS: '90', MONITOR_ALERT_PRUNE_INTERVAL_SECONDS: '7200' })),
  { intervalMs: 60000, initialDelayMs: 0, defaultWindowSeconds: 600, notifier: 'dummy', retention: { days: 90, intervalSeconds: 7200 } });
});

test('invalid monitoring settings fail before timers or notification providers can start', () => {
  const invalid = { MONITOR_CHECK_INTERVAL_SECONDS: [0, -1, 0.1, 2147484, '', true, 'bad'],
    MONITOR_INITIAL_DELAY_SECONDS: [-1, 2147484, false], MONITOR_DEFAULT_WINDOW_SECONDS: [0, Infinity, 8640000000001],
    MONITOR_ALERT_RETENTION_DAYS: [0, ' ', true], MONITOR_ALERT_PRUNE_INTERVAL_SECONDS: [0, 2147484], MONITOR_NOTIFIER: ['slack', '', false] };
  for (const [key, values] of Object.entries(invalid)) for (const value of values)
    assert.throws(() => monitoringConfig(new ConfigService({ [key]: value })), new RegExp(key));
  const factory = signalProviders.find(provider => provider.provide === MONITOR_NOTIFIER)!.useFactory as any;
  assert.throws(() => factory(new ConfigService({ MONITOR_NOTIFIER: 'slack' })), /MONITOR_NOTIFIER/);
  assert.ok(factory(new ConfigService({ MONITOR_NOTIFIER: 'dummy' })) instanceof DummyNotifier);
});

test('scheduler honors the configured initial delay and cadence, reports cycles and clears timers', async context => {
  context.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  let cycles = 0, measured = 0;
  const store = { registerMonitorCleanup() {}, monitorOrganizations: () => { cycles++; return []; } } as unknown as PlatformStore;
  const telemetry = { cycle: () => { measured++; } } as unknown as MonitoringTelemetry;
  const service = new MonitorEvaluatorService(store, {} as MonitorQueryService, undefined,
    new ConfigService({ MONITOR_CHECK_INTERVAL_SECONDS: 5, MONITOR_INITIAL_DELAY_SECONDS: 2 }), telemetry);
  service.onModuleInit();
  context.mock.timers.tick(1999); assert.equal(cycles, 0);
  context.mock.timers.tick(1); assert.equal(cycles, 1); assert.equal(measured, 1);
  context.mock.timers.tick(3000); assert.equal(cycles, 2); assert.equal(measured, 2);
  assert.equal(service.overdueAfterMs, 15000);
  await service.onModuleDestroy(); context.mock.timers.tick(10000); assert.equal(cycles, 2);
});
