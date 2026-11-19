import assert from 'node:assert/strict';
import test from 'node:test';
import { browserFixture } from './browser-harness.mjs';

test('historical trace links load the selected record and carry time and service across explorers', { timeout: 60_000 }, async () => {
  const browser = await browserFixture();
  const range = '2026-10-12T23:55:00.000Z to 2026-10-13T00:00:00.000Z';
  const trace = '1234567890abcdef1234567890abcdef';
  const query = new URLSearchParams({ trace, range, env: 'dev', globalService: 'api', q: 'checkout' });
  try {
    await browser.navigate('/org/demo/traces?' + query);
    await browser.wait("document.querySelector('[role=dialog]')?.textContent.includes('GET /fixture')");
    await browser.wait("window.__requests.some(request => request.url === '/traces' && request.params.q === 'checkout')");
    const request = await browser.evaluate("window.__requests.find(request => request.url === '/traces' && request.params.q === 'checkout')");
    assert.equal(request.params.from, '2026-10-12T23:55:00.000Z');
    assert.equal(request.params.to, '2026-10-13T00:00:00.000Z');
    assert.equal(request.headers['X-Service-Filter'], 'api');
    await browser.evaluate(`document.querySelector('button[aria-label="Close trace details"]').click()`);
    await browser.wait("!new URLSearchParams(location.search).has('trace')");
    await browser.evaluate("[...document.querySelectorAll('a')].find(link => link.pathname === '/org/demo/logs').click()");
    await browser.wait("location.pathname === '/org/demo/logs'");
    const next = new URLSearchParams(await browser.evaluate('location.search'));
    assert.equal(next.get('range'), range);
    assert.equal(next.get('globalService'), 'api');
    assert.equal(next.has('q'), false);
  } finally {
    await browser.close();
  }
});

test('onboarding returns scoped configuration and shows signal arrival independently', { timeout: 60_000 }, async () => {
  const browser = await browserFixture();
  try {
    await browser.navigate('/org/demo/connect');
    await browser.wait("Boolean(document.querySelector('input[name=service]'))");
    await browser.evaluate(`document.querySelector('input[name=service]').value = 'checkout';
      document.querySelector('form').requestSubmit()`);
    await browser.wait("document.querySelector('pre')?.textContent.includes('OTEL_SERVICE_NAME=checkout')");
    await browser.wait("window.__requests.some(request => request.url === '/ingestion-status')");
    const request = await browser.evaluate("window.__requests.find(request => request.url === '/ingestion-status')");
    assert.deepEqual(request.params, { service: 'checkout', team: 'platform', env: 'local' });
    await browser.wait("document.querySelector('[aria-live=polite]')?.textContent.includes('Waiting for data')");
  } finally {
    await browser.close();
  }
});

test('the default monitor editor previews and saves the canonical rule and opens alert history', { timeout: 60_000 }, async () => {
  const browser = await browserFixture();
  try {
    await browser.navigate('/org/demo/monitors?case=canonical');
    await browser.wait("document.body.innerText.includes('Fixture monitor')");
    await browser.evaluate("[...document.querySelectorAll('button')].find(button => button.textContent.includes('New monitor')).click()");
    await browser.wait("Boolean(document.querySelector('[role=dialog] input[name=name]'))");
    await browser.evaluate(`document.querySelector('[role=dialog] input[name=name]').value = 'Canonical monitor';
      document.querySelector('button[value=preview]').click()`);
    await browser.wait("document.querySelector('[role=dialog]')?.textContent.includes('Would fire')");
    await browser.evaluate("document.querySelector('[role=dialog] form').requestSubmit()");
    await browser.wait("document.querySelector('[role=dialog]')?.textContent.includes('Fixture alert')");
    const request = await browser.evaluate("window.__requests.find(request => request.url === '/monitors' && request.method === 'post')");
    assert.equal(JSON.parse(request.body).signal_type, 'LOG');
    assert.equal(JSON.parse(request.body).query, '');
    assert.equal(await browser.evaluate("document.querySelector('[role=dialog] a').pathname"), '/org/demo/logs');
  } finally {
    await browser.close();
  }
});
