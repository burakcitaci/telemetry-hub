import { BrowserRouter } from 'react-router-dom';
import { RecoveryFixture } from './recovery-fixture';
import React from "react";
import { createRoot } from "react-dom/client";
import App from "../src/app/app";
import { api } from "../src/shared/api/client";
import "../src/index.css";

const scenario = new URLSearchParams(location.search).get("case");
const traceId = "1234567890abcdef1234567890abcdef";
const records = (scenario === "current" ? [10, 99] : scenario === "temporal" ? [10, 20, 30] : [10, 20, null, 30, 40]).map((sum, index) => ({
  serviceName: "api", metricName: "load", metricType: "gauge", metricUnit: "%",
  resourceAttributes: { "host.name": scenario === "current" ? (index ? "older" : "newer") : "node-a" }, attributes: {},
  timeUnix: scenario === "current" ? (index ? "2026-10-13T00:00:00Z" : "2026-10-13T00:10:00Z")
    : scenario === "temporal" && index === 2 ? "2026-10-13T00:10:00Z"
    : `2026-10-13T00:0${index}:00Z`, count: 1, sum,
}));
(window as any).__requests = [];
const generatedIngestionKey = "fixture_generated_ingestion_key_1234567890";
const fixtureIngestionKeys: any[] = [];
let canonicalMonitor: Record<string, unknown> | undefined;
const teamFlow = scenario === 'team-flow';
const operations = scenario === 'operations';
let destination: string | null = null;
const tests: Record<string, string>[] = [];
const maintenance: Record<string, string>[] = [];
let triage: Record<string, unknown> = { version: 0, notes: [] };
const fixtureTeams = [{ id: 'platform', name: 'Platform' }, ...((teamFlow || scenario === 'multiple-teams') ? [{ id: 'operations', name: 'Operations' }] : [])];
const fixtureUsers = [{ id: "user-a", email: "admin@example.test", role: "admin", teamId: "platform" }, ...(teamFlow ? [{ id: "user-b", email: "member@example.test", role: "user", teamId: "platform" }] : [])];
api.defaults.adapter = async (config) => {
  (window as any).__requests.push({ url: config.url, method: config.method, body: config.data, params: config.params, headers: config.headers.toJSON() });
  let data: unknown = [];
  if (config.url?.startsWith("/auth/session")) data = { tenantSlug: "demo", role: "admin", teams: fixtureTeams.map(team => team.id) };
  else if (config.url?.startsWith("/auth/login")) data = {
    tenantSlug: JSON.parse(String(config.data)).tenantSlug, role: "admin", teams: ["platform"],
  };
  else if (config.url?.startsWith("/metrics/detail")) data = { records };
  else if (config.url?.startsWith("/metrics")) data = {
    metrics: [{ tableName: "otel_metrics_gauge", metricType: "gauge", serviceName: "api", metricName: "load" }],
  };
  else if (config.url?.startsWith("/services/api/metrics")) data = scenario === "service-empty" ? null : {
    request_count: null, error_count: null, avg_duration: null,
    p50_duration: 0, p95_duration: null, p99_duration: null,
  };
  else if (config.url?.startsWith("/services")) data = [
    { ServiceName: "api" },
    { ServiceName: "worker" },
  ];
  else if (config.url?.startsWith("/service-metadata")) data = [];
  else if (config.url === "/admin/ingestion-keys" && config.method === "post") {
    const body = JSON.parse(String(config.data));
    const created = { id: "key-a", ...body, createdAt: Date.now(),
      expiresAt: Date.now() + body.expiresInDays * 86400000 };
    fixtureIngestionKeys.splice(0, fixtureIngestionKeys.length, created);
    data = { ...created, key: generatedIngestionKey };
  }
  else if (config.url === "/admin/ingestion-keys/key-a" && config.method === "delete") {
    fixtureIngestionKeys[0] = { ...fixtureIngestionKeys[0], revokedAt: Date.now() };
    data = { success: true };
  }
  else if (config.url?.startsWith("/admin/ingestion-keys")) data = [...fixtureIngestionKeys];
  else if (config.url === "/admin/users" && config.method === "post") {
    const attempts = (window as any).__requests.filter((request: any) => request.url === "/admin/users" && request.method === "post").length;
    if (scenario === "admin-retry" && attempts === 1) throw new Error("Fixture user save failed");
    const { email, role, teamId } = JSON.parse(String(config.data));
    data = { id: "user-b", email, role, teamId };
    fixtureUsers.push(data as typeof fixtureUsers[number]);
  }
  else if (config.url === '/admin/users/user-b' && config.method === 'patch') {
    const user = fixtureUsers.find(user => user.id === 'user-b')!;
    Object.assign(user, JSON.parse(String(config.data)));
    data = user;
  }
  else if (config.url?.startsWith("/admin/users")) {
    if (scenario === "admin-loading") await new Promise((resolve) => setTimeout(resolve, 500));
    const attempts = (window as any).__requests.filter((request: any) => request.url === "/admin/users").length;
    if (scenario === "admin-retry" && attempts === 1) throw new Error("Fixture admin load failed");
    data = [...fixtureUsers];
  }
  else if (config.url === '/admin/teams/operations' && config.method === 'patch') {
    const team = fixtureTeams.find(team => team.id === 'operations')!;
    Object.assign(team, JSON.parse(String(config.data)));
    data = team;
  }
  else if (config.url === '/admin/teams') data = fixtureTeams.map(team => ({ ...team }));
  else if (operations && config.url === '/admin/teams/platform/overview') data = {
    team: { id: 'platform', name: 'Platform' }, members: fixtureUsers, services: ['api'],
    monitors: [{ id: 'canonical-a', name: 'Fixture alert', enabled: true, state: 'FIRING', firing: true }],
    ingestion_keys: [{ id: 'key-a', name: 'API telemetry', expiresAt: Date.now() + 86_400_000 }],
  };
  else if (operations && config.url === '/admin/teams/platform/notifications') {
    if (config.method === 'patch') destination = JSON.parse(String(config.data)).destination;
    data = { destination, options: ['ops', 'backup'], tests: [...tests] };
  }
  else if (operations && config.url === '/admin/teams/platform/notifications/test') {
    const receipt = { id: 'test-a', destination: destination ?? '', at: new Date().toISOString(), status: 'SENT' };
    tests.unshift(receipt);
    data = receipt;
  }
  else if (operations && config.url === '/admin/maintenance') {
    if (config.method === 'post') maintenance.push({ id: 'window-a', ...JSON.parse(String(config.data)) });
    data = config.method === 'post' ? maintenance.at(-1) : [...maintenance];
  }
  else if (operations && config.url === '/alerts/alert-a/triage') {
    if (config.method === 'patch') {
      triage = { ...triage, version: 1, acknowledgment: { by: 'admin@example.test', at: new Date().toISOString() } };
      data = triage;
    } else data = { triage, self: 'user-a', assignees: fixtureUsers };
  }
  else if (config.url === '/ingestion-status') data = [
    { signal: 'logs', latest: String(Date.now()) }, { signal: 'traces', latest: null }, { signal: 'metrics', latest: null },
  ];
  else if (config.url === '/alerts') data = { items: [{
    id: 'alert-a', monitor_id: 'canonical-a', monitor_name: 'Fixture alert', signal_type: 'LOG',
    state: 'FIRING', value: 15, threshold: 10, window_seconds: 300, unit: 'logs',
    fired_at: '2026-10-13T00:00:00Z', team_id: 'platform', service: 'api', env: 'dev',
  }], next_offset: null };
  else if ((scenario === 'canonical' || teamFlow || operations) && config.url === '/monitors/preview' && config.method === 'post')
    data = { state: 'FIRING', operational_status: 'OK', value: 15, unit: 'logs' };
  else if ((scenario === 'canonical' || teamFlow) && config.url === '/monitors' && config.method === 'post') {
    const attempts = (window as any).__requests.filter((request: any) => request.url === '/monitors' && request.method === 'post');
    if (teamFlow && attempts.length === 1) throw new Error('Fixture monitor save failed');
    const configBody = JSON.parse(String(config.data));
    canonicalMonitor = { ...configBody, id: 'canonical-a', schemaVersion: 2, type: 'log', status: 'Alert',
      isMuted: false, targets: [], enabled: true, created_at: '2026-10-13T00:00:00Z',
      lastEvaluatedAt: '2026-10-13T00:00:00Z', runtime: { state: 'FIRING', operational_status: 'OK', value: 15, unit: 'logs' } };
    data = canonicalMonitor;
  }
  else if ((scenario === 'canonical' || teamFlow) && config.url === '/monitors' && canonicalMonitor) data = teamFlow ? [] : [canonicalMonitor];
  else if (config.url === '/monitors/canonical-a') data = canonicalMonitor;
  else if (config.url?.startsWith("/filters")) data = { services: ["api"], environments: ["dev", "production"], statuses: ["OK"] };
  else if (config.url?.startsWith("/logs")) data = [{
    Timestamp: new Date().toISOString(), TraceId: traceId, SpanId: "1234567890abcdef",
    SeverityText: "INFO", ServiceName: "api", Body: "Fixture log",
    ResourceAttributes: {}, LogAttributes: {},
  }];
  else if (/\/monitors\/[^/]+\/history$/.test(config.url ?? '')) {
    const from = Date.parse(config.params.from), to = Date.parse(config.params.to);
    data = { points: Array.from({ length: 6 }, (_, index) => ({ t: from + (to - from) * (index + 1) / 6, v: index + 1 })), unit: 'forecasts', bucketMs: (to - from) / 6 };
  }
  else if (config.url?.startsWith("/monitors")) {
    const monitor = {
    id: "monitor-a", name: "Fixture monitor", type: "metric", datadogType: "query alert",
    query: "avg:load{*} > 80", comparator: "above", threshold: 80, evaluationWindow: "5m",
    message: "", targets: [], createdAt: "2026-10-13T00:00:00Z", updatedAt: "2026-10-13T00:00:00Z",
    status: "OK", isMuted: false,
    events: scenario === 'monitor-history' ? Array.from({ length: 23 }, (_, index) => ({
      id: `event-${index + 1}`, at: new Date(Date.now() - index * 60_000).toISOString(),
      status: index % 2 ? 'OK' : 'Alert', message: `History event ${index + 1}`,
    })) : [],
    };
    data = config.url?.endsWith("/mute") && config.method === "post" ? { ...monitor, isMuted: JSON.parse(String(config.data)).isMuted } : config.method === "put" ? { ...monitor, isMuted: true } : [monitor];
  }
  else if (config.url?.startsWith("/traces/detail")) {
    if (scenario === "retry" && (window as any).__requests.filter((request: any) => request.url === "/traces/detail").length === 1) {
      throw new Error("Fixture query failed");
    }
    data = [{
    TraceId: traceId, SpanId: "1234567890abcdef", ParentSpanId: "",
    SpanName: "GET /fixture", ServiceName: "api", Timestamp: "2026-10-13T00:00:00Z",
    Duration: 1000000, StatusCode: "OK", SpanAttributes: {}, ResourceAttributes: {},
    }];
  }
  else if (config.url?.startsWith("/traces")) data = [{
    TraceId: traceId, SpanName: "GET /fixture", ServiceName: "api",
    Timestamp: new Date().toISOString(), Duration: 1000000, StatusCode: "OK",
    SpanCount: 1, ServiceCount: 1,
  }];
  if (scenario === "unauthenticated" && config.url?.startsWith("/auth/session")) throw new Error("No session");
  return { data, status: 200, statusText: "OK", headers: {}, config };
};
// No real backend or stream connection is used by this isolated browser fixture.
(window as any).EventSource = class {
  onmessage?: (message: { data: string }) => void;
  private readonly emit = (event: Event) => {
    this.onmessage?.({ data: JSON.stringify((event as CustomEvent).detail) });
  };

  constructor() { window.addEventListener("fixture-telemetry", this.emit); }
  addEventListener() {}
  removeEventListener() {}
  close() { window.removeEventListener("fixture-telemetry", this.emit); }
};
createRoot(document.getElementById("root")!).render(scenario === 'render-error' ? <BrowserRouter><RecoveryFixture /></BrowserRouter> : <App />);
(window as any).__fixtureReady = true;
