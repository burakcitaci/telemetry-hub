import assert from "node:assert/strict";
import test from "node:test";
import { browserFixture } from "./browser-harness.mjs";
test("FE-A8: irregular metric samples use elapsed-time spacing", { timeout: 60000 }, async () => {
  const browser = await browserFixture();
  try {
    await browser.navigate("/org/demo/metrics?case=temporal");
    await browser.wait("document.querySelectorAll('.recharts-line-dot').length === 3");
    const x = await browser.evaluate("[...document.querySelectorAll('.recharts-line-dot')].map(dot => Number(dot.getAttribute('cx')))");
    assert.ok(Math.abs((x[2] - x[1]) / (x[1] - x[0]) - 9) < 0.05, JSON.stringify(x));
  } finally { await browser.close(); }
});
test("FE-A7: current is the newest observation, not the last flattened group", { timeout: 60000 }, async () => {
  const browser = await browserFixture();
  try {
    await browser.navigate("/org/demo/metrics?case=current");
    await browser.wait("document.body.innerText.includes('99.000')");
    const card = await browser.evaluate("[...document.querySelectorAll('p')].find(p => /^(Current|Latest observation)/.test(p.textContent))?.parentElement.textContent");
    assert.match(card, /10\.000/);
    assert.match(card, /newer/);
    assert.match(card, /2026-10-13T00:10:00Z/);
  } finally { await browser.close(); }
});
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
