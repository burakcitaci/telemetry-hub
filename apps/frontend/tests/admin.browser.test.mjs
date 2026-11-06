import assert from "node:assert/strict";
import test from "node:test";
import { browserFixture } from "./browser-harness.mjs";

test("FE-B6: admin distinguishes initial loading from empty data", { timeout: 60000 }, async () => {
  const browser = await browserFixture();
  try {
    await browser.navigate("/org/demo/admin?case=admin-loading");
    await browser.wait("document.body.innerText.includes('Loading administration')");
    assert.equal(await browser.evaluate(`[...document.querySelectorAll('[role="tab"][aria-controls$="content-teams"]')][0]?.querySelector('.rounded-full')?.textContent === '0'`), false);
    await browser.wait(`[...document.querySelectorAll('[role="tab"][aria-controls$="content-teams"]')][0]?.querySelector('.rounded-full')?.textContent === '1'`);
  } finally { await browser.close(); }
});

test("FE-B6: admin retry preserves entered form state", { timeout: 60000 }, async () => {
  const browser = await browserFixture();
  try {
    await browser.navigate("/org/demo/admin?case=admin-retry");
    await browser.wait("document.body.innerText.includes('Fixture admin load failed')");
    await browser.evaluate(`const input = document.querySelector('input[name="id"]');
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'keep-me');
      input.dispatchEvent(new Event('input', { bubbles: true }));`);
    await browser.evaluate("[...document.querySelectorAll('button')].find(button => button.innerText.includes('Wiederholen')).click()");
    await browser.wait(`[...document.querySelectorAll('[role="tab"][aria-controls$="content-teams"]')][0]?.querySelector('.rounded-full')?.textContent === '1'`);
    assert.equal(await browser.evaluate("document.querySelector('input[name=\"id\"]').value"), "keep-me");
  } finally { await browser.close(); }
});

test("TASK-INGESTION-KEY-1: admin generates a one-time client key", { timeout: 60000 }, async () => {
  const browser = await browserFixture();
  try {
    await browser.navigate("/org/demo/admin");
    await browser.wait("Boolean(document.querySelector('[name=teamId] option[value=platform]')) && document.body.innerText.includes('Ingestion-Keys')");
    await browser.evaluate(`(() => {
      const tab = Array.from(document.querySelectorAll('[role="tab"]'))
        .find(tab => tab.textContent.includes('Ingestion-Keys'));
      tab.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
    })()`);
    await browser.wait(`document.querySelector('[role="tab"][aria-selected="true"]')
      ?.textContent.includes('Ingestion-Keys')`);
    await browser.evaluate(`const set = (name, value) => { const input = document.querySelector('input[name="expiresInDays"]').closest('form').querySelector('[name="' + name + '"]');
      Object.getOwnPropertyDescriptor(input instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype, 'value').set.call(input, value);
      input.dispatchEvent(new Event('change', { bubbles: true })); };
      set('name', 'orders-production'); set('teamId', 'platform'); set('env', 'production');
      [...document.querySelectorAll('button')].find(button => button.innerText === 'Key erzeugen').click();`);
    await browser.wait("document.querySelector('[aria-label=\"Generated ingestion key\"]')?.value.includes('fixture_generated')");
    assert.equal(await browser.evaluate("document.body.innerText.includes('orders-production')"), true);
    const request = await browser.evaluate(`window.__requests.find(request => request.url === '/admin/ingestion-keys' && request.method === 'post')`);
    assert.equal(JSON.parse(request.body).teamId, "platform");
    assert.equal(JSON.parse(request.body).expiresInDays, 30);
    await browser.evaluate(`Object.defineProperty(navigator, 'clipboard', { configurable: true,
      value: { writeText: async value => { window.__copiedKey = value; } } });
      [...document.querySelectorAll('button')].find(button => button.innerText === 'Kopieren').click();`);
    await browser.wait("document.body.innerText.includes('Key copied.')");
    assert.equal(await browser.evaluate("window.__copiedKey"), await browser.evaluate("document.querySelector('[aria-label=\"Generated ingestion key\"]').value"));
    await browser.evaluate(`navigator.clipboard.writeText = async () => { throw new Error('Fixture clipboard denied'); };
      [...document.querySelectorAll('button')].find(button => button.innerText === 'Kopieren').click();`);
    await browser.wait("document.body.innerText.includes('Copy failed.')");
    await browser.evaluate(`(() => {
      const tab = Array.from(document.querySelectorAll('[role="tab"]'))
        .find(tab => tab.textContent.includes('Benutzer'));
      tab.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
    })()`);
    await browser.wait(`document.querySelector('[role="tab"][aria-selected="true"]')
      ?.textContent.includes('Benutzer')`);
    await browser.evaluate(`(() => {
      const tab = Array.from(document.querySelectorAll('[role="tab"]'))
        .find(tab => tab.textContent.includes('Ingestion-Keys'));
      tab.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
    })()`);
    await browser.wait(`document.querySelector('[role="tab"][aria-selected="true"]')
      ?.textContent.includes('Ingestion-Keys')`);
    assert.equal(await browser.evaluate("document.querySelector('[aria-label=\"Generated ingestion key\"]').value.includes('fixture_generated')"), true);

  } finally { await browser.close(); }
});
