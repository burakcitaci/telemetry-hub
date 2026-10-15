import assert from "node:assert/strict";
import test from "node:test";
import { browserFixture } from "./browser-harness.mjs";
test("FE-A3: real monitor row shows Unknown without evaluation evidence", { timeout: 60000 }, async () => {
  const browser = await browserFixture();
  try {
    await browser.navigate("/org/demo/monitors");
    await browser.wait("document.body.innerText.includes('Fixture monitor')");
    const row = await browser.evaluate("[...document.querySelectorAll('div.group.grid')].find(row => row.innerText.includes('Fixture monitor')).innerText");
    assert.match(row, /Unknown/i);
    assert.doesNotMatch(row, /\bOK\b/);
    await browser.evaluate("document.querySelector('div.group.grid').click()");
    await browser.wait("Boolean(document.querySelector('[role=dialog]'))");
    const detail = await browser.evaluate("document.querySelector('[role=dialog]').innerText");
    assert.match(detail, /Awaiting first evaluation/);
    assert.doesNotMatch(detail, /Last evaluated:/);
  } finally { await browser.close(); }
});
