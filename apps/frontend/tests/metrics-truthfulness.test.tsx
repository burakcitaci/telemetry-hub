import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { recordToValue, formatValue, type RawRecord } from "../src/features/metrics/model";
import { CustomTooltip } from "../src/features/metrics/components/metrics-components";
Object.assign(globalThis, { React });
const record = { metricType: "gauge", count: 1, sum: null } as RawRecord;
test("FE-A1: null sample remains unknown and zero remains measured zero", () => {
  assert.equal(recordToValue(record), null);
  assert.equal(recordToValue({ ...record, sum: 0 }), 0);
  assert.equal(formatValue(null as any, "%"), "—");
});
test("FE-A1: tooltip explicitly says No data for a null sample", () => {
  const html = renderToStaticMarkup(<CustomTooltip active payload={[{ value: null, name: "node-a" }]} />);
  assert.match(html, /No data/);
});
