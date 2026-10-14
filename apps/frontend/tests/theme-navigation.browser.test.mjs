import assert from "node:assert/strict";
import test from "node:test";
import { browserFixture } from "./browser-harness.mjs";

test("FE-B4: collapsed desktop sidebar keeps theme controls reachable", { timeout: 60000 }, async () => {
  const browser = await browserFixture();
  try {
    await browser.navigate("/org/demo/metrics");
    await browser.wait("Boolean(document.querySelector('[data-sidebar=trigger]'))");
    await browser.evaluate("document.querySelector('[data-sidebar=trigger]').click()");
    await browser.wait("document.querySelector('[data-sidebar=sidebar]').closest('[data-state]').getAttribute('data-state') === 'collapsed'");
    const visible = await browser.evaluate("Boolean([...document.querySelectorAll('button[aria-label=\"Toggle color theme\"]')].find(button => button.getBoundingClientRect().width > 0))");
    assert.equal(visible, true);
  } finally { await browser.close(); }
});

test("FE-B4: mobile rail exposes theme controls", { timeout: 60000 }, async () => {
  const browser = await browserFixture();
  try {
    await browser.viewport(390, 844);
    await browser.navigate("/org/demo/metrics");
    await browser.wait("Boolean([...document.querySelectorAll('button[aria-label=\"Toggle color theme\"]')].find(button => button.getBoundingClientRect().width > 0))");
    const visible = await browser.evaluate("Boolean([...document.querySelectorAll('button[aria-label=\"Toggle color theme\"]')].find(button => button.getBoundingClientRect().width > 0))");
    assert.equal(visible, true);
  } finally { await browser.close(); }
});

test("FE-C2a: login exposes theme controls and uses theme surfaces", { timeout: 60000 }, async () => {
  const browser = await browserFixture();
  try {
    await browser.navigate("/login?case=unauthenticated");
    await browser.wait("Boolean(document.getElementById('tenantSlug'))");
    assert.equal(await browser.evaluate("document.getElementById('tenantSlug').getAttribute('aria-describedby')"), "tenantSlug-help");
    assert.match(await browser.evaluate("document.getElementById('tenantSlug-help')?.innerText ?? ''"), /organization URL/i);
    const lightButton = "[...document.querySelectorAll('button')].find(button => button.getAttribute('aria-label') === 'Use light theme')";
    assert.equal(await browser.evaluate(`Boolean(${lightButton})`), true);
    await browser.evaluate(`${lightButton}.click()`);
    await browser.wait("document.documentElement.classList.contains('light')");
    const light = await browser.evaluate("[getComputedStyle(document.querySelector('main')).backgroundColor, getComputedStyle(document.body).backgroundColor]");
    assert.equal(light[0], light[1]);
    await browser.evaluate("[...document.querySelectorAll('button')].find(button => button.getAttribute('aria-label') === 'Use dark theme').click()");
    await browser.wait("document.documentElement.classList.contains('dark')");
    await browser.wait("getComputedStyle(document.querySelector('main')).backgroundColor === getComputedStyle(document.body).backgroundColor");
    const dark = await browser.evaluate("[getComputedStyle(document.querySelector('main')).backgroundColor, getComputedStyle(document.body).backgroundColor]");
    assert.equal(dark[0], dark[1]);
    assert.notEqual(dark[0], light[0]);
  } finally { await browser.close(); }
});
