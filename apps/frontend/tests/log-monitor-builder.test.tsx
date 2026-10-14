import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildLogQuery, readLogBuilder, logRuleSummary } from '../src/features/monitors/log-builder';
import { LogRuleBuilder } from '../src/features/monitors/components/log-rule-builder';
Object.assign(globalThis, { React });

test('guided filters serialize safely and reopen without losing parameter values', () => {
  const state = { filters: [{ parameter: 'RequestPath', operator: 'equals' as const, value: '/WeatherForecast' },
    { parameter: 'ForecastCount', operator: '>' as const, value: '5' }], message: '', advanced: false };
  const built = buildLogQuery(state);
  assert.equal(built.query, '@RequestPath:"/WeatherForecast" AND @ForecastCount:>5');
  assert.deepEqual(readLogBuilder(built.query), state);
  const quoted = { ...state, filters: [{ parameter: 'message', operator: 'equals' as const, value: 'quoted "value" AND text' }] };
  assert.deepEqual(readLogBuilder(buildLogQuery(quoted).query), quoted);
  assert.equal(buildLogQuery({ ...state, filters: [{ parameter: '', operator: 'equals', value: '' }] }).query, '');
  assert.ok(buildLogQuery({ ...state, filters: [{ parameter: 'value', operator: '>', value: 'bad' }] }).error);
  assert.equal(readLogBuilder('@value:>5 AND').advanced, true);
  assert.equal(readLogBuilder('@value:>bad').advanced, true);
  assert.equal(logRuleSummary('ForecastCount', 'sum'), 'Total of ForecastCount');
  assert.equal(logRuleSummary('', 'count'), 'Number of matching log records');
});

test('guided numeric measure explains value aggregation and optional filters without exposing raw syntax by default', () => {
  const html = renderToStaticMarkup(<LogRuleBuilder state={readLogBuilder('*')} measure="number" attribute="ForecastCount" aggregation="max"
    rawQuery="*" onChange={() => {}} onMeasureChange={() => {}} onAttributeChange={() => {}} onAggregationChange={() => {}} onRawQueryChange={() => {}} />);
  assert.match(html, /What do you want to monitor/); assert.match(html, /Parameter name/);
  assert.match(html, /How should we calculate it/); assert.match(html, /Maximum/);
  assert.match(html, /Add parameter filter/); assert.match(html, /contributes 8, not one log/);
  assert.match(html, /<details>/); assert.doesNotMatch(html, /<details open/);
});
