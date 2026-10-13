export type HostStatus = "ok" | "warning" | "critical";

export interface InfrastructureHost {
  id: string;
  hostname: string;
  status: HostStatus;
  metrics: { cpu: number; ram: number; disk: number };
}

export const STATUS_LABELS: Record<HostStatus, string> = {
  ok: "OK",
  warning: "Warn",
  critical: "Alert",
};

export function countHosts(hosts: InfrastructureHost[]) {
  return hosts.reduce(
    (counts, host) => {
      counts[host.status] += 1;
      return counts;
    },
    { total: hosts.length, ok: 0, warning: 0, critical: 0 },
  );
}

export function selectedHost(hosts: InfrastructureHost[], id: string | null) {
  return hosts.find((host) => host.id === id) ?? hosts[0] ?? null;
}

export function metricValue(value: number) {
  return Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
}

export function parseHosts(payload: unknown): InfrastructureHost[] {
  if (!Array.isArray(payload) || !payload.every(isHost)) {
    throw new Error("Invalid infrastructure response");
  }
  if (new Set(payload.map((host) => host.id)).size !== payload.length) {
    throw new Error("Duplicate infrastructure host IDs");
  }
  return payload;
}

function isHost(value: unknown): value is InfrastructureHost {
  if (!value || typeof value !== "object") return false;
  const host = value as InfrastructureHost;
  return (
    typeof host.id === "string" &&
    !!host.id &&
    typeof host.hostname === "string" &&
    !!host.hostname &&
    ["ok", "warning", "critical"].includes(host.status) &&
    !!host.metrics &&
    ["cpu", "ram", "disk"].every((key) => {
      const metric = host.metrics[key as keyof InfrastructureHost["metrics"]];
      return (
        typeof metric === "number" &&
        Number.isFinite(metric) &&
        metric >= 0 &&
        metric <= 100
      );
    })
  );
}
