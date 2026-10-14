export type InfrastructureStatus = "ok" | "warning" | "critical";

export interface InfrastructureHost { id: string; hostname: string; status: InfrastructureStatus;
  metrics: { cpu: number | null; ram: number | null; disk: number | null } }
export interface NamespaceSummary { name: string; status: InfrastructureStatus; phase: string }
export interface ContainerSummary { name: string; image: string; ready: boolean; restarts: number; state: string }
export interface PodSummary { id: string; name: string; namespace: string; nodeName: string | null;
  status: InfrastructureStatus; phase: string; restarts: number; containers: ContainerSummary[] }
export interface WorkloadSummary { id: string; name: string; namespace: string;
  kind: "Deployment" | "StatefulSet" | "DaemonSet"; status: InfrastructureStatus;
  desired: number; ready: number; available: number }
export interface ServiceSummary { id: string; name: string; namespace: string; type: string;
  clusterIp: string | null; ports: string[] }
export interface InfrastructureSnapshot { collectedAt: string; metricsAvailable: boolean;
  nodes: InfrastructureHost[]; namespaces: NamespaceSummary[]; workloads: WorkloadSummary[];
  pods: PodSummary[]; services: ServiceSummary[] }

export const EMPTY_INFRASTRUCTURE: InfrastructureSnapshot = {
  collectedAt: "", metricsAvailable: false, nodes: [], namespaces: [], workloads: [], pods: [], services: [],
};
export const STATUS_LABELS: Record<InfrastructureStatus, string> = {
  ok: "OK", warning: "Warn", critical: "Alert",
};

export function countHosts(hosts: InfrastructureHost[]) {
  return hosts.reduce((counts, host) => {
    counts[host.status] += 1;
    return counts;
  }, { total: hosts.length, ok: 0, warning: 0, critical: 0 });
}

export function countResources(snapshot: InfrastructureSnapshot) {
  return { nodes: snapshot.nodes.length, namespaces: snapshot.namespaces.length,
    workloads: snapshot.workloads.length, pods: snapshot.pods.length,
    containers: snapshot.pods.reduce((total, pod) => total + pod.containers.length, 0),
    services: snapshot.services.length };
}

export function selectedHost(hosts: InfrastructureHost[], id: string | null) {
  return hosts.find((host) => host.id === id) ?? hosts[0] ?? null;
}

export function metricValue(value: number | null | undefined) {
  if (value === null || value === undefined) return null;
  return Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
}

export function parseInfrastructure(payload: unknown): InfrastructureSnapshot {
  if (!isRecord(payload) || typeof payload.collectedAt !== "string" ||
    typeof payload.metricsAvailable !== "boolean") invalid();
  const snapshot = payload as unknown as InfrastructureSnapshot;
  if (!isArray(snapshot.nodes, isHost) || !isArray(snapshot.namespaces, isNamespace) ||
    !isArray(snapshot.workloads, isWorkload) || !isArray(snapshot.pods, isPod) ||
    !isArray(snapshot.services, isService)) invalid();
  assertUnique(snapshot.nodes, "node"); assertUnique(snapshot.workloads, "workload");
  assertUnique(snapshot.pods, "pod"); assertUnique(snapshot.services, "service");
  return snapshot;
}

function invalid(): never { throw new Error("Invalid infrastructure response") }
function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}
function isArray<T>(value: unknown, check: (item: unknown) => item is T): value is T[] {
  return Array.isArray(value) && value.every(check);
}
function isStatus(value: unknown): value is InfrastructureStatus {
  return value === "ok" || value === "warning" || value === "critical";
}
function isNumber(value: unknown): value is number { return typeof value === "number" && Number.isFinite(value) }
function isHost(value: unknown): value is InfrastructureHost {
  if (!isRecord(value) || !isRecord(value.metrics)) return false;
  const metric = (item: unknown) => item === null || isNumber(item) && item >= 0 && item <= 100;
  return typeof value.id === "string" && !!value.id && typeof value.hostname === "string" &&
    isStatus(value.status) && metric(value.metrics.cpu) && metric(value.metrics.ram) && metric(value.metrics.disk);
}
function isNamespace(value: unknown): value is NamespaceSummary {
  return isRecord(value) && typeof value.name === "string" && typeof value.phase === "string" && isStatus(value.status);
}
function isContainer(value: unknown): value is ContainerSummary {
  return isRecord(value) && typeof value.name === "string" && typeof value.image === "string" &&
    typeof value.ready === "boolean" && isNumber(value.restarts) && typeof value.state === "string";
}
function isPod(value: unknown): value is PodSummary {
  return isRecord(value) && typeof value.id === "string" && typeof value.name === "string" &&
    typeof value.namespace === "string" && isStatus(value.status) && typeof value.phase === "string" &&
    isNumber(value.restarts) && isArray(value.containers, isContainer);
}
function isWorkload(value: unknown): value is WorkloadSummary {
  return isRecord(value) && typeof value.id === "string" && typeof value.name === "string" &&
    typeof value.namespace === "string" && ["Deployment", "StatefulSet", "DaemonSet"].includes(String(value.kind)) &&
    isStatus(value.status) && isNumber(value.desired) && isNumber(value.ready) && isNumber(value.available);
}
function isService(value: unknown): value is ServiceSummary {
  return isRecord(value) && typeof value.id === "string" && typeof value.name === "string" &&
    typeof value.namespace === "string" && typeof value.type === "string" &&
    Array.isArray(value.ports) && value.ports.every((port) => typeof port === "string");
}
function assertUnique(items: Array<{ id: string }>, kind: string) {
  if (new Set(items.map((item) => item.id)).size !== items.length)
    throw new Error(`Duplicate infrastructure ${kind} IDs`);
}
