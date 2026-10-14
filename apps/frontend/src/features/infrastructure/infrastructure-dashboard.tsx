import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  countHosts, countResources, metricValue, selectedHost, STATUS_LABELS,
  type InfrastructureHost, type InfrastructureSnapshot, type WorkloadSummary,
} from "./model";

interface DashboardProps {
  snapshot: InfrastructureSnapshot;
  loading?: boolean;
  error?: string | null;
  updatedAt?: number | null;
}

export function InfrastructureDashboard({ snapshot, loading = false, error, updatedAt }: DashboardProps) {
  const host = selectedHost(snapshot.nodes, null);
  const history = useMetricHistory(host, snapshot.collectedAt);
  return <section className="infrastructure-dashboard" aria-label="Infrastructure monitoring" aria-busy={loading}>
    <DashboardHeader updatedAt={updatedAt} error={error} />
    <CountBar snapshot={snapshot} />
    {error && <p className="infra-notice" role="alert">{error} {updatedAt
      ? "Showing last successful snapshot — data is stale." : "No snapshot available."}</p>}
    <div className="infra-dashboard-grid">
      <main className="infra-core-view">
        <InfrastructureResources snapshot={snapshot} />
        <NodeOverview host={host} history={history} loading={loading} error={error} />
      </main>
      <HostMetrics host={host} metricsAvailable={snapshot.metricsAvailable} />
    </div>
  </section>;
}

function DashboardHeader({ updatedAt, error }: Pick<DashboardProps, "updatedAt" | "error">) {
  return <header className="infra-header"><div><h1>Infrastructure</h1>
    <span className="infra-muted">Kubernetes / Cluster-wide operator view</span></div>
    <span className="infra-freshness"><span className={`infra-indicator ${error ? "is-stale" : ""}`} />
      {error ? "Stale" : updatedAt ? "Polling" : "Connecting"}
      {updatedAt && <time dateTime={new Date(updatedAt).toISOString()}> · {new Date(updatedAt).toLocaleTimeString()}</time>}
    </span></header>;
}

function CountBar({ snapshot }: Pick<DashboardProps, "snapshot">) {
  const status = countHosts(snapshot.nodes);
  const counts = countResources(snapshot);
  return <div className="infra-counts" aria-label="Infrastructure resource summary">
    {Object.entries(counts).map(([label, count]) => <div key={label}><strong>{count}</strong><span>{label}</span></div>)}
    {(["ok", "warning", "critical"] as const).map((state) => <div key={state}>
      <span className={`infra-status-dot status-${state}`} /><strong>{status[state]}</strong>
      <span>{STATUS_LABELS[state]} nodes</span></div>)}
  </div>;
}

function InfrastructureResources({ snapshot }: { snapshot: InfrastructureSnapshot }) {
  const [namespace, setNamespace] = useState("all");
  const visible = <T extends { namespace: string }>(items: T[]) =>
    items.filter((item) => namespace === "all" || item.namespace === namespace);
  return <section className="infra-card infra-resources" aria-label="Kubernetes resources">
    <div className="infra-resource-toolbar"><div><h2>Cluster resources</h2>
      <p>Health and readiness across the cluster</p></div>
      <label>Namespace <select value={namespace} onChange={(event) => setNamespace(event.target.value)}>
        <option value="all">All namespaces</option>
        {snapshot.namespaces.map((item) => <option key={item.name}>{item.name}</option>)}
      </select></label></div>
    <Tabs defaultValue="workloads"><TabsList className="infra-tabs">
      <TabsTrigger value="workloads">Workloads <b>{visible(snapshot.workloads).length}</b></TabsTrigger>
      <TabsTrigger value="pods">Pods <b>{visible(snapshot.pods).length}</b></TabsTrigger>
      <TabsTrigger value="services">Services <b>{visible(snapshot.services).length}</b></TabsTrigger>
    </TabsList>
      <TabsContent value="workloads"><WorkloadTable items={visible(snapshot.workloads)} /></TabsContent>
      <TabsContent value="pods"><PodTable items={visible(snapshot.pods)} /></TabsContent>
      <TabsContent value="services"><ServiceTable items={visible(snapshot.services)} /></TabsContent>
    </Tabs>
  </section>;
}

function WorkloadTable({ items }: { items: InfrastructureSnapshot["workloads"] }) {
  return <ResourceTable headers={["Name", "Kind", "Namespace", "Ready", "Status"]} empty="No workloads found." rowCount={items.length}>
    {items.map((item) => <WorkloadRow key={item.id} item={item} />)}
  </ResourceTable>;
}

function WorkloadRow({ item }: { item: WorkloadSummary }) {
  return <tbody className="infra-expandable"><tr><td><details><summary className="infra-resource-link">{item.name}</summary>
    <div className="infra-expanded-detail">Available {item.available} · Desired {item.desired} · ID {item.id}</div>
  </details></td><td>{item.kind}</td><td>{item.namespace}</td><td>{item.ready}/{item.desired}</td>
    <td><StatusBadge status={item.status} /></td></tr></tbody>;
}

function PodTable({ items }: { items: InfrastructureSnapshot["pods"] }) {
  return <ResourceTable headers={["Pod", "Namespace", "Phase", "Ready", "Restarts"]} empty="No pods found." rowCount={items.length}>
    <tbody>{items.map((item) => <tr key={item.id}><td className="infra-name-cell" title={item.name}>{item.name}</td>
      <td>{item.namespace}</td><td>{item.phase}</td><td>{item.containers.filter((value) => value.ready).length}/{item.containers.length}</td>
      <td>{item.restarts}</td></tr>)}</tbody>
  </ResourceTable>;
}

function ServiceTable({ items }: { items: InfrastructureSnapshot["services"] }) {
  return <ResourceTable headers={["Service", "Namespace", "Type", "Cluster IP", "Ports"]} empty="No services found." rowCount={items.length}>
    <tbody>{items.map((item) => <tr key={item.id}><td className="infra-name-cell" title={item.name}>{item.name}</td>
      <td>{item.namespace}</td><td>{item.type}</td><td>{item.clusterIp ?? "—"}</td><td>{item.ports.join(", ") || "—"}</td></tr>)}</tbody>
  </ResourceTable>;
}

function ResourceTable({ headers, empty, rowCount, children }: { headers: string[]; empty: string; rowCount: number; children: React.ReactNode }) {
  return <div className="infra-table-frame"><table><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>
    {rowCount ? children : <tbody><tr><td colSpan={headers.length}>{empty}</td></tr></tbody>}</table></div>;
}

function StatusBadge({ status }: { status: InfrastructureHost["status"] }) {
  return <span className={`infra-status-badge status-text-${status}`}><span className={`infra-status-dot status-${status}`} />
    {STATUS_LABELS[status]}</span>;
}

function NodeOverview({ host, history, loading, error }: { host: InfrastructureHost | null;
  history: MetricHistory; loading: boolean; error?: string | null }) {
  return <section className="infra-card infra-node-overview" aria-label="Node overview">
    <div><span className="infra-eyebrow">NODE OVERVIEW</span><h2>{host?.hostname ?? "No node available"}</h2>
      {host && <StatusBadge status={host.status} />}
      {!host && <p className="infra-muted">{loading ? "Loading Kubernetes nodes…" : error ? "Waiting for Kubernetes data." : "No Kubernetes nodes found."}</p>}
    </div>
    <Sparkline label="CPU" values={history.cpu} current={host?.metrics.cpu} />
    <Sparkline label="Memory" values={history.ram} current={host?.metrics.ram} />
  </section>;
}

interface MetricHistory { cpu: number[]; ram: number[] }
function useMetricHistory(host: InfrastructureHost | null, collectedAt: string): MetricHistory {
  const [history, setHistory] = useState<MetricHistory>({ cpu: [], ram: [] });
  useEffect(() => {
    if (!host || !collectedAt) return;
    setHistory((previous) => ({ cpu: appendMetric(previous.cpu, host.metrics.cpu),
      ram: appendMetric(previous.ram, host.metrics.ram) }));
  }, [host?.id, host?.metrics.cpu, host?.metrics.ram, collectedAt]);
  return history;
}

function appendMetric(values: number[], value: number | null) {
  return value == null ? values : [...values, value].slice(-20);
}

function Sparkline({ label, values, current }: { label: string; values: number[]; current?: number | null }) {
  const points = values.map((value, index) => `${index * 100 / Math.max(1, values.length - 1)},${30 - value * .3}`).join(" ");
  return <div className="infra-spark"><div><span>{label}</span><strong>{current == null ? "—" : `${current}%`}</strong></div>
    {values.length > 1 ? <svg viewBox="0 0 100 30" preserveAspectRatio="none" aria-label={`${label} recent usage`}>
      <polyline points={points} /></svg> : <span className="infra-spark-empty">Awaiting metric history</span>}
  </div>;
}

function HostMetrics({ host, metricsAvailable }: { host: InfrastructureHost | null; metricsAvailable: boolean }) {
  return <aside className="infra-card infra-details" aria-label="Selected host metrics"><div className="infra-details-sticky">
    <div className="infra-section-label"><span>HOST DETAILS</span>{host && <StatusBadge status={host.status} />}</div>
    <h2>{host?.hostname ?? "No host selected"}</h2><p className="infra-host-id">{host?.id ?? "Host details appear here."}</p>
    {!metricsAvailable && host && <div className="infra-metrics-warning"><strong>Node metrics unavailable</strong>
      <span>CPU and memory require Kubernetes Metrics API.</span><a href="https://kubernetes.io/docs/tasks/debug/debug-cluster/resource-metrics-pipeline/" target="_blank" rel="noreferrer">Configure Metrics API ↗</a></div>}
    <MetricRow label="CPU" value={host?.metrics.cpu} /><MetricRow label="Memory" value={host?.metrics.ram} />
    <MetricRow label="Disk" note="Not reported by Kubernetes Metrics API" />
    <MetricRow label="Network" note="Not provided by this endpoint" />
  </div></aside>;
}

function MetricRow({ label, value, note }: { label: string; value?: number | null; note?: string }) {
  const percent = value === undefined ? null : metricValue(value);
  return <div className="infra-metric"><div><span>{label}</span><strong title={percent === null ? "unobserved" : undefined}>
    {percent === null ? "—" : `${percent}%`}</strong></div>{percent === null
      ? <span className="infra-muted">{note ?? "unobserved"}</span>
      : <div className="infra-progress" role="progressbar" aria-label={`${label} usage`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
        <span className={percent >= 95 ? "status-critical" : percent >= 80 ? "status-warning" : "status-ok"} style={{ width: `${percent}%` }} /></div>}
  </div>;
}
