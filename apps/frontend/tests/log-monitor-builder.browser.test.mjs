import assert from 'node:assert/strict';
import test from 'node:test';
import { browserFixture } from './browser-harness.mjs';

test('user creates a numeric parameter monitor with no raw query syntax', { timeout: 60000 }, async () => {
  const browser = await browserFixture();
  const fill = async (selector, value) => browser.evaluate(`(() => { const input = document.querySelector(${JSON.stringify(selector)});
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(value)});
    input.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  const choose = async (selector, label) => {
    await browser.evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`); await browser.key('Enter');
    await browser.wait("document.querySelectorAll('[role=option]').length > 0");
    await browser.evaluate(`[...document.querySelectorAll('[role=option]')].find(option => option.textContent === ${JSON.stringify(label)}).click()`);
  };
  try {
    await browser.navigate('/org/demo/monitors');
    await browser.wait("[...document.querySelectorAll('button')].some(button => button.textContent.includes('New monitor'))");
    await browser.evaluate("[...document.querySelectorAll('button')].find(button => button.textContent.includes('New monitor')).click()");
    await browser.wait("Boolean(document.getElementById('monitor-type'))");
    await choose('#monitor-type', 'Log');
    await fill('#monitor-name', 'Forecast volume');
    await fill('#monitor-query', 'ForecastCount > 5');
    await fill('#monitor-threshold', '8');
    await choose('#monitor-log-calculation', 'Total');
    assert.equal(await browser.evaluate("Boolean(document.querySelector('#monitor-threshold'))"), true);
    assert.doesNotMatch(await browser.evaluate("document.querySelector('[role=dialog]').innerText"), /Choose what to monitor|What do you want to monitor|Advanced log options/);
    await browser.evaluate("[...document.querySelectorAll('button')].find(button => /Create monitor/.test(button.textContent)).click()");
    await browser.wait("window.__requests.some(request => request.url === '/monitors' && request.method === 'post')");
    const payload = await browser.evaluate("JSON.parse(window.__requests.find(request => request.url === '/monitors' && request.method === 'post').body)");
    assert.equal(payload.logAttribute, 'ForecastCount'); assert.equal(payload.aggregation, 'sum');
    assert.equal(payload.comparator, 'above'); assert.equal(payload.threshold, 8);
    assert.equal(payload.query, '@ForecastCount:>5');
  } finally { await browser.close(); }
});
