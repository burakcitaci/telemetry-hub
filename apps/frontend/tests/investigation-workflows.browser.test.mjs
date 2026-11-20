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
      document.querySelector('[role=dialog] input[name=threshold]').value = '10';
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

test('teams connect member management and guided monitor creation without losing a failed draft', { timeout: 60_000 }, async () => {
  const browser = await browserFixture();
  const dialog = "document.querySelector('[role=dialog]')";
  const button = label => "[...document.querySelectorAll('button')].find(button => button.textContent.trim() === " + JSON.stringify(label) + ")";
  try {
    await browser.navigate('/org/demo/admin/teams?case=team-flow');
    await browser.wait("Boolean(document.querySelector('#edit-team-operations'))");
    await browser.evaluate("document.querySelector('#edit-team-operations').click()");
    await browser.wait(dialog + "?.textContent.includes('Rename team')");
    assert.equal(await browser.evaluate(dialog + ".querySelector('input[name=id]').readOnly"), true);
    await browser.evaluate(`const input = ${dialog}.querySelector('input[name=name]');
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'Operations Engineering');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      ${dialog}.querySelector('form').requestSubmit()`);
    await browser.wait("document.querySelector('tbody')?.textContent.includes('Operations Engineering')");
    await browser.evaluate(`document.querySelector('a[href*="teamId=operations"]').click()`);
    await browser.wait("document.body.textContent.includes('No users in this group yet.')");
    await browser.wait("Boolean(" + button('Assign existing user') + ")");
    await browser.evaluate(button('Assign existing user') + '.click()');
    await browser.wait("Boolean(" + dialog + "?.querySelector('select[name=userId]'))");
    await browser.evaluate(`${dialog}.querySelector('select[name=userId]').value = 'user-b'; ${dialog}.querySelector('form').requestSubmit()`);
    await browser.wait("document.querySelector('tbody')?.textContent.includes('member@example.test')");
    const assignment = await browser.evaluate("window.__requests.find(request => request.url === '/admin/users/user-b' && request.method === 'patch')");
    assert.deepEqual(JSON.parse(assignment.body), { teamId: 'operations' });

    await browser.evaluate(button('Create user') + '.click()');
    await browser.wait("Boolean(" + dialog + "?.querySelector('select[name=teamId]'))");
    assert.equal(await browser.evaluate(dialog + ".querySelector('select[name=teamId]').value"), 'operations');
    await browser.evaluate(dialog + ".querySelector('button[type=button]').click()");
    await browser.wait('!' + dialog);
    await browser.evaluate('history.back()');
    await browser.wait(`Boolean(document.querySelector('a[href*="new=1"][href*="operations"]'))`);
    await browser.evaluate(`document.querySelector('a[href*="new=1"][href*="operations"]').click()`);
    await browser.wait("Boolean(" + dialog + "?.querySelector('input[name=threshold]'))");
    assert.equal(await browser.evaluate(dialog + ".querySelector('select[name=team_id]').value"), 'operations');
    assert.equal(await browser.evaluate(dialog + ".querySelector('details').open"), false);
    await browser.evaluate(`const scope = ${dialog};
      scope.querySelector('input[name=name]').value = 'Operations errors';
      scope.querySelector('input[name=threshold]').value = '12';
      const level = scope.querySelector('select[name=log_level]');
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(level, 'ERROR');
      level.dispatchEvent(new Event('change', { bubbles: true }))`);
    await browser.wait(dialog + ".querySelector('input[name=query]').value === 'severity_text:ERROR'");
    await browser.evaluate(dialog + ".querySelector('form').requestSubmit()");
    await browser.wait(dialog + "?.textContent.includes('Fixture monitor save failed')");
    assert.equal(await browser.evaluate(dialog + ".querySelector('input[name=threshold]').value"), '12');
    await browser.evaluate(dialog + ".querySelector('form').requestSubmit()");
    await browser.wait(dialog + "?.textContent.includes('Operations errors') && " + dialog + ".textContent.includes('Alert history')");
    const attempts = await browser.evaluate("window.__requests.filter(request => request.url === '/monitors' && request.method === 'post').map(request => JSON.parse(request.body))");
    assert.equal(attempts.length, 2);
    assert.deepEqual(attempts[0], attempts[1]);
    assert.equal(attempts[1].query, 'severity_text:ERROR');
    assert.equal(attempts[1].team_id, 'operations');
    assert.equal(attempts[1].window_seconds, 300);
  } finally {
    await browser.close();
  }
});
