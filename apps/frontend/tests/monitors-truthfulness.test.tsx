import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as model from "../src/features/monitors/model";
import { StatusBadge } from "../src/features/monitors/components/monitors-components";
Object.assign(globalThis, { React });
test("FE-A3: monitor without valid evaluation timestamp never renders OK", () => {
  const normalize = (model as any).normalizeMonitorEvaluation;
  assert.equal(typeof normalize, "function");
  for (const lastEvaluatedAt of [undefined, "", "invalid"]) {
    const monitor = normalize({ id: "a", status: "OK", lastEvaluatedAt });
    assert.equal(monitor.status, "Unknown");
    const html = renderToStaticMarkup(<StatusBadge status={monitor.status} />);
    assert.match(html, /Unknown/);
    assert.doesNotMatch(html, />OK</);
  }
  assert.equal(normalize({ status: "OK", lastEvaluatedAt: "2026-10-13T00:00:00Z" }).status, "OK");
});
