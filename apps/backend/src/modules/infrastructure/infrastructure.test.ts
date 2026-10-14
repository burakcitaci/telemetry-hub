import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mapNamespace, mapNode, mapPod, mapService, mapWorkload, quantity } from './infrastructure.model';
import type { V1Node } from '@kubernetes/client-node';
import { InfrastructureService } from './infrastructure.service';
import { KubernetesService } from './kubernetes.service';

const node: V1Node = {
  metadata: { uid: 'node-uid', name: 'worker-1' },
  status: { capacity: { cpu: '4', memory: '8Gi' },
    conditions: [{ type: 'Ready', status: 'True' }] },
};

const inventoryClient = (overrides: Record<string, unknown> = {}) => ({
  nodes: async () => [node], metrics: async () => [], namespaces: async () => [],
  podMetrics: async () => [],
  pods: async () => [], services: async () => [],
  workloads: async () => ({ deployments: [], statefulSets: [], daemonSets: [] }), ...overrides,
});

test('maps real quantities to host percentages and combines readiness, pressure and thresholds', () => {
  const usage = { metadata: { name: 'worker-1' }, timestamp: new Date().toISOString(), window: '15s',
    usage: { cpu: '1800000000n', memory: '5898240Ki' } };
  assert.deepEqual(mapNode(node, usage).metrics, { cpu: 45, ram: 70, disk: null });
  assert.equal(mapNode(node, usage).usage.cpuCores, 1.8);
  assert.equal(mapNode(node, { ...usage, usage: { cpu: '3200m', memory: '1Gi' } }).status, 'warning');
  assert.equal(mapNode(node, { ...usage, usage: { cpu: '3.8', memory: '1Gi' } }).status, 'critical');
  assert.equal(mapNode({ ...node, status: { conditions: [{ type: 'Ready', status: 'False' }] } }).status, 'critical');
  assert.equal(mapNode({ ...node, status: { conditions: [{ type: 'Ready', status: 'Unknown' }] } }).status, 'warning');
  assert.equal(mapNode({ ...node, status: { conditions: [
    { type: 'Ready', status: 'True' }, { type: 'DiskPressure', status: 'True' },
  ] } }).status, 'warning');
  assert.deepEqual(mapNode(node).metrics, { cpu: null, ram: null, disk: null });
  assert.equal(quantity('1e3'), 1000);
  assert.equal(quantity('250m'), 0.25);
  assert.equal(quantity('invalid'), 0);
});

test('maps namespaces, workloads, pods, containers and services truthfully', () => {
  assert.equal(mapNamespace({ metadata: { name: 'demo' }, status: { phase: 'Active' } }).status, 'ok');
  const pod = mapPod({ metadata: { uid: 'pod-1', name: 'api', namespace: 'demo' },
    spec: { containers: [{ name: 'api', image: 'api:v1' }], nodeName: 'worker-1' },
    status: { phase: 'Running', containerStatuses: [{ name: 'api', image: 'api:v1', imageID: 'sha256:x',
      ready: true, restartCount: 2, started: true, state: { running: { startedAt: new Date() } } }] } });
  assert.equal(pod.containers[0].imageId, 'sha256:x');
  assert.equal(pod.containers[0].restarts, 2);
  assert.deepEqual(pod.usage, { cpuCores: null, memoryBytes: null, observedAt: null, window: null });
  assert.equal(pod.status, 'ok');
  assert.equal(mapWorkload({ metadata: { name: 'api', namespace: 'demo' }, spec: { replicas: 2 },
    status: { readyReplicas: 1, availableReplicas: 1 } }, 'Deployment').status, 'warning');
  assert.deepEqual(mapService({ metadata: { name: 'api', namespace: 'demo' },
    spec: { type: 'ClusterIP', clusterIP: '10.0.0.1', ports: [{ port: 80, protocol: 'TCP' }] } }).ports, ['80/TCP']);
});

test('polling shares an in-flight refresh and expires the cache after 2.5 seconds', async () => {
  let now = 10_000, calls = 0;
  const original = Date.now;
  Date.now = () => now;
  const client = inventoryClient({ nodes: async () => { calls++; return [node]; } });
  const service = new InfrastructureService(client as KubernetesService);
  try {
    const result = await Promise.all([service.status(), service.status(), service.status()]);
    assert.equal(calls, 1);
    assert.deepEqual(result[0], result[1]);
    now += 2499;
    await service.status();
    assert.equal(calls, 1);
    now++;
    await service.status();
    assert.equal(calls, 2);
  } finally { Date.now = original; }
});

test('Kubernetes failures return 503 and are briefly cached instead of repeatedly hitting the API', async () => {
  let calls = 0;
  const cause = new Error('connection refused');
  const client = inventoryClient({ nodes: async () => { calls++; throw cause; } });
  const service = new InfrastructureService(client as KubernetesService);
  for (let index = 0; index < 2; index++) {
    await assert.rejects(service.status(), (error: any) =>
      error.getStatus() === 503 && error.cause === cause);
  }
  assert.equal(calls, 1);
});

test('metrics API tries stable then beta and falls back to conditions when unavailable', async () => {
  const client = new KubernetesService();
  const versions: string[] = [];
  Object.assign(client, { core: {}, custom: { listClusterCustomObject: async ({ version }) => {
    versions.push(version);
    if (version === 'v1') throw { code: 404 };
    return { items: [{ metadata: { name: 'worker-1' }, usage: { cpu: '1', memory: '1Gi' } }] };
  } } });
  assert.equal((await client.metrics()).length, 1);
  assert.deepEqual(versions, ['v1', 'v1beta1']);
  Object.assign(client, { custom: { listClusterCustomObject: async () => { throw { code: 503 }; } } });
  assert.deepEqual(await client.metrics(), []);
});

test('pod usage joins by namespace and container name; missing and stale samples stay unknown', async () => {
  const now = new Date().toISOString();
  const pod = { metadata: { name: 'api', namespace: 'demo' }, spec: { containers: [
    { name: 'api', image: 'api:v1', resources: { requests: { cpu: '100m' }, limits: { memory: '256Mi' } } },
    { name: 'sidecar', image: 'sidecar:v1' },
  ] } };
  const sample = { metadata: { name: 'api', namespace: 'demo' }, timestamp: now, window: '15s', containers: [
    { name: 'sidecar', usage: { cpu: '0', memory: '16Mi' } },
    { name: 'api', usage: { cpu: '250m', memory: '64Mi' } },
  ] };
  const service = new InfrastructureService(inventoryClient({ pods: async () => [pod],
    podMetrics: async () => [sample, { ...sample, metadata: { name: 'api', namespace: 'other' }, containers: [] }] }) as KubernetesService);
  const result = (await service.status()).pods[0];
  assert.equal(result.containers[0].usage.cpuCores, .25);
  assert.equal(result.containers[1].usage.cpuCores, 0);
  assert.equal(result.usage.memoryBytes, 80 * 1024 ** 2);
  assert.equal(result.containers[0].requests.cpuCores, .1);
  assert.equal(result.containers[0].limits.cpuCores, null);
  assert.equal(mapPod(pod, { ...sample, containers: sample.containers.slice(0, 1) }).usage.cpuCores, null);
  assert.equal(mapPod(pod, { ...sample, timestamp: new Date(Date.now() - 120_000).toISOString() }).usage.cpuCores, null);
});

test('workload usage follows namespace and label selectors and stays unknown for missing pods', () => {
  const workload = { metadata: { name: 'api', namespace: 'demo' }, spec: { replicas: 1,
    selector: { matchLabels: { app: 'api' }, matchExpressions: [{ key: 'tier', operator: 'In', values: ['web'] }] } } };
  const pod = { metadata: { name: 'api-1', namespace: 'demo', uid: 'p1', labels: { app: 'api', tier: 'web' } },
    spec: { containers: [{ name: 'api', image: 'api:v1' }] } };
  const measured = mapPod(pod, { metadata: { name: 'api-1', namespace: 'demo' }, timestamp: new Date().toISOString(),
    window: '15s', containers: [{ name: 'api', usage: { cpu: '10m', memory: '20Mi' } }] });
  const result = mapWorkload(workload, 'Deployment', [pod, { ...pod, metadata: { ...pod.metadata, uid: 'p2', namespace: 'other' } }], [measured]);
  assert.deepEqual(result.podIds, ['p1']);
  assert.equal(result.usage.cpuCores, .01);
  assert.equal(mapWorkload(workload, 'Deployment', [], []).usage.cpuCores, null);
  assert.equal(mapWorkload(workload, 'Deployment', [pod], [mapPod(pod)]).usage.cpuCores, null);
});
