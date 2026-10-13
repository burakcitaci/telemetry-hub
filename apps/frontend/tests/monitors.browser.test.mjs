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
    assert.match(await browser.evaluate("document.body.innerText"), /Configuration only/);
  } finally { await browser.close(); }
});
