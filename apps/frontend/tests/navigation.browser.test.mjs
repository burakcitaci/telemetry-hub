import assert from "node:assert/strict";
import test from "node:test";
import { browserFixture } from "./browser-harness.mjs";
test("FE-A5: unknown global and organization routes show not found; root and auth redirects remain", { timeout: 60000 }, async () => {
  const browser = await browserFixture();
  try {
    for (const path of ["/does-not-exist", "/org/demo/does-not-exist"]) {
      await browser.navigate(path);
      await browser.wait("document.body.innerText.includes('Route not found')");
      assert.equal(await browser.evaluate("location.pathname"), path);
      assert.equal(await browser.evaluate("Boolean([...document.querySelectorAll('a')].find(a => a.innerText.includes('Back to Metrics')))"), true);
    }
    await browser.navigate("/");
    await browser.wait("location.pathname === '/org/demo/metrics'");
    await browser.navigate("/org/demo/traces?case=unauthenticated");
    await browser.wait("location.pathname === '/login'");
  } finally { await browser.close(); }
});
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
