import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { monitorPayload } from '../src/features/monitors/api';
import { MonitorDetail } from '../src/features/monitors/components/monitors-components';
import type { MonitorView } from '../src/features/monitors/model';
import { historyInRange } from '../src/features/monitors/history-range';
Object.assign(globalThis, { React });

test('chart range stays anchored to requested time bounds instead of shrinking to samples', () => {
  const data = historyInRange({ points: [{ t: 0, v: 9 }, { t: 100_000, v: 0 },
    { t: 230_000, v: 8 }, { t: 260_000, v: NaN }, { t: 400_000, v: 1 }], threshold: 5 }, 90_000, 300_000);
  assert.deepEqual(data[0], { t: 90_000, value: null });
  assert.deepEqual(data.at(-1), { t: 300_000, value: null });
  assert.ok(data.some(point => point.value === 0));
  assert.ok(data.some(point => point.t === 130_000 && point.value === null));
  assert.equal(data.some(point => point.t === 400_000 || point.t === 0), false);
});

const monitor: MonitorView = { id: 'm1', name: 'Checkout errors', type: 'trace', datadogType: 'query alert',
  query: 'checkout', aggregation: 'count', comparator: 'above', threshold: 5, evaluationWindow: '5m',
  targets: [], message: '', createdAt: '2026-10-14T10:00:00Z', updatedAt: '2026-10-14T10:00:00Z',
  status: 'Alert', isMuted: false, history: [{ t: Date.now(), v: 7, status: 'Alert' }], unit: 'spans',
  lastEvaluatedAt: new Date().toISOString(), groups: [{ key: '["api"]', labels: ['api'], value: 7, status: 'Alert', samples: 12 }] };

test('write payload contains editable rule fields and never server evaluation state', () => {
  const payload = monitorPayload({ ...monitor, metricType: 'gauge', signalStatus: 'ERROR', noDataPolicy: 'no_data' });
  assert.equal(payload.type, 'trace'); assert.equal(payload.signalStatus, 'ERROR');
  assert.equal('id' in payload, false); assert.equal('history' in payload, false);
  assert.equal('status' in payload, false); assert.equal('lastEvaluatedAt' in payload, false);
  const measured = monitorPayload({ ...monitor, type: 'log', logAttribute: 'order.total', aggregation: 'max' });
  assert.equal(measured.logAttribute, 'order.total'); assert.equal(measured.aggregation, 'max');
});

test('monitor detail renders actual evaluated history, groups and failed evaluation', () => {
  const props = { events: [], onClose() {}, onEdit() {}, onToggleMute() {}, chartTimeRange: '30m', onChartTimeRangeChange() {} };
  const html = renderToStaticMarkup(<MonitorDetail {...props} monitor={monitor} />);
  assert.match(html, /7 spans/); assert.match(html, /api/); assert.match(html, /Last evaluated/);
  assert.match(html, /Evaluation time/); assert.match(html, /Evaluated value \(spans\)/);
  assert.match(html, /Critical: 5/); assert.match(html, /Close monitor details/);
  assert.doesNotMatch(html, /24h ago|12h ago|shadow-sm/);
  assert.match(html, /Past 30 minutes/);
  const failed = renderToStaticMarkup(<MonitorDetail {...props} monitor={{ ...monitor, status: 'Unknown',
    value: null, history: [...monitor.history!, { t: Date.now() + 30_000, v: null, status: 'Unknown' }], evaluationError: 'Evaluation failed.' }} />);
  assert.match(failed, /role="alert"/); assert.match(failed, /Evaluation failed/);
  assert.match(failed, /now —/);
});

test('log detail separates the query filter from the aggregated alert condition', () => {
  const html = renderToStaticMarkup(<MonitorDetail monitor={{ ...monitor, type: 'log', query: '@ForecastCount:>5',
    logAttribute: 'ForecastCount', aggregation: 'sum', threshold: 8, groups: [], groupBy: [], targets: [] }}
    events={[]} onClose={() => {}} onEdit={() => {}} onToggleMute={() => {}} />);
  assert.match(html, /ForecastCount &gt; 5/);
  assert.match(html, /Total of ForecastCount/); assert.match(html, /above 8/);
  assert.doesNotMatch(html, /filter:|>Notify<|>Group by</);
});
