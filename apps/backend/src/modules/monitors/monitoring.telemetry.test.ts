import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { MetricReader, MeterProvider } from '@opentelemetry/sdk-metrics';
import type { Logger } from '@opentelemetry/api-logs';
import type { Tracer } from '@opentelemetry/api';
import { currentTelemetryScope, telemetryScopeForSpan } from '../../common/telemetry/tenant-context';
import { MonitoringTelemetry } from './monitoring.telemetry';
import { SignalEvaluator } from './signal-evaluator';
import { SqliteMonitorRepository } from './sqlite-monitor.repository';
import { NoDataError, SIGNAL_TYPES } from './signal-adapter';
import type { AlertEvent, Monitor } from './monitor.model';

class TestReader extends MetricReader {
  protected async onShutdown() {} protected async onForceFlush() {}
}
const rule: Monitor = { id: 'private-id', schemaVersion: 2, configurationVersion: 1, name: 'private-name',
  query: 'private-query', signal_type: 'LOG', aggregation: 'COUNT', threshold: 10, comparator: 'GT',
  window_seconds: 300, enabled: true, created_at: '2026-10-15T12:00:00Z' };
const event: AlertEvent = { id: 'private-event', monitor_id: rule.id, monitor_name: rule.name, signal_type: 'LOG',
  state: 'FIRING', value: 12, threshold: 10, comparator: 'GT', window_seconds: 300, unit: 'logs',
  estimated: false, fired_at: rule.created_at, transition_revision: 1 };

function fixture() {
  const reader = new TestReader(), provider = new MeterProvider({ readers: [reader] });
  const records: any[] = [], spans: any[] = [];
  const logger = { emit: record => records.push({ ...record, scope: currentTelemetryScope() }) } as Logger;
  const tracer = { startActiveSpan: (_name, action) => {
    const span = { attributes: {}, ended: false, setAttributes(values) { this.attributes = values; },
      setStatus(status) { this.status = status; }, end() { this.ended = true; this.scope = telemetryScopeForSpan(this); } };
    spans.push(span); return action(span);
  } } as unknown as Tracer;
  let now = 0;
  const telemetry = new MonitoringTelemetry(provider.getMeter('monitoring'), logger, tracer, () => now);
  const collect = async () => (await reader.collect()).resourceMetrics.scopeMetrics.flatMap(scope => scope.metrics);
  return { provider, telemetry, records, spans, collect, advance: () => { now += 250; } };
}

test('all monitoring metrics have a literal reviewed label-key and bounded-value allowlist', async () => {
  const f = fixture();
  try {
    for (const signal_type of SIGNAL_TYPES) await f.telemetry.run('tenant-private', { ...rule, signal_type }, async () => {
      for (const outcome of ['OK', 'NO_DATA', 'ERROR', 'STALE', 'CANCELLED'] as const) f.telemetry.evaluated({ ...rule, signal_type }, outcome);
      for (const state of ['FIRING', 'RECOVERED'] as const) f.telemetry.transition({ ...event, signal_type, state });
      for (const status of ['SENT', 'FAILED'] as const) f.telemetry.notification({ ...event, signal_type }, status);
      f.advance();
    });
    f.telemetry.cycle(0);
    const schema = { 'monitoring.evaluation.duration': ['signal_type'], 'monitoring.cycle.duration': [],
      'monitoring.evaluations': ['outcome', 'signal_type'], 'monitoring.evaluation.errors': ['signal_type'],
      'monitoring.alerts': ['signal_type', 'state'], 'monitoring.notifications': ['signal_type', 'status'] };
    const values = { signal_type: ['LOG', 'METRIC', 'TRACE'], outcome: ['OK', 'NO_DATA', 'ERROR', 'STALE', 'CANCELLED'],
      state: ['FIRING', 'RECOVERED'], status: ['SENT', 'FAILED'] };
    const metrics = await f.collect();
    assert.deepEqual(metrics.map(metric => metric.descriptor.name).sort(), Object.keys(schema).sort());
    for (const metric of metrics) for (const point of metric.dataPoints) {
      assert.deepEqual(Object.keys(point.attributes).sort(), schema[metric.descriptor.name]);
      for (const [key, value] of Object.entries(point.attributes)) assert.ok(values[key].includes(value), `${key}: ${value}`);
    }
    const duration = metrics.find(metric => metric.descriptor.name === 'monitoring.evaluation.duration')!;
    assert.equal(duration.descriptor.unit, 's');
    assert.ok(duration.dataPoints.every(point => (point.value as any).sum === 0.25));
    assert.doesNotMatch(JSON.stringify(metrics), /tenant-private|private-id|private-query|private-name|private-event/);
    assert.equal(currentTelemetryScope(), undefined);
  } finally { await f.provider.shutdown(); }
});

test('real concurrent evaluations count only committed transitions and actual delivery attempts', async () => {
  const f = fixture(), db = new DatabaseSync(':memory:'), repository = new SqliteMonitorRepository(db);
  repository.save('demo', rule);
  let value = 12, unavailable = false, failing = false, failNotify = false, notified = 0;
  const adapter = { aggregate: async () => value, measure: async () => {
    f.advance(); await Promise.resolve();
    if (unavailable) throw new NoDataError('absent'); if (failing) throw new Error('private-database-secret');
    return { value, unit: 'logs', estimated: false, warnings: [] };
  } };
  const create = () => new SignalEvaluator(repository, { get: () => adapter }, { notify: async () => {
    notified++; if (failNotify) throw new Error('private-notifier-secret');
  } }, { now: () => new Date(rule.created_at) }, undefined, () => {}, f.telemetry);
  try {
    const core = create(), other = create();
    const first = core.evaluate('demo', rule.id); assert.equal(first, core.evaluate('demo', rule.id));
    await Promise.all([first, other.evaluate('demo', rule.id)]);
    assert.equal(notified, 1); assert.equal(repository.events('demo', rule.id).length, 1);
    unavailable = true; await core.evaluate('demo', rule.id); unavailable = false;
    failing = true; await core.evaluate('demo', rule.id); failing = false;
    value = 1; failNotify = true; await core.evaluate('demo', rule.id);
    await core.evaluate('demo', rule.id);
    assert.equal(notified, 2); assert.equal(repository.events('demo', rule.id).length, 2);
    const metrics = await f.collect();
    const points = (name: string) => metrics.find(metric => metric.descriptor.name === name)!.dataPoints;
    assert.deepEqual(points('monitoring.alerts').map(point => [point.attributes.state, point.value]), [['FIRING', 1], ['RECOVERED', 1]]);
    assert.deepEqual(points('monitoring.notifications').map(point => [point.attributes.status, point.value]), [['SENT', 1], ['FAILED', 1]]);
    assert.equal(points('monitoring.evaluation.errors')[0].value, 1);
    assert.equal(points('monitoring.evaluations').find(point => point.attributes.outcome === 'STALE')!.value, 1);
    assert.ok(f.spans.every(span => span.ended && span.scope.tenantSlug === 'demo'));
    assert.ok(f.records.every(record => record.scope.tenantSlug === 'demo'));
    assert.doesNotMatch(JSON.stringify(f.records), /private-database-secret|private-notifier-secret|private-query|private-name/);
  } finally { db.close(); await f.provider.shutdown(); }
});

test('persistence errors end spans, increment errors and emit no alert or notification counters', async () => {
  const f = fixture();
  const repository = { find: () => rule, commitEvaluation: () => { throw new Error('private-sql-secret'); }, completeNotification() {} };
  const adapter = { aggregate: async () => 12, measure: async () => ({ value: 12, unit: 'logs', estimated: false, warnings: [] }) };
  const core = new SignalEvaluator(repository, { get: () => adapter }, { notify: async () => assert.fail('no delivery') },
    { now: () => new Date(rule.created_at) }, undefined, () => {}, f.telemetry);
  try {
    await assert.rejects(core.evaluate('demo', rule.id), /private-sql-secret/);
    const metrics = await f.collect();
    assert.equal(metrics.find(metric => metric.descriptor.name === 'monitoring.evaluation.errors')!.dataPoints[0].value, 1);
    assert.ok(!metrics.some(metric => ['monitoring.alerts', 'monitoring.notifications'].includes(metric.descriptor.name)));
    assert.ok(f.spans[0].ended); assert.equal(f.spans[0].status.code, 2);
    assert.doesNotMatch(JSON.stringify(f.records), /private-sql-secret/);
  } finally { await f.provider.shutdown(); }
});

test('overlapping tenant evaluations preserve separate trusted log and span ownership', async () => {
  const f = fixture();
  try {
    await Promise.all(['first', 'second'].map(org => f.telemetry.run(org, { ...rule, team_id: `${org}-team` }, async () => {
      await new Promise<void>(resolve => setImmediate(resolve)); f.telemetry.transition(event);
    })));
    assert.deepEqual(f.records.map(record => record.scope.tenantSlug).sort(), ['first', 'second']);
    assert.deepEqual(f.spans.map(span => span.scope.teamId).sort(), ['first-team', 'second-team']);
    assert.ok(f.spans.every(span => span.attributes['monitor.id'] === rule.id && span.ended));
    assert.equal(currentTelemetryScope(), undefined);
  } finally { await f.provider.shutdown(); }
});
