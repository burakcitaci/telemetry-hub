import assert from 'node:assert/strict';
import test from 'node:test';
import { browserFixture } from './browser-harness.mjs';

test('render failure keeps recovery controls and route navigation resets the boundary', { timeout: 60000 }, async () => {
  const browser = await browserFixture();
  try {
    await browser.navigate('/org/demo/logs?case=render-error');
    await browser.wait("document.body.innerText.includes('This view could not be displayed')");
    assert.equal(await browser.evaluate("document.querySelector('[role=alert] button').innerText"), 'Reload view');
    await browser.evaluate("document.querySelector('a').click()");
    await browser.wait("document.body.innerText.includes('Recovered view')");
    assert.equal(await browser.evaluate("Boolean(document.querySelector('[role=alert]'))"), false);
  } finally { await browser.close(); }
});

test('admin deletion requires confirmation and cancellation sends no mutation', { timeout: 60000 }, async () => {
  const browser = await browserFixture();
  try {
    await browser.navigate('/org/demo/admin/teams');
    const deleteTeam = "[...document.querySelectorAll('main tbody button')].find(button => button.innerText === 'Delete')";
    await browser.wait(`Boolean(${deleteTeam})`);
    await browser.evaluate(`${deleteTeam}.click()`);
    await browser.wait("Boolean(document.querySelector('[role=alertdialog]'))");
    assert.equal(await browser.evaluate("window.__requests.some(request => request.method === 'delete')"), false);
    await browser.evaluate("[...document.querySelectorAll('[role=alertdialog] button')].find(button => button.innerText === 'Cancel').click()");
    await browser.wait("!document.querySelector('[role=alertdialog]')");
    assert.equal(await browser.evaluate("window.__requests.some(request => request.method === 'delete')"), false);
    await browser.evaluate(`${deleteTeam}.click()`);
    await browser.wait("Boolean(document.querySelector('[role=alertdialog]'))");
    await browser.evaluate("[...document.querySelectorAll('[role=alertdialog] button')].find(button => button.innerText === 'Confirm').click()");
    await browser.wait("window.__requests.some(request => request.method === 'delete' && request.url === '/admin/teams/platform')");

  } finally { await browser.close(); }
});
