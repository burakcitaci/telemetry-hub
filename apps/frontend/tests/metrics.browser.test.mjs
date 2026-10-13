import assert from "node:assert/strict";
import test from "node:test";
import { browserFixture } from "./browser-harness.mjs";
test("FE-A1: real metrics chart does not bridge a null and discloses zero ambiguity", { timeout: 60000 }, async () => {
  const browser = await browserFixture();
  try {
    await browser.navigate("/org/demo/metrics?case=gap");
    await browser.wait("Boolean(document.querySelector('.recharts-line-curve'))");
    const path = await browser.evaluate("document.querySelector('.recharts-line-curve').getAttribute('d')");
    assert.equal((path.match(/M/g) ?? []).length, 2);
    assert.match(await browser.evaluate("document.body.innerText"), /0 values cannot be distinguished from missing data until backend returns null/);
  } finally { await browser.close(); }
});
