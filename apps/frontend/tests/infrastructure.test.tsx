import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { InfrastructureDashboard } from "../src/features/infrastructure/infrastructure-dashboard";
import {
  countHosts,
  metricValue,
  countResources,
  parseInfrastructure,
  selectedHost,
  type InfrastructureHost,
} from "../src/features/infrastructure/model";

Object.assign(globalThis, { React });
test("FE-A2: missing CPU renders unobserved instead of zero without weakening validation", () => {
  const missing: InfrastructureHost = { id: "missing", hostname: "node-missing", status: "ok", metrics: { cpu: null, ram: 0, disk: null } };
  const html = renderToStaticMarkup(<InfrastructureDashboard snapshot={{ ...snapshot, nodes: [missing] }} />);
  assert.match(html, /CPU[\s\S]*title="unobserved"/);
  assert.match(html, /title="unobserved"/);
  assert.match(html, /Memory usage[^>]*aria-valuenow="0"/);
  assert.doesNotMatch(html, /CPU usage[^>]*aria-valuenow="0"/);
  assert.throws(() => parseInfrastructure({ ...snapshot, nodes: [{ ...missing, metrics: { ...missing.metrics, cpu: "missing" } }] }));
});
const hosts: InfrastructureHost[] = [
  {
    id: "a",
    hostname: "node-a",
    status: "ok",
    metrics: { cpu: 45, ram: 72, disk: null },
  },
  {
    id: "b",
    hostname: "node-b",
    status: "warning",
    metrics: { cpu: 81, ram: 25, disk: null },
  },
  {
    id: "c",
    hostname: "node-c",
    status: "critical",
    metrics: { cpu: 96, ram: 32, disk: null },
  },
];
const snapshot = {
  collectedAt: "2026-10-14T10:00:00.000Z", metricsAvailable: true, nodes: hosts,
  namespaces: [{ name: "demo", phase: "Active", status: "ok" as const }],
  workloads: [{ id: "deployment/api", name: "api", namespace: "demo", kind: "Deployment" as const,
    status: "ok" as const, desired: 1, ready: 1, available: 1 }],
  pods: [{ id: "pod/api", name: "api-1", namespace: "demo", nodeName: "node-a", phase: "Running",
    status: "ok" as const, restarts: 2, containers: [{ name: "api", image: "api:v1", ready: true,
      restarts: 2, state: "running" }] }],
  services: [{ id: "service/api", name: "api", namespace: "demo", type: "ClusterIP",
    clusterIp: "10.0.0.1", ports: ["80/TCP"] }],
};

test("dashboard inherits the global theme without a local dark override", () => {
  for (const theme of ["light", "dark"]) {
    const html = renderToStaticMarkup(
      <div className={theme}>
        <InfrastructureDashboard snapshot={snapshot} />
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
  const card = css.match(/\.infra-card\s*\{([^}]+)\}/)?.[1] ?? "";
  assert.match(card, /background:\s*hsl\(var\(--card\)\)/);
  assert.match(card, /border:\s*1px solid hsl\(var\(--border\)\)/);
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
  assert.deepEqual(countResources(snapshot), { nodes: 3, namespaces: 1, workloads: 1, pods: 1, containers: 1, services: 1 });
});

test("API parser rejects malformed or duplicate resources", () => {
  assert.deepEqual(parseInfrastructure(snapshot), snapshot);
  assert.throws(() => parseInfrastructure({ data: snapshot }));
  assert.throws(() => parseInfrastructure({ ...snapshot, nodes: [hosts[0], hosts[0]] }));
  assert.throws(() => parseInfrastructure({ ...snapshot, nodes: [{ ...hosts[0], status: "unknown" }] }));
  assert.throws(() =>
    parseInfrastructure({ ...snapshot, nodes: [{ ...hosts[0], metrics: { cpu: Infinity } }] }),
  );
});

test("dashboard renders a 70/30 resource-first layout without the host map", () => {
  const html = renderToStaticMarkup(<InfrastructureDashboard snapshot={snapshot} />);
  assert.match(html, /namespaces/);
  assert.doesNotMatch(html, /HOST MAP|Search hosts|infra-host-tile/);
  assert.match(html, /Cluster resources/);
  assert.match(html, /Node overview/i);
  assert.match(html, /Workloads/);
  assert.match(html, /Pods/);
  assert.match(html, /Services/);
  assert.match(html, /<summary class="infra-resource-link">api<\/summary>/);
  assert.match(html, /aria-valuenow="45"/);
  assert.match(html, /Memory/);
  assert.match(html, /Disk/);
  assert.match(html, /Network/);
  assert.match(html, /Not reported by Kubernetes Metrics API/);
  assert.match(html, /Not provided by this endpoint/);
  assert.doesNotMatch(html, /Pods and containers/);
  const css = readFileSync(new URL("../src/features/infrastructure/infrastructure.css", import.meta.url), "utf8");
  assert.match(css, /grid-template-columns:\s*minmax\(0, 7fr\) minmax\(240px, 3fr\)/);
  assert.match(css, /position:\s*sticky/);
  assert.doesNotMatch(css, /overflow-x:\s*(auto|scroll)/);
});

test("missing node metrics guidance is contained in the sticky host details panel", () => {
  const html = renderToStaticMarkup(<InfrastructureDashboard snapshot={{ ...snapshot, metricsAvailable: false,
    nodes: [{ ...hosts[0], metrics: { cpu: null, ram: null, disk: null } }] }} />);
  assert.match(html, /infra-details-sticky[\s\S]*Node metrics unavailable[\s\S]*Configure Metrics API/);
  assert.doesNotMatch(html, /infra-notice[^>]*>Node CPU and memory/);
});

test("loading, empty and stale states are explicit", () => {
  assert.match(
    renderToStaticMarkup(<InfrastructureDashboard snapshot={{ ...snapshot, collectedAt: "", nodes: [] }} loading />),
    /Loading Kubernetes nodes/,
  );
  assert.match(
    renderToStaticMarkup(<InfrastructureDashboard snapshot={{ ...snapshot, collectedAt: "", nodes: [] }} />),
    /No Kubernetes nodes found/,
  );
  const html = renderToStaticMarkup(
    <InfrastructureDashboard snapshot={snapshot} error="Unavailable" updatedAt={1} />,
  );
  assert.match(html, /data is stale/);
  assert.match(html, /role="alert"/);
  assert.match(html, /node-a/);
});
