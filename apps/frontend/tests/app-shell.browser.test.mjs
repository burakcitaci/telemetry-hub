import assert from "node:assert/strict";
import test from "node:test";
import { browserFixture } from "./browser-harness.mjs";
test("FE-A6: retry keeps original scope, logout/login resets investigation, monitor filters still refetch", { timeout: 60000 }, async () => {
  const browser = await browserFixture();
  try {
    await browser.navigate("/org/demo/traces?env=dev&case=retry");
    await browser.wait("Boolean(document.querySelector('tbody tr td'))");
    await browser.evaluate("document.querySelector('tbody tr').click()");
    await browser.wait("document.body.innerText.includes('Fixture query failed')");
    await browser.evaluate("history.pushState({}, '', '?env=production'); dispatchEvent(new PopStateEvent('popstate'))");
    await browser.wait("window.__requests.some(request => request.url === '/traces' && request.params.env === 'production')");
    await browser.evaluate("[...document.querySelectorAll('[role=dialog] button')].find(button => button.innerText.includes('Wiederholen')).click()");
    await browser.wait("Boolean(document.querySelector('[role=dialog]')) && document.querySelector('[role=dialog]').innerText.includes('GET /fixture')");
    const requests = await browser.evaluate("window.__requests.filter(request => request.url === '/traces/detail')");
    assert.equal(requests.length, 2);
    assert.ok(requests.every(request => request.params.env === "dev" && request.headers["X-Environment-Filter"] === "dev"));
    // Close modal to make the existing logout control reachable, then switch organizations.
    await browser.evaluate("document.querySelector('button[aria-label=\"Close trace details\"]').click()");
    await browser.evaluate("[...document.querySelectorAll('button')].find(button => button.innerText === 'Abmelden').click()");
    await browser.wait("Boolean(document.getElementById('tenantSlug'))");
    await browser.evaluate(`for (const [id, value] of [['tenantSlug','other'],['email','a@example.test'],['password','fixture-password']]) {
      const input = document.getElementById(id);
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }`);
    await browser.evaluate("document.querySelector('form').requestSubmit()");
    await browser.wait("location.pathname === '/org/other/metrics'");
    assert.equal(await browser.evaluate("Boolean(document.querySelector('[role=dialog]'))"), false);
    await browser.navigate("/org/demo/monitors?env=dev");
    await browser.wait("document.body.innerText.includes('Fixture monitor')");
    await browser.evaluate("history.pushState({}, '', '?env=production'); dispatchEvent(new PopStateEvent('popstate'))");
    await browser.wait("window.__requests.some(request => request.url === '/monitors' && request.headers['X-Environment-Filter'] === 'production')");
  } finally { await browser.close(); }
});
test("FE-A6: environment change preserves open trace and original scope while lists refresh", { timeout: 60000 }, async () => {
  const browser = await browserFixture();
  try {
    await browser.navigate("/org/demo/traces?env=dev");
    await browser.wait("Boolean(document.querySelector('tbody tr td'))");
    await browser.evaluate("document.querySelector('tbody tr').click()");
    await browser.wait("Boolean(document.querySelector('[role=dialog]')) && document.querySelector('[role=dialog]').innerText.includes('GET /fixture')");
    await browser.evaluate("history.pushState({}, '', '?env=production'); dispatchEvent(new PopStateEvent('popstate'))");
    await browser.wait("window.__requests.some(request => request.url === '/traces' && request.params.env === 'production')");
    assert.equal(await browser.evaluate("Boolean(document.querySelector('[role=dialog]'))"), true);
    assert.match(await browser.evaluate("document.querySelector('[role=dialog]').innerText"), /GET \/fixture/);
    const details = await browser.evaluate("window.__requests.filter(request => request.url === '/traces/detail')");
    assert.equal(details.length, 1);
    assert.equal(details[0].params.env, "dev");
    assert.equal(details[0].headers["X-Environment-Filter"], "dev");
  } finally { await browser.close(); }
});
