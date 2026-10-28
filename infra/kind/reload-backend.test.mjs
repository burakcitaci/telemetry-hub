import assert from 'node:assert/strict';
import test from 'node:test';
import { reloadBackend, reloadPlan } from './reload-backend.mjs';

test('backend reload is shell-independent and preserves the safe operation order', () => {
  const plan = reloadPlan(['--no-cache']);
  assert.equal(plan[0][0], process.execPath);
  assert.deepEqual(plan[0][1], ['infra/kind/migrate-platform-store.mjs']);
  assert.deepEqual(plan[1], ['docker', ['build', '--no-cache', '-f', 'apps/backend/Dockerfile', '-t', 'local/backend:latest', '.']]);
  assert.deepEqual(plan.slice(2).map(([command]) => command), ['kind', 'kubectl', 'kubectl']);
  assert.deepEqual(plan[3][1].slice(2, 5), ['rollout', 'restart', 'deployment/backend']);
  assert.deepEqual(plan[4][1].slice(-2), ['telemetry-hub', '--timeout=3m']);
});

test('reload stops immediately when a prerequisite command fails', () => {
  const calls = [];
  assert.throws(() => reloadBackend([], (command, args) => {
    calls.push([command, args]);
    if (calls.length === 2) throw new Error('build failed');
  }), /build failed/);
  assert.equal(calls.length, 2);
});
