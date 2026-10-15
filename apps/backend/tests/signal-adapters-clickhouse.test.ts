import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LogAdapter } from '../src/modules/monitors/adapters/log.adapter';
import { TraceAdapter } from '../src/modules/monitors/adapters/trace.adapter';
import { MetricAdapter } from '../src/modules/monitors/adapters/metric.adapter';
import { AGGREGATIONS, NoDataError, type SignalQuery } from '../src/modules/monitors/signal-adapter';
import { common, createAdapterFixture, metricPoint, since, timestamp, until } from './helpers/adapter-clickhouse-fixture';

const scope = { tenantSlug: 'demo', role: 'admin' as const, teamFilter: 'platform' };
const base: SignalQuery = { signal_type: 'LOG', query: 'service.name:api deployment.environment:production service.namespace:shop service.version:1 otel.scope.name:test', aggregation: 'COUNT', scope };
const enabled = process.env.TEST_KIND_CLICKHOUSE === '1';

test('all adapters aggregate seeded stored OTel data with scope, filters, units and exact scalar quantiles',
  { skip: !enabled, timeout: 180000 }, async () => {
    const fixture = createAdapterFixture();
    try {
      fixture.initialize();
      const values = Array.from({ length: 20 }, (_, index) => index + 1);
      const logs = values.map(value => ({ ...common, Timestamp: timestamp(value), SeverityText: 'ERROR',
        SeverityNumber: 17, LogAttributes: { 'order.total': String(value), 'http.status_code': '500' } }));
      fixture.insert('otel_logs', [...logs, { ...logs[0], Timestamp: timestamp(60) },
        { ...logs[0], Timestamp: timestamp(-1) }, { ...logs[0], org_slug: 'foreign' },
        { ...logs[0], team_id: 'foreign' }]);
      fixture.insert('otel_traces', values.map(value => ({ ...common, Timestamp: timestamp(value),
        Duration: value * 1000000, StatusCode: 'Error', SpanAttributes: { 'db.system': 'postgres' } })));
      fixture.insert('otel_metrics_gauge', [...values.map(value => metricPoint('latency', value, { Value: value })),
        metricPoint('latency', 60, { Value: 999 }), metricPoint('latency', -1, { Value: 999 })]);
      const expected = { COUNT: 20, AVG: 10.5, SUM: 210, MAX: 20, MIN: 1, P95: 19, P99: 20 };
      const adapters = [new LogAdapter(fixture.clickhouse), new TraceAdapter(fixture.clickhouse), new MetricAdapter(fixture.clickhouse)];
      const queries: SignalQuery[] = [
        { ...base, query: `${base.query} severity_text:ERROR http.status_code:500`, field: 'order.total' },
        { ...base, signal_type: 'TRACE', query: `${base.query} status.code:ERROR db.system:postgres`, field: 'duration_ms' },
        { ...base, signal_type: 'METRIC', metric_name: 'latency', field: 'value' },
      ];
      for (let index = 0; index < adapters.length; index++) for (const aggregation of AGGREGATIONS) {
        const measurement = await adapters[index].measure({ ...queries[index], aggregation }, since, until);
        assert.equal(measurement.value, expected[aggregation], `${queries[index].signal_type} ${aggregation}`);
        assert.equal(measurement.estimated, false);
        if (aggregation !== 'COUNT') assert.equal(measurement.unit, index === 0 ? 'order.total' : 'ms');
      }
      assert.equal(await adapters[0].aggregate({ ...base, query: 'service.name:absent' }, since, until), 0);
      await assert.rejects(adapters[0].aggregate({ ...base, aggregation: 'AVG', field: 'absent' }, since, until), NoDataError);
      fixture.insert('otel_logs', ['0', 'NaN', 'bad'].map(value => ({ ...logs[0], SeverityText: 'INFO',
        LogAttributes: { 'order.total': value } })));
      const numericLogs = { ...base, query: `${base.query} severity_text:INFO`, field: 'order.total' };
      assert.equal(await adapters[0].aggregate({ ...numericLogs, aggregation: 'COUNT' }, since, until), 3);
      assert.equal(await adapters[0].aggregate({ ...numericLogs, aggregation: 'AVG' }, since, until), 0);
    } finally { fixture.close(); }
  });

test('metric adapters normalize delta/cumulative points, counter resets and non-monotonic sums',
  { skip: !enabled, timeout: 180000 }, async () => {
    const fixture = createAdapterFixture();
    try {
      fixture.initialize();
      fixture.insert('otel_metrics_sum', [
        metricPoint('delta', 10, { Value: 2, IsMonotonic: true, AggregationTemporality: 1 }),
        metricPoint('delta', 20, { Value: 4, IsMonotonic: true, AggregationTemporality: 1, StartTimeUnix: timestamp(10) }),
        metricPoint('cumulative', -1, { Value: 100, IsMonotonic: true, AggregationTemporality: 2, StartTimeUnix: timestamp(-100) }),
        metricPoint('cumulative', 10, { Value: 102, IsMonotonic: true, AggregationTemporality: 2, StartTimeUnix: timestamp(-100) }),
        metricPoint('cumulative', 20, { Value: 106, IsMonotonic: true, AggregationTemporality: 2, StartTimeUnix: timestamp(-100) }),
        metricPoint('cumulative', 30, { Value: 3, IsMonotonic: true, AggregationTemporality: 2, StartTimeUnix: timestamp(25) }),
        metricPoint('nonmonotonic', -1, { Value: 10, AggregationTemporality: 2, StartTimeUnix: timestamp(-100) }),
        metricPoint('nonmonotonic', 10, { Value: 8, AggregationTemporality: 2, StartTimeUnix: timestamp(-100) }),
        metricPoint('nonmonotonic', 20, { Value: 5, AggregationTemporality: 2, StartTimeUnix: timestamp(-100) }),
        metricPoint('missing-baseline', 10, { Value: 100, AggregationTemporality: 2, StartTimeUnix: timestamp(-100) }),
      ]);
      const adapter = new MetricAdapter(fixture.clickhouse);
      const monitor: SignalQuery = { ...base, signal_type: 'METRIC', field: 'value', aggregation: 'SUM' };
      for (const [name, value] of [['delta', 6], ['cumulative', 9], ['nonmonotonic', -5]] as const)
        assert.equal(await adapter.aggregate({ ...monitor, metric_name: name }, since, until), value);
      const expected = { COUNT: 3, AVG: 3, SUM: 9, MIN: 2, MAX: 4, P95: 4, P99: 4 };
      for (const aggregation of AGGREGATIONS)
        assert.equal(await adapter.aggregate({ ...monitor, metric_name: 'cumulative', aggregation }, since, until), expected[aggregation]);
      await assert.rejects(adapter.aggregate({ ...monitor, metric_name: 'missing-baseline' }, since, until), NoDataError);
      assert.equal(await adapter.aggregate({ ...monitor, metric_name: 'missing-baseline', aggregation: 'COUNT' }, since, until), 1);
    } finally { fixture.close(); }
  });

test('metric ambiguity, malformed distributions, empty data and changed cumulative layouts fail safely',
  { skip: !enabled, timeout: 180000 }, async () => {
    const fixture = createAdapterFixture();
    try {
      fixture.initialize();
      fixture.insert('otel_metrics_gauge', [metricPoint('mixed-unit', 10, { Value: 1 }),
        metricPoint('mixed-unit', 20, { Value: 2, MetricUnit: 's' }), metricPoint('mixed-type', 10, { Value: 1 })]);
      fixture.insert('otel_metrics_sum', [metricPoint('mixed-type', 10, { Value: 1, AggregationTemporality: 1 }),
        metricPoint('bad-temporality', 10, { Value: 1, AggregationTemporality: 0 })]);
      const hist = (name: string, seconds: number, extra: Record<string, unknown>) => metricPoint(name, seconds,
        { Count: 1, Sum: 10, Min: 10, Max: 10, ExplicitBounds: [10, 20], BucketCounts: [1, 0, 0], AggregationTemporality: 1, ...extra });
      fixture.insert('otel_metrics_histogram', [hist('bad-count', 10, { Count: 2 }),
        hist('empty', 10, { Count: 0, Sum: 0, Min: 0, Max: 0, BucketCounts: [0, 0, 0] }),
        hist('changed-bounds', -1, { AggregationTemporality: 2, StartTimeUnix: timestamp(-100) }),
        hist('changed-bounds', 10, { AggregationTemporality: 2, StartTimeUnix: timestamp(-100), Count: 2,
          Sum: 20, ExplicitBounds: [15, 30], BucketCounts: [2, 0, 0] })]);
      const adapter = new MetricAdapter(fixture.clickhouse);
      const monitor: SignalQuery = { ...base, signal_type: 'METRIC', aggregation: 'SUM', field: 'value' };
      for (const name of ['mixed-unit', 'mixed-type'])
        await assert.rejects(adapter.aggregate({ ...monitor, metric_name: name }, since, until), /ambiguous/);
      for (const name of ['bad-temporality', 'bad-count', 'changed-bounds', 'empty'])
        await assert.rejects(adapter.aggregate({ ...monitor, metric_name: name }, since, until), NoDataError);
      assert.equal(await adapter.aggregate({ ...monitor, metric_name: 'empty', aggregation: 'COUNT' }, since, until), 0);
      await assert.rejects(adapter.aggregate({ ...monitor, metric_name: 'empty', aggregation: 'P99' }, since, until),
        error => error instanceof NoDataError && error.estimated);
    } finally { fixture.close(); }
  });

test('histogram windows use bucket-weighted estimates, cumulative differences and explicit overflow NoData',
  { skip: !enabled, timeout: 180000 }, async () => {
    const fixture = createAdapterFixture();
    try {
      fixture.initialize();
      const point = (name: string, seconds: number, extra: Record<string, unknown>) => metricPoint(name, seconds,
        { ExplicitBounds: [10, 20], Min: 10, Max: 20, AggregationTemporality: 1, ...extra });
      fixture.insert('otel_metrics_histogram', [
        point('delta-hist', 10, { Count: 2, Sum: 30, BucketCounts: [1, 1, 0] }),
        point('delta-hist', 20, { Count: 1, Sum: 20, Min: 20, BucketCounts: [0, 1, 0], StartTimeUnix: timestamp(10) }),
        point('delta-hist', 30, { Count: 0, Sum: 0, Min: 0, Max: 0, BucketCounts: [0, 0, 0] }),
        point('cumulative-hist', -1, { Count: 10, Sum: 100, BucketCounts: [5, 5, 0], AggregationTemporality: 2, StartTimeUnix: timestamp(-100) }),
        point('cumulative-hist', 10, { Count: 12, Sum: 130, BucketCounts: [6, 6, 0], AggregationTemporality: 2, StartTimeUnix: timestamp(-100) }),
        point('cumulative-hist', 20, { Count: 13, Sum: 150, BucketCounts: [6, 7, 0], AggregationTemporality: 2, StartTimeUnix: timestamp(-100) }),
        point('overflow', 10, { Count: 100, Sum: 10000, BucketCounts: [0, 0, 100] }),
        point('rank-boundary', 10, { Count: 20, Sum: 300, BucketCounts: [19, 0, 1] }),
        point('reset-hist', -1, { Count: 10, Sum: 100, BucketCounts: [5, 5, 0], AggregationTemporality: 2, StartTimeUnix: timestamp(-100) }),
        point('reset-hist', 10, { Count: 12, Sum: 130, BucketCounts: [6, 6, 0], AggregationTemporality: 2, StartTimeUnix: timestamp(-100) }),
        point('reset-hist', 20, { Count: 1, Sum: 10, BucketCounts: [1, 0, 0], AggregationTemporality: 2, StartTimeUnix: timestamp(15) }),
      ]);
      const adapter = new MetricAdapter(fixture.clickhouse);
      const monitor: SignalQuery = { ...base, signal_type: 'METRIC', field: 'value', metric_name: 'delta-hist' };
      const expected = { COUNT: 3, SUM: 50, AVG: 50 / 3, MIN: 10, MAX: 20, P95: 20, P99: 20 };
      for (const aggregation of AGGREGATIONS) {
        const result = await adapter.measure({ ...monitor, aggregation }, since, until);
        assert.equal(result.value, expected[aggregation], aggregation);
        assert.equal(result.estimated, ['P95', 'P99'].includes(aggregation));
      }
      assert.equal(await adapter.aggregate({ ...monitor, metric_name: 'cumulative-hist', aggregation: 'SUM' }, since, until), 50);
      assert.equal(await adapter.aggregate({ ...monitor, metric_name: 'cumulative-hist', aggregation: 'P95' }, since, until), 20);
      await assert.rejects(adapter.aggregate({ ...monitor, metric_name: 'cumulative-hist', aggregation: 'MIN' }, since, until), NoDataError);
      await assert.rejects(adapter.aggregate({ ...monitor, metric_name: 'overflow', aggregation: 'P95' }, since, until),
        error => error instanceof NoDataError && error.estimated && /overflow/.test(error.message));
      assert.equal(await adapter.aggregate({ ...monitor, metric_name: 'rank-boundary', aggregation: 'P95' }, since, until), 10);
      await assert.rejects(adapter.aggregate({ ...monitor, metric_name: 'rank-boundary', aggregation: 'P99' }, since, until), NoDataError);
      assert.equal(await adapter.aggregate({ ...monitor, metric_name: 'reset-hist', aggregation: 'SUM' }, since, until), 40);
    } finally { fixture.close(); }
  });
