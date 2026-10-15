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
api.defaults.adapter = async (config) => {
  (window as any).__requests.push({ url: config.url, method: config.method, body: config.data, params: config.params, headers: config.headers.toJSON() });
  let data: unknown = [];
  if (config.url?.startsWith("/auth/session")) data = { tenantSlug: "demo", role: "admin", teams: ["platform"] };
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
  else if (config.url?.startsWith("/admin/users")) {
    if (scenario === "admin-loading") await new Promise((resolve) => setTimeout(resolve, 500));
    const attempts = (window as any).__requests.filter((request: any) => request.url === "/admin/users").length;
    if (scenario === "admin-retry" && attempts === 1) throw new Error("Fixture admin load failed");
    data = [{ id: "user-a", email: "admin@example.test", role: "admin", teamId: "platform" }];
  }
  else if (config.url?.startsWith("/admin/teams")) data = [{ id: "platform", name: "Platform" }];
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
    data = config.method === "put" ? { ...monitor, isMuted: true } : [monitor];
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
  addEventListener() {}
  removeEventListener() {}
  close() {}
};
createRoot(document.getElementById("root")!).render(<App />);
(window as any).__fixtureReady = true;
