import assert from 'node:assert/strict';
import test from 'node:test';
import { browserFixture } from './browser-harness.mjs';

test('state history pages through ten events at a time with correct navigation boundaries', { timeout: 60000 }, async () => {
  const browser = await browserFixture();
  const history = "document.querySelector('[aria-label=\"State history\"]')";
  try {
    await browser.navigate('/org/demo/monitors?case=monitor-history');
    await browser.wait("Boolean(document.querySelector('div.group.grid'))");
    await browser.evaluate("document.querySelector('div.group.grid').click()");
    await browser.wait(`${history}?.querySelectorAll('li').length === 10`);
    const rows = () => browser.evaluate(`[...${history}.querySelectorAll('li')].map(row => row.lastElementChild.textContent.trim())`);
    const click = direction => browser.evaluate(`document.querySelector('[aria-label="${direction} state history page"]').click()`);
    assert.deepEqual(await rows(), Array.from({ length: 10 }, (_, index) => `History event ${index + 1}`));
    assert.ok(await browser.evaluate(`document.querySelector('[aria-label="Previous state history page"]').disabled`));
    await click('Next'); await browser.wait(`${history}.innerText.includes('11–20 of 23 events')`);
    assert.deepEqual(await rows(), Array.from({ length: 10 }, (_, index) => `History event ${index + 11}`));
    await click('Next'); await browser.wait(`${history}.innerText.includes('21–23 of 23 events')`);
    assert.deepEqual(await rows(), ['History event 21', 'History event 22', 'History event 23']);
    assert.ok(await browser.evaluate(`document.querySelector('[aria-label="Next state history page"]').disabled`));
    await click('Previous'); await browser.wait(`${history}.innerText.includes('11–20 of 23 events')`);
    assert.equal((await rows()).length, 10);
    await browser.viewport(390, 844);
    assert.equal(await browser.evaluate(`${history}.scrollWidth > ${history}.clientWidth`), false);
    await browser.key('Escape', 'Escape', 27);
    await browser.evaluate("document.querySelector('div.group.grid').click()");
    await browser.wait(`${history}?.innerText.includes('1–10 of 23 events')`);
  } finally { await browser.close(); }
});
