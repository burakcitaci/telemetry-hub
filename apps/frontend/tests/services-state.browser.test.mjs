import assert from "node:assert/strict";
import test from "node:test";
import { browserFixture } from "./browser-harness.mjs";

test("FE-C5: service search has one control and a distinct no-match state", { timeout: 60000 }, async () => {
  const browser = await browserFixture();
  try {
    await browser.navigate("/org/demo/services?q=missing");
    await browser.wait("document.body.innerText.includes('No services match')");

    const visibleSearchCount = await browser.evaluate(`
      [...document.querySelectorAll('input[aria-label="Search services…"]')]
        .filter((input) => input.getBoundingClientRect().width > 0).length
    `);
    assert.equal(visibleSearchCount, 1);

    await browser.evaluate(`
      [...document.querySelectorAll('button')]
        .find((button) => button.innerText.includes('Clear search')).click()
    `);
    await browser.wait("document.body.innerText.includes('api') && document.body.innerText.includes('worker')");
  } finally {
    await browser.close();
  }
});
