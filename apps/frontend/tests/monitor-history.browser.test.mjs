import assert from 'node:assert/strict';
import test from 'node:test';
import { browserFixture } from './browser-harness.mjs';

test('monitor chart fetches selected historical telemetry even when saved evaluation history is empty', { timeout: 60000 }, async () => {
  const browser = await browserFixture();
  try {
    await browser.navigate('/org/demo/monitors');
    await browser.wait("Boolean(document.querySelector('div.group.grid'))");
    await browser.evaluate("document.querySelector('div.group.grid').click()");
    await browser.wait("document.querySelectorAll('.recharts-line-dot').length === 6");
    const request = await browser.evaluate("window.__requests.find(request => request.url === '/monitors/monitor-a/history')");
    assert.ok(request); assert.equal(Date.parse(request.params.to) - Date.parse(request.params.from), 30 * 60_000);
    assert.equal('env' in request.params, false, 'historical scope belongs to the saved rule, not an unsupported query field');
    const text = await browser.evaluate("document.querySelector('[role=dialog]').innerText");
    assert.match(text, /Historical telemetry/); assert.match(text, /Bucket end time/);
    const path = await browser.evaluate("document.querySelector('.recharts-line-curve').getAttribute('d')");
    assert.equal((path.match(/M/g) ?? []).length, 1, 'five-minute buckets are connected, not mistaken for missing evaluations');
  } finally { await browser.close(); }
});
