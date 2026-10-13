import assert from "node:assert/strict";
import test from "node:test";
import { browserFixture } from "./browser-harness.mjs";

test("FE-B4: collapsed desktop sidebar keeps theme controls reachable", { timeout: 60000 }, async () => {
  const browser = await browserFixture();
  try {
    await browser.navigate("/org/demo/metrics");
    await browser.evaluate("document.querySelector('[data-sidebar=trigger]').click()");
    await browser.wait("document.querySelector('[data-sidebar=sidebar]').getAttribute('data-state') === 'collapsed'");
    const visible = await browser.evaluate("Boolean([...document.querySelectorAll('button[aria-label=\"Use light theme\"]')].find(button => button.getBoundingClientRect().width > 0))");
    assert.equal(visible, true);
  } finally { await browser.close(); }
});

test("FE-B4: mobile rail exposes theme controls", { timeout: 60000 }, async () => {
  const browser = await browserFixture();
  try {
    await browser.viewport(390, 844);
    await browser.navigate("/org/demo/metrics");
    const visible = await browser.evaluate("Boolean([...document.querySelectorAll('button[aria-label=\"Use light theme\"]')].find(button => button.getBoundingClientRect().width > 0))");
    assert.equal(visible, true);
  } finally { await browser.close(); }
});
