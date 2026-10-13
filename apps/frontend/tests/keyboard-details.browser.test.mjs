import assert from "node:assert/strict";
import test from "node:test";
import { browserFixture } from "./browser-harness.mjs";
test("FE-B1: Tab then Enter/Space opens log, trace and monitor details without nested double activation", { timeout: 60000 }, async () => {
  const browser = await browserFixture();
  try {
    for (const feature of ["logs", "traces", "monitors"]) {
      await browser.navigate("/org/demo/" + feature);
      const selector = feature === "monitors" ? "div.group.grid" : "tbody tr";
      await browser.wait(`Boolean(document.querySelector('${selector}')) && !document.body.innerText.includes('Loading')`);
      assert.equal(await browser.evaluate(`document.querySelector('${selector}').tabIndex`), 0);
      await browser.evaluate(`const row = document.querySelector('${selector}');
        row.insertAdjacentHTML('beforebegin', '<button id="keyboard-start">Start</button>');
        document.getElementById('keyboard-start').focus();`);
      await browser.key("Tab", "Tab", 9);
      assert.equal(await browser.evaluate(`document.activeElement === document.querySelector('${selector}')`), true);
      await browser.key(feature === "monitors" ? " " : "Enter", feature === "monitors" ? "Space" : "Enter", feature === "monitors" ? 32 : 13);
      await browser.wait("Boolean(document.querySelector('[role=dialog]'))");
      assert.equal(await browser.evaluate("document.querySelectorAll('[role=dialog]').length"), 1);
    }
    await browser.navigate("/org/demo/logs");
    await browser.wait("Boolean(document.querySelector('button[aria-label^=\"Open trace \" ]'))");
    await browser.evaluate("document.querySelector('button[aria-label^=\"Open trace \" ]').focus()");
    await browser.key("Enter");
    await browser.wait("Boolean(document.querySelector('[role=dialog]'))");
    assert.equal(await browser.evaluate("document.querySelectorAll('[role=dialog]').length"), 1);
    assert.match(await browser.evaluate("document.querySelector('[role=dialog]').innerText"), /Trace details/);
    assert.doesNotMatch(await browser.evaluate("document.querySelector('[role=dialog]').innerText"), /Log details/);
    await browser.navigate("/org/demo/monitors");
    await browser.wait("Boolean(document.querySelector('button[title=Mute]'))");
    await browser.evaluate("document.querySelector('button[title=Mute]').focus()");
    await browser.key(" ", "Space", 32);
    await browser.wait("window.__requests.some(request => request.url === '/monitors/monitor-a')");
    assert.equal(await browser.evaluate("Boolean(document.querySelector('[role=dialog]'))"), false);
    await browser.evaluate("window.confirm = () => false; document.querySelector('button[title=Delete]').focus()");
    await browser.key("Enter");
    assert.equal(await browser.evaluate("Boolean(document.querySelector('[role=dialog]'))"), false);
  } finally { await browser.close(); }
});
