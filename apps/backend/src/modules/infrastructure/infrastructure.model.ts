import type { V1Node } from '@kubernetes/client-node';

export type InfrastructureStatus = 'ok' | 'warning' | 'critical';
export interface InfrastructureHost {
  id: string;
  hostname: string;
  status: InfrastructureStatus;
  metrics: { cpu: number; ram: number; disk: number };
}
export interface NodeUsage {
  metadata: { name: string };
  usage: { cpu: string; memory: string };
}

const UNITS: Record<string, number> = {
  n: 1e-9, u: 1e-6, m: 1e-3, '': 1,
  k: 1e3, K: 1e3, M: 1e6, G: 1e9, T: 1e12, P: 1e15, E: 1e18,
  Ki: 1024, Mi: 1024 ** 2, Gi: 1024 ** 3,
  Ti: 1024 ** 4, Pi: 1024 ** 5, Ei: 1024 ** 6,
};

export function quantity(value?: string): number {
  const match = value?.match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)([a-zA-Z]*)$/);
  if (!match || !(match[2] in UNITS)) return 0;
  const result = Number(match[1]) * UNITS[match[2]];
  return Number.isFinite(result) && result > 0 ? result : 0;
}

function percentage(used?: string, capacity?: string): number {
  const total = quantity(capacity);
  return total ? Math.round(Math.min(100, quantity(used) / total * 100)) : 0;
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
  return {
    id: node.metadata.uid,
    hostname: node.metadata.name,
    status: nodeStatus(node, Math.max(cpu, ram)),
    metrics: { cpu, ram, disk: 0 },
  };
}
