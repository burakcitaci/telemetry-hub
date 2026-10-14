import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveLogQuery, displayLogQuery } from '../src/features/monitors/log-query-input';

test('natural numeric query is a record filter, independent from alert threshold', () => {
  assert.deepEqual(resolveLogQuery('ForecastCount > 5', 'sum'), { query: '@ForecastCount:>5', attribute: 'ForecastCount' });
  assert.deepEqual(resolveLogQuery('ForecastCount > 5', 'count'), { query: '@ForecastCount:>5', attribute: undefined });
  assert.equal(resolveLogQuery('order.total <= -1.5', 'avg').query, '@order.total:<=-1.5');
  assert.equal(resolveLogQuery('ForecastCount >', 'count').query, '');
  assert.equal(resolveLogQuery('ForecastCount > NaN', 'sum').query, '');
  assert.equal(displayLogQuery('@ForecastCount:>5', 'ForecastCount'), 'ForecastCount > 5');
  assert.equal(displayLogQuery('*', 'ForecastCount'), 'ForecastCount');
});
