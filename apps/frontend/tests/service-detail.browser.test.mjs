import assert from "node:assert/strict";
import test from "node:test";
import { browserFixture } from "./browser-harness.mjs";

test("FE-B5: service KPIs keep unknown values and link to scoped traces", { timeout: 60000 }, async () => {
  const browser = await browserFixture();
  try {
    await browser.navigate("/org/demo/services/api?case=service-partial&env=dev&range=1h");
    await browser.wait("document.body.innerText.includes('Latency Percentiles')");
    assert.equal(await browser.evaluate("document.body.innerText.includes('0.00%')"), false);
    assert.equal(await browser.evaluate("document.body.innerText.includes('—')"), true);
    const href = await browser.evaluate("[...document.querySelectorAll('a')].find(link => link.innerText.includes('View related traces'))?.getAttribute('href')");
    assert.ok(href?.startsWith("/org/demo/traces?"));
    const params = new URLSearchParams(href.split("?")[1]);
    assert.equal(params.get("service"), "api");
    assert.equal(params.get("env"), "dev");
    assert.equal(params.get("range"), "1h");
  } finally { await browser.close(); }
});

test("FE-B5: absent service summary has an explicit retry state", { timeout: 60000 }, async () => {
  const browser = await browserFixture();
  try {
    await browser.navigate("/org/demo/services/api?case=service-empty");
    await browser.wait("document.body.innerText.includes('No service summary available')");
    assert.equal(await browser.evaluate("Boolean([...document.querySelectorAll('button')].find(button => button.innerText.includes('Retry')))"), true);
  } finally { await browser.close(); }
});
