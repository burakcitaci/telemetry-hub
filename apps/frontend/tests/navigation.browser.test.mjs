import assert from "node:assert/strict";
import test from "node:test";
import { browserFixture } from "./browser-harness.mjs";
test("FE-A4: service detail keeps Services active in desktop and mobile navigation", { timeout: 60000 }, async () => {
  const browser = await browserFixture();
  try {
    await browser.navigate("/org/demo/services/foo");
    await browser.wait("document.querySelectorAll('a[href=\"/org/demo/services\"]').length >= 2");
    assert.equal(await browser.evaluate("[...document.querySelectorAll('a[href=\"/org/demo/services\"]')].every(link => link.getAttribute('aria-current') === 'page')"), true);
    await browser.navigate("/org/demo/services-other");
    await browser.wait("document.querySelectorAll('a[href=\"/org/demo/services\"]').length >= 2");
    assert.equal(await browser.evaluate("[...document.querySelectorAll('a[href=\"/org/demo/services\"]')].some(link => link.getAttribute('aria-current') === 'page')"), false);
  } finally { await browser.close(); }
});
