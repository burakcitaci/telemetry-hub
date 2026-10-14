import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { InfrastructureDashboard } from "../src/features/infrastructure/infrastructure-dashboard";
import {
  countHosts,
  metricValue,
  parseHosts,
  selectedHost,
  type InfrastructureHost,
} from "../src/features/infrastructure/model";

Object.assign(globalThis, { React });
test("FE-A2: missing CPU renders unobserved instead of zero without weakening validation", () => {
  const missing = { id: "missing", hostname: "node-missing", status: "ok", metrics: { ram: 0, disk: 0 } };
  const parsed = parseHosts([missing]);
  const html = renderToStaticMarkup(<InfrastructureDashboard hosts={parsed} />);
  assert.match(html, /CPU unobserved/);
  assert.match(html, /title="unobserved"/);
  assert.match(html, /Memory usage[^>]*aria-valuenow="0"/);
  assert.doesNotMatch(html, /CPU usage[^>]*aria-valuenow="0"/);
  assert.equal(parseHosts([{ ...missing, metrics: { ...missing.metrics, cpu: null } }]).length, 1);
  assert.throws(() => parseHosts([{ ...missing, metrics: { ...missing.metrics, cpu: "missing" } }]));
});
const hosts: InfrastructureHost[] = [
  {
    id: "a",
    hostname: "node-a",
    status: "ok",
    metrics: { cpu: 45, ram: 72, disk: 0 },
  },
  {
    id: "b",
    hostname: "node-b",
    status: "warning",
    metrics: { cpu: 81, ram: 25, disk: 0 },
  },
  {
    id: "c",
    hostname: "node-c",
    status: "critical",
    metrics: { cpu: 96, ram: 32, disk: 0 },
  },
];

test("dashboard inherits the global theme without a local dark override", () => {
  for (const theme of ["light", "dark"]) {
    const html = renderToStaticMarkup(
      <div className={theme}>
        <InfrastructureDashboard hosts={hosts} />
      </div>,
    );
    assert.match(html, /<section class="infrastructure-dashboard"/);
    assert.doesNotMatch(html, /class="dark infrastructure-dashboard"/);
  }
  const css = readFileSync(
    new URL(
      "../src/features/infrastructure/infrastructure.css",
      import.meta.url,
    ),
    "utf8",
  );
  const tooltip = css.match(/\.infra-tooltip\s*\{([^}]+)\}/)?.[1] ?? "";
  assert.match(tooltip, /background:\s*hsl\(var\(--popover\)\)/);
  assert.match(tooltip, /color:\s*hsl\(var\(--popover-foreground\)\)/);
  assert.match(tooltip, /border-color:\s*hsl\(var\(--border\)\)/);
});

test("status summary and selection follow the latest snapshot", () => {
  assert.deepEqual(countHosts(hosts), {
    total: 3,
    ok: 1,
    warning: 1,
    critical: 1,
  });
  assert.equal(selectedHost(hosts, "b"), hosts[1]);
  assert.equal(selectedHost(hosts.slice(1), "a"), hosts[1]);
  assert.equal(selectedHost([], "a"), null);
  assert.equal(metricValue(Number.NaN), 0);
  assert.equal(metricValue(120), 100);
});

test("API parser rejects malformed or duplicate resources", () => {
  assert.deepEqual(parseHosts(hosts), hosts);
  assert.throws(() => parseHosts({ data: hosts }));
  assert.throws(() => parseHosts([hosts[0], hosts[0]]));
  assert.throws(() => parseHosts([{ ...hosts[0], status: "unknown" }]));
  assert.throws(() =>
    parseHosts([{ ...hosts[0], metrics: { cpu: Infinity } }]),
  );
});

test("dashboard renders compact accessible host controls and honest metric placeholders", () => {
  const html = renderToStaticMarkup(<InfrastructureDashboard hosts={hosts} />);
  assert.match(html, /aria-label="Search hosts"/);
  assert.match(html, /Total Hosts/);
  assert.equal((html.match(/class="infra-host-tile/g) ?? []).length, 3);
  assert.match(html, /aria-pressed="true"/);
  assert.match(html, /node-a: OK, CPU 45%, RAM 72%/);
  assert.match(html, /aria-valuenow="45"/);
  assert.match(html, /Memory/);
  assert.match(html, /Disk/);
  assert.match(html, /Network/);
  assert.match(html, /Not reported by Kubernetes Metrics API/);
  assert.match(html, /Not provided by this endpoint/);
});

test("loading, empty and stale states are explicit", () => {
  assert.match(
    renderToStaticMarkup(<InfrastructureDashboard hosts={[]} loading />),
    /Loading Kubernetes hosts/,
  );
  assert.match(
    renderToStaticMarkup(<InfrastructureDashboard hosts={[]} />),
    /No Kubernetes hosts found/,
  );
  const html = renderToStaticMarkup(
    <InfrastructureDashboard hosts={hosts} error="Unavailable" updatedAt={1} />,
  );
  assert.match(html, /data is stale/);
  assert.match(html, /role="alert"/);
  assert.match(html, /node-a/);
});
