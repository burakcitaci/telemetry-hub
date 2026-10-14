import type {
  V1DaemonSet, V1Deployment, V1Namespace, V1Node, V1Pod, V1Service, V1StatefulSet,
} from '@kubernetes/client-node';

export type InfrastructureStatus = 'ok' | 'warning' | 'critical';
export type WorkloadKind = 'Deployment' | 'StatefulSet' | 'DaemonSet';
export interface InfrastructureHost { id: string; hostname: string; status: InfrastructureStatus;
  metrics: { cpu: number | null; ram: number | null; disk: null };
  usage: ResourceUsage; capacity: ResourceCapacity; allocatable: ResourceCapacity;
  info: { os: string; architecture: string; kubelet: string; runtime: string }; }
export interface ResourceCapacity { cpuCores: number | null; memoryBytes: number | null; }
export interface ResourceUsage extends ResourceCapacity { observedAt: string | null; window: string | null; }
export interface NamespaceSummary { name: string; status: InfrastructureStatus; phase: string; }
export interface ContainerSummary { name: string; image: string; imageId: string | null;
  ready: boolean; restarts: number; state: string; usage: ResourceUsage;
  requests: ResourceCapacity; limits: ResourceCapacity; }
export interface PodSummary { id: string; name: string; namespace: string; nodeName: string | null;
  status: InfrastructureStatus; phase: string; restarts: number; containers: ContainerSummary[];
  usage: ResourceUsage; createdAt: string | null; podIp: string | null; qosClass: string | null; }
export interface WorkloadSummary { id: string; name: string; namespace: string; kind: WorkloadKind;
  status: InfrastructureStatus; desired: number; ready: number; available: number;
  podIds: string[]; usage: ResourceCapacity; }
export interface ServiceSummary { id: string; name: string; namespace: string; type: string;
  clusterIp: string | null; ports: string[]; }
export interface InfrastructureSnapshot { collectedAt: string; metricsAvailable: boolean;
  nodes: InfrastructureHost[]; namespaces: NamespaceSummary[]; workloads: WorkloadSummary[];
  pods: PodSummary[]; services: ServiceSummary[]; }
export interface NodeUsage { metadata: { name: string }; usage: { cpu: string; memory: string };
  timestamp?: string; window?: string; }
export interface PodUsage { metadata: { name: string; namespace: string }; timestamp: string; window: string;
  containers: Array<{ name: string; usage: { cpu: string; memory: string } }>; }

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

export function observedQuantity(value?: string): number | null {
  if (!value || !/^([+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)([a-zA-Z]*)$/.test(value)) return null;
  const suffix = value.match(/[a-zA-Z]+$/)?.[0] ?? '';
  return suffix in UNITS ? quantity(value) : null;
}

export function resourceUsage(values?: { cpu?: string; memory?: string }, timestamp?: string, window?: string): ResourceUsage {
  const age = timestamp ? Date.now() - Date.parse(timestamp) : Infinity;
  const fresh = Number.isFinite(age) && age >= -5000 && age <= 90_000;
  return { cpuCores: fresh ? observedQuantity(values?.cpu) : null,
    memoryBytes: fresh ? observedQuantity(values?.memory) : null,
    observedAt: timestamp ?? null, window: window ?? null };
}

function capacity(values?: Record<string, string>): ResourceCapacity {
  return { cpuCores: observedQuantity(values?.cpu), memoryBytes: observedQuantity(values?.memory) };
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
  const observed = resourceUsage(usage?.usage, usage?.timestamp, usage?.window);
  const cpu = observed.cpuCores === null ? null : percentage(usage?.usage.cpu, node.status?.capacity?.cpu);
  const ram = observed.memoryBytes === null ? null : percentage(usage?.usage.memory, node.status?.capacity?.memory);
  return { id: node.metadata.uid!, hostname: node.metadata.name!,
    status: nodeStatus(node, Math.max(cpu ?? 0, ram ?? 0)), metrics: { cpu, ram, disk: null }, usage: observed,
    capacity: capacity(node.status?.capacity), allocatable: capacity(node.status?.allocatable),
    info: { os: node.status?.nodeInfo?.osImage ?? '', architecture: node.status?.nodeInfo?.architecture ?? '',
      kubelet: node.status?.nodeInfo?.kubeletVersion ?? '', runtime: node.status?.nodeInfo?.containerRuntimeVersion ?? '' } };
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

export function mapPod(item: V1Pod, usage?: PodUsage): PodSummary {
  const statuses = item.status?.containerStatuses ?? [];
  const containers = (item.spec?.containers ?? []).map(container => {
    const status = statuses.find(value => value.name === container.name);
    const measured = usage?.containers.find(value => value.name === container.name);
    return { name: container.name, image: container.image ?? '', imageId: status?.imageID ?? null,
      usage: resourceUsage(measured?.usage, usage?.timestamp, usage?.window),
      requests: capacity(container.resources?.requests), limits: capacity(container.resources?.limits), ready: status?.ready ?? false,
      restarts: status?.restartCount ?? 0, state: status ? containerState(status) : 'pending' };
  });
  const phase = item.status?.phase ?? 'Unknown';
  const ready = containers.length > 0 && containers.every(container => container.ready);
  const status = phase === 'Failed' ? 'critical' : phase === 'Running' && ready ? 'ok' : 'warning';
  return { id: item.metadata?.uid ?? `${item.metadata?.namespace}/${item.metadata?.name}`,
    name: item.metadata?.name ?? 'unknown', namespace: item.metadata?.namespace ?? 'default',
    nodeName: item.spec?.nodeName ?? null, status, phase,
    restarts: containers.reduce((total, container) => total + container.restarts, 0), containers,
    usage: { cpuCores: sumObserved(containers.map(container => container.usage.cpuCores)),
      memoryBytes: sumObserved(containers.map(container => container.usage.memoryBytes)),
      observedAt: usage?.timestamp ?? null, window: usage?.window ?? null },
    createdAt: item.metadata?.creationTimestamp?.toISOString() ?? null, podIp: item.status?.podIP ?? null,
    qosClass: item.status?.qosClass ?? null };
}

function sumObserved(values: Array<number | null>): number | null {
  return values.length && values.every(value => value !== null) ? values.reduce((sum, value) => sum + value!, 0) : null;
}

type Workload = V1Deployment | V1StatefulSet | V1DaemonSet;
export function mapWorkload(item: Workload, kind: WorkloadKind, pods: V1Pod[] = [], summaries: PodSummary[] = []): WorkloadSummary {
  const daemonSet = kind === 'DaemonSet' ? item as V1DaemonSet : undefined;
  const scalable = kind !== 'DaemonSet' ? item as V1Deployment | V1StatefulSet : undefined;
  const desired = daemonSet?.status?.desiredNumberScheduled ?? scalable?.spec?.replicas ?? 0;
  const ready = daemonSet?.status?.numberReady ?? scalable?.status?.readyReplicas ?? 0;
  const available = daemonSet?.status?.numberAvailable ?? scalable?.status?.availableReplicas ?? ready;
  const status: InfrastructureStatus = desired === 0 || ready === desired ? 'ok' : ready === 0 ? 'critical' : 'warning';
  const podIds = pods.filter(pod => pod.metadata?.namespace === item.metadata?.namespace
    && matchesSelector(pod.metadata?.labels ?? {}, item.spec?.selector)).map(pod => pod.metadata?.uid
      ?? `${pod.metadata?.namespace}/${pod.metadata?.name}`);
  const measured = summaries.filter(pod => podIds.includes(pod.id));
  return { id: item.metadata?.uid ?? `${kind}/${item.metadata?.namespace}/${item.metadata?.name}`,
    name: item.metadata?.name ?? 'unknown', namespace: item.metadata?.namespace ?? 'default',
    kind, status, desired, ready, available, podIds,
    usage: { cpuCores: sumObserved(measured.map(pod => pod.usage.cpuCores)),
      memoryBytes: sumObserved(measured.map(pod => pod.usage.memoryBytes)) } };
}

function matchesSelector(labels: Record<string, string>, selector?: { matchLabels?: Record<string, string>;
  matchExpressions?: Array<{ key: string; operator: string; values?: string[] }> }): boolean {
  if (!selector || !Object.keys(selector.matchLabels ?? {}).length && !selector.matchExpressions?.length) return false;
  return Object.entries(selector.matchLabels ?? {}).every(([key, value]) => labels[key] === value)
    && (selector.matchExpressions ?? []).every(({ key, operator, values = [] }) => {
      if (operator === 'In') return key in labels && values.includes(labels[key]);
      if (operator === 'NotIn') return !values.includes(labels[key]);
      if (operator === 'Exists') return key in labels;
      if (operator === 'DoesNotExist') return !(key in labels);
      return false;
    });
}

export function mapService(item: V1Service): ServiceSummary {
  const ports = (item.spec?.ports ?? []).map(port =>
    `${port.name ? `${port.name}:` : ''}${port.port}/${port.protocol ?? 'TCP'}`);
  return { id: item.metadata?.uid ?? `Service/${item.metadata?.namespace}/${item.metadata?.name}`,
    name: item.metadata?.name ?? 'unknown', namespace: item.metadata?.namespace ?? 'default',
    type: item.spec?.type ?? 'ClusterIP', clusterIp: item.spec?.clusterIP ?? null, ports };
}
