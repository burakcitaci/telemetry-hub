import type {
  V1DaemonSet, V1Deployment, V1Namespace, V1Node, V1Pod, V1Service, V1StatefulSet,
} from '@kubernetes/client-node';

export type InfrastructureStatus = 'ok' | 'warning' | 'critical';
export type WorkloadKind = 'Deployment' | 'StatefulSet' | 'DaemonSet';
export interface InfrastructureHost { id: string; hostname: string; status: InfrastructureStatus;
  metrics: { cpu: number | null; ram: number | null; disk: null }; }
export interface NamespaceSummary { name: string; status: InfrastructureStatus; phase: string; }
export interface ContainerSummary { name: string; image: string; ready: boolean; restarts: number; state: string; }
export interface PodSummary { id: string; name: string; namespace: string; nodeName: string | null;
  status: InfrastructureStatus; phase: string; restarts: number; containers: ContainerSummary[]; }
export interface WorkloadSummary { id: string; name: string; namespace: string; kind: WorkloadKind;
  status: InfrastructureStatus; desired: number; ready: number; available: number; }
export interface ServiceSummary { id: string; name: string; namespace: string; type: string;
  clusterIp: string | null; ports: string[]; }
export interface InfrastructureSnapshot { collectedAt: string; metricsAvailable: boolean;
  nodes: InfrastructureHost[]; namespaces: NamespaceSummary[]; workloads: WorkloadSummary[];
  pods: PodSummary[]; services: ServiceSummary[]; }
export interface NodeUsage { metadata: { name: string }; usage: { cpu: string; memory: string }; }

const UNITS: Record<string, number> = {
  n: 1e-9, u: 1e-6, m: 1e-3, '': 1, k: 1e3, K: 1e3, M: 1e6, G: 1e9,
  T: 1e12, P: 1e15, E: 1e18, Ki: 1024, Mi: 1024 ** 2, Gi: 1024 ** 3,
  Ti: 1024 ** 4, Pi: 1024 ** 5, Ei: 1024 ** 6,
};

export function quantity(value?: string): number {
  const match = value?.match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)([a-zA-Z]*)$/);
  if (!match || !(match[2] in UNITS)) return 0;
  const result = Number(match[1]) * UNITS[match[2]];
  return Number.isFinite(result) && result > 0 ? result : 0;
}

function percentage(used?: string, capacity?: string): number | null {
  if (!used) return null;
  const total = quantity(capacity);
  return total ? Math.round(Math.min(100, quantity(used) / total * 100)) : null;
}

function nodeStatus(node: V1Node, load: number): InfrastructureStatus {
  const conditions = node.status?.conditions ?? [];
  const ready = conditions.find(condition => condition.type === 'Ready');
  if (ready?.status === 'False' || load >= 95) return 'critical';
  const pressure = conditions.some(condition =>
    ['MemoryPressure', 'DiskPressure', 'PIDPressure', 'NetworkUnavailable'].includes(condition.type)
      && condition.status === 'True');
  if (ready?.status !== 'True' || pressure || node.spec?.unschedulable || load >= 80) return 'warning';
  return 'ok';
}

export function mapNode(node: V1Node, usage?: NodeUsage): InfrastructureHost {
  const cpu = percentage(usage?.usage.cpu, node.status?.capacity?.cpu);
  const ram = percentage(usage?.usage.memory, node.status?.capacity?.memory);
  return { id: node.metadata.uid!, hostname: node.metadata.name!,
    status: nodeStatus(node, Math.max(cpu ?? 0, ram ?? 0)), metrics: { cpu, ram, disk: null } };
}

export function mapNamespace(item: V1Namespace): NamespaceSummary {
  const phase = item.status?.phase ?? 'Unknown';
  return { name: item.metadata?.name ?? 'unknown', phase,
    status: phase === 'Active' ? 'ok' : phase === 'Terminating' ? 'warning' : 'critical' };
}

function containerState(status: NonNullable<NonNullable<V1Pod['status']>['containerStatuses']>[number]): string {
  if (status.state?.running) return 'running';
  if (status.state?.waiting) return status.state.waiting.reason ?? 'waiting';
  if (status.state?.terminated) return status.state.terminated.reason ?? 'terminated';
  return 'unknown';
}

export function mapPod(item: V1Pod): PodSummary {
  const statuses = item.status?.containerStatuses ?? [];
  const containers = (item.spec?.containers ?? []).map(container => {
    const status = statuses.find(value => value.name === container.name);
    return { name: container.name, image: container.image ?? '', ready: status?.ready ?? false,
      restarts: status?.restartCount ?? 0, state: status ? containerState(status) : 'pending' };
  });
  const phase = item.status?.phase ?? 'Unknown';
  const ready = containers.length > 0 && containers.every(container => container.ready);
  const status = phase === 'Failed' ? 'critical' : phase === 'Running' && ready ? 'ok' : 'warning';
  return { id: item.metadata?.uid ?? `${item.metadata?.namespace}/${item.metadata?.name}`,
    name: item.metadata?.name ?? 'unknown', namespace: item.metadata?.namespace ?? 'default',
    nodeName: item.spec?.nodeName ?? null, status, phase,
    restarts: containers.reduce((total, container) => total + container.restarts, 0), containers };
}

type Workload = V1Deployment | V1StatefulSet | V1DaemonSet;
export function mapWorkload(item: Workload, kind: WorkloadKind): WorkloadSummary {
  const daemonSet = kind === 'DaemonSet' ? item as V1DaemonSet : undefined;
  const scalable = kind !== 'DaemonSet' ? item as V1Deployment | V1StatefulSet : undefined;
  const desired = daemonSet?.status?.desiredNumberScheduled ?? scalable?.spec?.replicas ?? 0;
  const ready = daemonSet?.status?.numberReady ?? scalable?.status?.readyReplicas ?? 0;
  const available = daemonSet?.status?.numberAvailable ?? scalable?.status?.availableReplicas ?? ready;
  const status: InfrastructureStatus = desired === 0 || ready === desired ? 'ok' : ready === 0 ? 'critical' : 'warning';
  return { id: item.metadata?.uid ?? `${kind}/${item.metadata?.namespace}/${item.metadata?.name}`,
    name: item.metadata?.name ?? 'unknown', namespace: item.metadata?.namespace ?? 'default',
    kind, status, desired, ready, available };
}

export function mapService(item: V1Service): ServiceSummary {
  const ports = (item.spec?.ports ?? []).map(port =>
    `${port.name ? `${port.name}:` : ''}${port.port}/${port.protocol ?? 'TCP'}`);
  return { id: item.metadata?.uid ?? `Service/${item.metadata?.namespace}/${item.metadata?.name}`,
    name: item.metadata?.name ?? 'unknown', namespace: item.metadata?.namespace ?? 'default',
    type: item.spec?.type ?? 'ClusterIP', clusterIp: item.spec?.clusterIP ?? null, ports };
}
