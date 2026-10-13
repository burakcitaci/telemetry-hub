import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mapNode, quantity } from './infrastructure.model';
import type { V1Node } from '@kubernetes/client-node';
import { InfrastructureService } from './infrastructure.service';
import { KubernetesService } from './kubernetes.service';

const node: V1Node = {
  metadata: { uid: 'node-uid', name: 'worker-1' },
  status: { capacity: { cpu: '4', memory: '8Gi' },
    conditions: [{ type: 'Ready', status: 'True' }] },
};

test('maps real quantities to host percentages and combines readiness, pressure and thresholds', () => {
  const usage = { metadata: { name: 'worker-1' }, usage: { cpu: '1800000000n', memory: '5898240Ki' } };
  assert.deepEqual(mapNode(node, usage), {
    id: 'node-uid', hostname: 'worker-1', status: 'ok', metrics: { cpu: 45, ram: 70, disk: 0 },
  });
  assert.equal(mapNode(node, { ...usage, usage: { cpu: '3200m', memory: '1Gi' } }).status, 'warning');
  assert.equal(mapNode(node, { ...usage, usage: { cpu: '3.8', memory: '1Gi' } }).status, 'critical');
  assert.equal(mapNode({ ...node, status: { conditions: [{ type: 'Ready', status: 'False' }] } }).status, 'critical');
  assert.equal(mapNode({ ...node, status: { conditions: [{ type: 'Ready', status: 'Unknown' }] } }).status, 'warning');
  assert.equal(mapNode({ ...node, status: { conditions: [
    { type: 'Ready', status: 'True' }, { type: 'DiskPressure', status: 'True' },
  ] } }).status, 'warning');
  assert.deepEqual(mapNode(node).metrics, { cpu: 0, ram: 0, disk: 0 });
  assert.equal(quantity('1e3'), 1000);
  assert.equal(quantity('250m'), 0.25);
  assert.equal(quantity('invalid'), 0);
});

test('polling shares an in-flight refresh and expires the cache after 2.5 seconds', async () => {
  let now = 10_000, calls = 0;
  const original = Date.now;
  Date.now = () => now;
  const client = { nodes: async () => { calls++; return [node]; }, metrics: async () => [] };
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
  const client = { nodes: async () => { calls++; throw new Error('connection refused'); }, metrics: async () => [] };
  const service = new InfrastructureService(client as KubernetesService);
  for (let index = 0; index < 2; index++) {
    await assert.rejects(service.status(), (error: any) => error.getStatus() === 503);
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
