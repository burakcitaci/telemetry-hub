import assert from "node:assert/strict";
import test from "node:test";
import { browserFixture } from "./browser-harness.mjs";

const cases = [
  { feature: "logs", field: "Body", original: "Fixture log", updated: "Updated log" },
  { feature: "traces", field: "SpanName", original: "GET /fixture", updated: "GET /updated" },
];

for (const { feature, field, original, updated } of cases) {
  test(`Live ${feature} refresh keeps the table visible through slow and failed requests`, { timeout: 60000 }, async () => {
    const browser = await browserFixture();
    const tableText = "document.querySelector('tbody')?.textContent";
    const hasRow = (value) => `Boolean(${tableText}?.includes(${JSON.stringify(value)}))`;
    const refreshing = `document.querySelector('button[aria-label="Refresh ${feature}"]').disabled`;
    try {
      await browser.navigate(`/org/demo/${feature}?env=all`);
      await browser.wait(hasRow(original));
      await browser.evaluate(`(async () => {
        const { api } = await import('/src/shared/api/client.ts');
        const adapter = api.defaults.adapter;
        api.defaults.adapter = async (config) => {
          const response = await adapter(config);
          if (config.url === '/${feature}') {
            response.data = await new Promise((resolve, reject) => {
              window.finishRefresh = (outcome) => {
                if (outcome === 'error') reject(new Error('Fixture refresh failed'));
                else if (outcome === 'empty') resolve([]);
                else resolve(response.data.map((row) => ({
                  ...row, ${field}: ${JSON.stringify(updated)},
                })));
              };
            });
          }
          return response;
        };
        window.refreshTelemetry = () => {
          window.finishRefresh = undefined;
          window.dispatchEvent(new CustomEvent('fixture-telemetry', {
            detail: { type: 'update', ${feature}Changed: true },
          }));
        };
      })()`);

      for (const [outcome, current] of [["success", original], ["error", updated], ["empty", updated]]) {
        await browser.evaluate("window.refreshTelemetry()");
        await browser.wait(`${refreshing} && Boolean(window.finishRefresh)`);
        assert.equal(await browser.evaluate(hasRow(current)), true);
        await browser.evaluate(`window.finishRefresh('${outcome}')`);
        await browser.wait(`!${refreshing}`);

        if (outcome === "success") assert.equal(await browser.evaluate(hasRow(updated)), true);
        if (outcome === "error") {
          assert.equal(await browser.evaluate(hasRow(updated)), true);
          assert.match(await browser.evaluate("document.querySelector('[role=alert]').textContent"), /Fixture refresh failed/);
        }
        if (outcome === "empty") assert.equal(await browser.evaluate(hasRow(updated)), false);
      }
    } finally {
      await browser.close();
    }
  });
}
