import assert from 'node:assert/strict';
import test from 'node:test';
import { browserFixture } from './browser-harness.mjs';

const button = label => "[...document.querySelectorAll('button')].find(button => button.textContent.trim() === " + JSON.stringify(label) + ")";
const choose = (selector, value) => `{
  const element = document.querySelector(${JSON.stringify(selector)});
  Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(element, ${JSON.stringify(value)});
  element.dispatchEvent(new Event('change', { bubbles: true }));
}`;

test('team overview connects notification routing, maintenance, alert triage, and monitor templates', { timeout: 60_000 }, async () => {
  const browser = await browserFixture();
  try {
    await browser.navigate('/org/demo/admin/teams/platform?case=operations');
    await browser.wait("document.querySelector('h1')?.textContent === 'Platform'");
    await browser.wait("document.body.textContent.includes('Owned services') && document.body.textContent.includes('API telemetry')");
    await browser.wait("Boolean(document.querySelector('select[name=destination]'))");
    await browser.evaluate(choose('select[name=destination]', 'ops'));
    await browser.evaluate(button('Save routing') + '.click()');
    await browser.wait("Boolean(" + button('Send test to saved destination') + ") && !" + button('Send test to saved destination') + ".disabled");
    await browser.evaluate(button('Send test to saved destination') + '.click()');
    await browser.wait("document.querySelector('[aria-label=\"Test delivery history\"]')?.textContent.includes('SENT')");
    await browser.evaluate("[...document.querySelectorAll('a')].find(link => link.textContent === 'Schedule maintenance').click()");
    await browser.wait("Boolean(document.querySelector('input[name=starts_at]'))");
    assert.equal(await browser.evaluate("document.querySelector('select[name=team_id]').value"), 'platform');
    await browser.evaluate(`{
      const form = document.querySelector('input[name=starts_at]').form;
      form.elements.name.value = 'Deploy API';
      form.elements.starts_at.value = '2099-01-01T10:00';
      form.elements.ends_at.value = '2099-01-01T11:00';
      form.requestSubmit();
    }`);
    await browser.wait("document.body.textContent.includes('Deploy API · Scheduled')");
    await browser.evaluate('history.back()');
    await browser.wait("document.querySelector('h1')?.textContent === 'Platform'");
    await browser.evaluate("[...document.querySelectorAll('a')].find(link => link.textContent === 'Open team alert history').click()");
    await browser.wait("Boolean(" + button('Manage alert') + ")");
    await browser.evaluate(button('Manage alert') + '.click()');
    await browser.wait("Boolean(" + button('Acknowledge') + ")");
    await browser.evaluate(button('Acknowledge') + '.click()');
    await browser.wait("document.body.textContent.includes('Acknowledged by admin@example.test')");
    await browser.evaluate('history.back()');
    await browser.wait("document.querySelector('h1')?.textContent === 'Platform'");
    await browser.evaluate("[...document.querySelectorAll('a')].find(link => link.textContent === 'New monitor').click()");
    await browser.wait("Boolean(document.querySelector('select[name=template]'))");
    await browser.evaluate(choose('select[name=template]', 'latency'));
    await browser.wait("document.querySelector('input[name=field]')?.value === 'duration_ms'");
    await browser.evaluate(`{
      const form = document.querySelector('input[name=field]').form;
      form.elements.name.value = 'Checkout latency';
      document.querySelector('button[value=preview]').click();
    }`);
    await browser.wait("document.body.textContent.includes('Would fire')");
    const request = await browser.evaluate("window.__requests.find(request => request.url === '/monitors/preview')");
    const rule = JSON.parse(request.body);
    assert.equal(rule.signal_type, 'TRACE');
    assert.equal(rule.aggregation, 'P95');
    assert.equal(rule.field, 'duration_ms');
    assert.equal(rule.threshold, 500);
    assert.equal(rule.team_id, 'platform');
  } finally { await browser.close(); }
});
