import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { recordToValue, formatValue, type RawRecord } from "../src/features/metrics/model";
import { CustomTooltip } from "../src/features/metrics/components/metrics-components";
import { latestObservation } from "../src/features/metrics/hooks/use-metrics";
Object.assign(globalThis, { React });
const record = { metricType: "gauge", count: 1, sum: null } as RawRecord;
test("FE-A1: null sample remains unknown and zero remains measured zero", () => {
  assert.equal(recordToValue(record), null);
  assert.equal(recordToValue({ ...record, sum: 0 }), 0);
  assert.equal(formatValue(null as any, "%"), "—");
});
test("FE-A7: latest observation ignores unknown/invalid points and makes group ties deterministic", () => {
  const group = (id: string, timestamp: string, value: number | null) =>
    ({ id, label: id, color: "", unit: "", data: [{ timestamp, value, time: "" }] });
  const newer = group("a", "2026-10-13T00:10:00Z", 10);
  const older = group("b", "2026-10-13T00:00:00Z", 99);
  assert.equal(latestObservation([newer, older])?.value, 10);
  assert.equal(latestObservation([older])?.value, 99);
  assert.equal(latestObservation([group("a", "invalid", 2), group("b", "2026-10-13T00:00:00Z", null)]), null);
  assert.equal(latestObservation([group("z", newer.data[0].timestamp, 20), newer])?.groupId, "a");
  assert.equal(latestObservation([]), null);
});
test("FE-A1: tooltip explicitly says No data for a null sample", () => {
  const html = renderToStaticMarkup(<CustomTooltip active payload={[{ value: null, name: "node-a" }]} />);
  assert.match(html, /No data/);
});
