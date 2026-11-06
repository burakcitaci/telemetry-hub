import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const context = 'kind-observability';
const cluster = 'observability';
const namespace = 'telemetry-hub';
const kubectlRequestTimeout = '--request-timeout=30s';
const run = (step, command, args, timeout = 15 * 60 * 1000) => {
  console.log(`\n> ${step}`);
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    windowsHide: true,
    timeout,
  });
  if (result.error)
    throw new Error(
      `${step}: ${result.error.code === 'ETIMEDOUT' ? `timed out after ${timeout / 1000}s` : `unable to start ${command}: ${result.error.message}`}`,
    );
  if (result.status !== 0)
    throw new Error(
      `${step}: ${command} exited with ${result.status ?? `signal ${result.signal}`}.`,
    );
};

const output = (step, command, args) => {
  console.log(`\n> ${step}`);
  const timeout = 30 * 1000;
  const result = spawnSync(command, args, { encoding: 'utf8', windowsHide: true, timeout });
  if (result.error)
    throw new Error(
      `${step}: ${result.error.code === 'ETIMEDOUT' ? `timed out after ${timeout / 1000}s` : `unable to start ${command}: ${result.error.message}`}`,
    );
  if (result.status !== 0)
    throw new Error(
      `${step}: ${command} exited with ${result.status ?? `signal ${result.signal}`}.${result.stderr ? ` ${result.stderr.trim()}` : ''}`,
    );
  return result.stdout;
};

if (!existsSync('.local/helm-secrets.json'))
  throw new Error('Missing .local/helm-secrets.json. Run yarn setup first.');
const clusters = output('Checking existing Kind clusters', 'kind', ['get', 'clusters']);
if (!clusters.split(/\r?\n/).includes(cluster))
  run('Creating Kind cluster', 'kind', [
    'create',
    'cluster',
    '--name',
    cluster,
    '--config',
    'infra/kind/kind-config.yaml',
  ]);
run('Building backend image', 'docker', [
  'build',
  '-f',
  'apps/backend/Dockerfile',
  '-t',
  'local/backend:latest',
  '.',
]);
run('Loading backend image into Kind', 'kind', [
  'load',
  'docker-image',
  'local/backend:latest',
  '--name',
  cluster,
]);
run('Deploying Helm release', 'node', ['infra/kind/deploy.mjs']);
run('Restarting backend deployment', 'kubectl', [
  '--context',
  context,
  'rollout',
  'restart',
  'deployment/backend',
  '--namespace',
  namespace,
  kubectlRequestTimeout,
]);
run('Waiting for backend rollout', 'kubectl', [
  '--context',
  context,
  'rollout',
  'status',
  'deployment/backend',
  '--namespace',
  namespace,
  '--timeout=3m',
]);
run('Listing namespace pods', 'kubectl', [
  '--context',
  context,
  'get',
  'pods',
  '--namespace',
  namespace,
  kubectlRequestTimeout,
]);
