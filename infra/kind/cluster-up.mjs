import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const context = 'kind-observability';
const cluster = 'observability';
const namespace = 'telemetry-hub';
const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, { stdio: 'inherit', windowsHide: true, ...options });
  if (result.error || result.status !== 0) throw new Error(`${command} failed.`);
};
const output = (command, args) => {
  const result = spawnSync(command, args, { encoding: 'utf8', windowsHide: true });
  if (result.error || result.status !== 0) throw new Error(`${command} failed.`);
  return result.stdout;
};
const capture = (command, args) =>
  spawnSync(command, args, { encoding: 'utf8', windowsHide: true }).stdout?.trim() || '';

if (!existsSync('.local/helm-secrets.json'))
  throw new Error('Missing .local/helm-secrets.json. Run node scripts/setup.mjs first.');
if (!capture('kind', ['get', 'clusters']).split(/\r?\n/).includes(cluster))
  run('kind', ['create', 'cluster', '--name', cluster, '--config', 'infra/kind/kind-config.yaml']);
run('kubectl', ['--context', context, 'apply', '-f', '-'], {
  input: output('kubectl', [
    '--context',
    context,
    'create',
    'namespace',
    namespace,
    '--dry-run=client',
    '-o',
    'yaml',
  ]),
});
run('kubectl', ['--context', context, 'apply', '-f', '.local/helm-secrets.json']);
run('docker', ['build', '-f', 'apps/backend/Dockerfile', '-t', 'local/backend:latest', '.']);
run('kind', ['load', 'docker-image', 'local/backend:latest', '--name', cluster]);
run('node', ['infra/kind/deploy.mjs']);
run('kubectl', [
  '--context',
  context,
  'rollout',
  'restart',
  'deployment/backend',
  '--namespace',
  namespace,
]);
run('kubectl', [
  '--context',
  context,
  'rollout',
  'status',
  'deployment/backend',
  '--namespace',
  namespace,
  '--timeout=3m',
]);
run('kubectl', ['--context', context, 'get', 'pods', '--namespace', namespace]);
