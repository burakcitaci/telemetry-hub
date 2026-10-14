import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = (path: string) =>
  readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');

test('remaining passive controls do not promise unsupported behavior', () => {
  const services = source('features/services/components/services-view.tsx');
  const monitors = source('features/monitors/components/monitors-view.tsx');
  const metrics = source('features/metrics/components/metrics-view.tsx');

  assert.doesNotMatch(services, /onTimeRangeChange/);
  assert.doesNotMatch(monitors, /TimeRangePicker/);
  assert.doesNotMatch(metrics, /> Filter\s*</);
  assert.doesNotMatch(metrics, /> CSV\s*</);
});

test('compact rows expose truthful readable evidence', () => {
  const logs = source('features/logs/components/logs-components.tsx');
  const services = source('features/services/components/services-components.tsx');
  const detail = source('features/services/service-detail-page.tsx');

  assert.match(logs, /\{normalized\}/);
  assert.doesNotMatch(logs, /rotate-90/);
  assert.doesNotMatch(services, /title="TELEMETRY"/);
  assert.doesNotMatch(detail, /\n\s*12\s+<span/);
});
