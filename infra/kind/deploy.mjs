import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const context = 'kind-observability';
const namespace = 'telemetry-hub';
const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, { stdio: 'inherit', windowsHide: true, ...options });
  if (result.error || result.status !== 0) throw new Error(`${command} failed.`);
};

if (!existsSync('.local/helm-secrets.json'))
  throw new Error('Missing .local/helm-secrets.json. Run node scripts/setup.mjs first.');
run('kubectl', ['--context', context, 'apply', '-f', '.local/helm-secrets.json']);
run('helm', [
  'upgrade',
  '--install',
  'observability',
  'infra/charts/observability',
  '--namespace',
  namespace,
  '--create-namespace',
  '--wait',
  '--timeout',
  '5m',
  '--kube-context',
  context,
  '--set-string',
  `backend.otelServiceName=${process.env.BACKEND_SERVICE_NAME || 'backend-service'}`,
  '--set-string',
  `backend.deploymentEnvironment=${process.env.DEPLOY_ENV || 'production'}`,
  ...process.argv.slice(2),
]);
