import React from "react";
import { createRoot } from "react-dom/client";
import App from "../src/app/app";
import { api } from "../src/shared/api/client";
import "../src/index.css";

const scenario = new URLSearchParams(location.search).get("case");
const traceId = "1234567890abcdef1234567890abcdef";
const records = [10, 20, null, 30, 40].map((sum, index) => ({
  serviceName: "api", metricName: "load", metricType: "gauge", metricUnit: "%",
  resourceAttributes: { "host.name": "node-a" }, attributes: {},
  timeUnix: `2026-10-13T00:0${index}:00Z`, count: 1, sum,
}));
(window as any).__requests = [];
api.defaults.adapter = async (config) => {
  (window as any).__requests.push({ url: config.url, params: config.params, headers: config.headers.toJSON() });
  let data: unknown = [];
  if (config.url?.startsWith("/auth/session")) data = { tenantSlug: "demo", role: "admin", teams: ["platform"] };
  else if (config.url?.startsWith("/metrics/detail")) data = { records };
  else if (config.url?.startsWith("/metrics")) data = {
    metrics: [{ tableName: "otel_metrics_gauge", metricType: "gauge", serviceName: "api", metricName: "load" }],
  };
  else if (config.url?.startsWith("/filters")) data = { services: ["api"], environments: ["dev", "production"], statuses: ["OK"] };
  else if (config.url?.startsWith("/traces/detail")) data = [{
    TraceId: traceId, SpanId: "1234567890abcdef", ParentSpanId: "",
    SpanName: "GET /fixture", ServiceName: "api", Timestamp: "2026-10-13T00:00:00Z",
    Duration: 1000000, StatusCode: "OK", SpanAttributes: {}, ResourceAttributes: {},
  }];
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
