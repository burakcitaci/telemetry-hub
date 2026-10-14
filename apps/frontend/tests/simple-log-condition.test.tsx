import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseSimpleLogCondition, simpleLogCondition } from '../src/features/monitors/simple-log-condition';
import { SimpleLogEditor } from '../src/features/monitors/components/simple-log-editor';
Object.assign(globalThis, { React });

test('simple log expressions supply generic numeric parameter, comparator and threshold', () => {
  assert.deepEqual(parseSimpleLogCondition('ForecastCount > 5'), { attribute: 'ForecastCount', comparator: 'above', threshold: 5 });
  assert.deepEqual(parseSimpleLogCondition('order.total <= -1.5'), { attribute: 'order.total', comparator: 'below_or_equal', threshold: -1.5 });
  assert.equal(parseSimpleLogCondition('duration_ms >= 1e3')?.threshold, 1000);
  for (const input of ['ForecastCount >', 'x > NaN', 'x > 1e999', 'x > 5 OR true', 'x = 5', 'bad name > 5']) assert.equal(parseSimpleLogCondition(input), null);
  assert.equal(simpleLogCondition('value', 'above_or_equal', 5), 'value >= 5');
});

test('default log editor has one expression input and one aggregation control', () => {
  const html = renderToStaticMarkup(<SimpleLogEditor expression="ForecastCount > 5" onChange={() => {}} aggregation="max" onAggregationChange={() => {}} />);
  assert.equal((html.match(/<input /g) ?? []).length, 1);
  assert.match(html, /ForecastCount &gt; 5/); assert.match(html, /Aggregation/);
  assert.doesNotMatch(html, /What do you want|Parameter name|Add parameter filter/);
});
