import assert from "node:assert/strict";
import test from "node:test";
import { browserFixture } from "./browser-harness.mjs";

test("live logs expose pause and resume state", { timeout: 60000 }, async () => {
  const browser = await browserFixture();
  try {
    await browser.navigate("/org/demo/logs");
    await browser.wait("Boolean(document.querySelector('button[aria-label=\"Pause live updates\"]'))");
    await browser.evaluate("document.querySelector('button[aria-label=\"Pause live updates\"]').click()");
    await browser.wait("document.body.innerText.includes('Updates paused')");
    assert.equal(
      await browser.evaluate("Boolean(document.querySelector('button[aria-label=\"Resume live updates\"]'))"),
      true,
    );
  } finally {
    await browser.close();
  }
});

test("dirty monitor drafts require confirmation before closing", { timeout: 60000 }, async () => {
  const browser = await browserFixture();
  try {
    await browser.navigate("/org/demo/monitors");
    await browser.wait("document.body.innerText.includes('New monitor')");
    await browser.evaluate("[...document.querySelectorAll('button')].find((button) => button.innerText.includes('New monitor')).click()");
    await browser.wait("Boolean(document.getElementById('monitor-name'))");
    assert.match(await browser.evaluate("document.body.innerText"), /Rule preview/i);

    await browser.evaluate(`
      const input = document.getElementById('monitor-name');
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'Unsaved monitor');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    `);
    await browser.wait("document.getElementById('monitor-name').value === 'Unsaved monitor'");
    await browser.evaluate("[...document.querySelectorAll('button')].find((button) => button.innerText === 'Cancel').click()");
    await browser.wait("document.body.innerText.includes('Discard unsaved monitor changes?')");
    assert.equal(await browser.evaluate("Boolean(document.getElementById('monitor-name'))"), true);
    await browser.evaluate("[...document.querySelectorAll('button')].find((button) => button.innerText === 'Keep editing').click()");
    await browser.wait("!document.body.innerText.includes('Discard unsaved monitor changes?')");
    assert.equal(await browser.evaluate("Boolean(document.getElementById('monitor-name'))"), true);
  } finally {
    await browser.close();
  }
});
