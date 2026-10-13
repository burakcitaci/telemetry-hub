import { memo, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  countHosts,
  metricValue,
  selectedHost,
  STATUS_LABELS,
  type InfrastructureHost,
} from "./model";

interface DashboardProps {
  hosts: InfrastructureHost[];
  loading?: boolean;
  error?: string | null;
  updatedAt?: number | null;
}

export function InfrastructureDashboard({
  hosts,
  loading = false,
  error,
  updatedAt,
}: DashboardProps) {
  const [selectedId, selectHost] = useState<string | null>(null);
  const selected = selectedHost(hosts, selectedId);
  return (
    <section
      className="infrastructure-dashboard"
      aria-label="Infrastructure monitoring"
      aria-busy={loading}
    >
      <DashboardHeader updatedAt={updatedAt} error={error} />
      <CountBar hosts={hosts} />
      {error && (
        <p className="infra-notice" role="alert">
          {error}{" "}
          {updatedAt
            ? "Showing last successful snapshot — data is stale."
            : "No snapshot available."}
        </p>
      )}
      <div className="infra-workspace">
        <section className="infra-map-panel" aria-label="Kubernetes host map">
          <div className="infra-section-label">
            <span>HOST MAP</span>
            <span>COLOR BY STATUS</span>
          </div>
          <HostMap
            hosts={hosts}
            selectedId={selected?.id}
            onSelect={selectHost}
          />
          {!hosts.length && (
            <p className="infra-empty" role="status">
              {loading
                ? "Loading Kubernetes hosts…"
                : error
                  ? "Waiting for Kubernetes data."
                  : "No Kubernetes hosts found."}
            </p>
          )}
          <p className="infra-footnote">
            Cluster-wide nodes · Select a host to inspect · Refresh every 3s
          </p>
        </section>
        <HostMetrics host={selected} />
      </div>
    </section>
  );
}

function DashboardHeader({
  updatedAt,
  error,
}: Pick<DashboardProps, "updatedAt" | "error">) {
  return (
    <header className="infra-header">
      <div>
        <h1>Infrastructure</h1>
        <span className="infra-muted">
          Kubernetes / Cluster-wide operator view
        </span>
      </div>
      <span className="infra-freshness">
        <span
          className={`infra-indicator ${error ? "is-stale" : ""}`}
          aria-hidden="true"
        />
        {error ? "Stale" : updatedAt ? "Polling" : "Connecting"}
        {updatedAt && (
          <time dateTime={new Date(updatedAt).toISOString()}>
            {" "}
            · {new Date(updatedAt).toLocaleTimeString()}
          </time>
        )}
      </span>
    </header>
  );
}

function CountBar({ hosts }: Pick<DashboardProps, "hosts">) {
  const counts = countHosts(hosts);
  return (
    <div className="infra-counts" aria-label="Host status summary">
      <div>
        <strong>{counts.total}</strong>
        <span>Total Hosts</span>
      </div>
      {(["ok", "warning", "critical"] as const).map((status) => (
        <div key={status}>
          <span
            className={`infra-status-dot status-${status}`}
            aria-hidden="true"
          />
          <strong>{counts[status]}</strong>
          <span>{STATUS_LABELS[status]}</span>
        </div>
      ))}
    </div>
  );
}

function HostMap({
  hosts,
  selectedId,
  onSelect,
}: {
  hosts: InfrastructureHost[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  return (
    <TooltipProvider delayDuration={100}>
      <div className="infra-host-grid" role="group" aria-label="Hosts">
        {hosts.map((host) => (
          <HostTile
            key={host.id}
            host={host}
            selected={host.id === selectedId}
            onSelect={onSelect}
          />
        ))}
      </div>
    </TooltipProvider>
  );
}

const HostTile = memo(
  function HostTile({
    host,
    selected,
    onSelect,
  }: {
    host: InfrastructureHost;
    selected: boolean;
    onSelect: (id: string) => void;
  }) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={`infra-host-tile status-${host.status}`}
            aria-pressed={selected}
            aria-label={`${host.hostname}: ${STATUS_LABELS[host.status]}, CPU ${host.metrics.cpu == null ? "unobserved" : host.metrics.cpu + "%"}, RAM ${host.metrics.ram == null ? "unobserved" : host.metrics.ram + "%"}`}
            onClick={() => onSelect(host.id)}
          >
            <span aria-hidden="true">
              {host.status === "critical"
                ? "!"
                : host.status === "warning"
                  ? "–"
                  : ""}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent className="infra-tooltip" side="top">
          <strong>{host.hostname}</strong>
          <span>
            {STATUS_LABELS[host.status]} · CPU {host.metrics.cpu == null ? "— (unobserved)" : host.metrics.cpu + "%"} · RAM{" "}
            {host.metrics.ram == null ? "— (unobserved)" : host.metrics.ram + "%"}
          </span>
        </TooltipContent>
      </Tooltip>
    );
  },
  (previous, next) =>
    previous.selected === next.selected &&
    previous.onSelect === next.onSelect &&
    previous.host.hostname === next.host.hostname &&
    previous.host.status === next.host.status &&
    previous.host.metrics.cpu === next.host.metrics.cpu &&
    previous.host.metrics.ram === next.host.metrics.ram,
);

function HostMetrics({ host }: { host: InfrastructureHost | null }) {
  return (
    <aside className="infra-details" aria-label="Selected host metrics">
      <div className="infra-section-label">
        <span>HOST DETAILS</span>
        {host && (
          <span className={`infra-state status-text-${host.status}`}>
            {STATUS_LABELS[host.status]}
          </span>
        )}
      </div>
      <h2>{host?.hostname ?? "Select a host"}</h2>
      <p className="infra-host-id">{host?.id ?? "Host details appear here."}</p>
      <MetricRow label="CPU" value={host?.metrics.cpu} note={host ? "unobserved" : "No host selected"} />
      <MetricRow label="Memory" value={host?.metrics.ram} note={host ? "unobserved" : "No host selected"} />
      <MetricRow label="Disk" note="Not reported by Kubernetes Metrics API" />
      <MetricRow label="Network" note="Not provided by this endpoint" />
      <p className="infra-footnote">
        CPU / Memory: % of node capacity. A zero may mean unavailable metrics;
        disk zero is a backend placeholder.
      </p>
    </aside>
  );
}

function MetricRow({
  label,
  value,
  note,
}: {
  label: string;
    value?: number | null;
  note?: string;
}) {
  const percent = value === undefined ? null : metricValue(value);
  return (
    <div className="infra-metric">
      <div>
        <span>{label}</span>
        <strong title={percent === null && note === "unobserved" ? "unobserved" : undefined}>
          {percent === null ? "—" : `${percent}%`}
        </strong>
      </div>
      {percent === null ? (
        <span className="infra-muted">{note ?? "No host selected"}</span>
      ) : (
        <div
          className="infra-progress"
          role="progressbar"
          aria-label={`${label} usage`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <span
            className={
              percent >= 95
                ? "status-critical"
                : percent >= 80
                  ? "status-warning"
                  : "status-ok"
            }
            style={{ width: `${percent}%` }}
          />
        </div>
      )}
    </div>
  );
}
