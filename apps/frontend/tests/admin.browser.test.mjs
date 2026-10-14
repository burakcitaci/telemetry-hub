import assert from "node:assert/strict";
import test from "node:test";
import { browserFixture } from "./browser-harness.mjs";

test("FE-B6: admin distinguishes initial loading from empty data", { timeout: 60000 }, async () => {
  const browser = await browserFixture();
  try {
    await browser.navigate("/org/demo/admin?case=admin-loading");
    await browser.wait("document.body.innerText.includes('Loading administration')");
    assert.equal(await browser.evaluate("document.body.innerText.includes('Teams (0)')"), false);
    await browser.wait("document.body.innerText.includes('Teams (1)')");
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
    await browser.wait("document.body.innerText.includes('Teams (1)')");
    assert.equal(await browser.evaluate("document.querySelector('input[name=\"id\"]').value"), "keep-me");
  } finally { await browser.close(); }
});
