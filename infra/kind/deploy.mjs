import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const context = 'kind-observability';
const namespace = 'telemetry-hub';
const kubectlTimeout = '--request-timeout=30s';
const metricsOnly = process.argv.includes('--metrics-only');
const helmArgs = process.argv.slice(2).filter((arg) => arg !== '--metrics-only');

function run(step, command, args, timeout = 5 * 60 * 1000) {
  console.log(`\n> ${step}`);
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    windowsHide: true,
    timeout,
  });
  if (result.error) {
    const message =
      result.error.code === 'ETIMEDOUT'
        ? `timed out after ${timeout / 1000}s`
        : `unable to start ${command}: ${result.error.message}`;
    throw new Error(`${step}: ${message}.`);
  }
  if (result.status !== 0) {
    throw new Error(
      `${step}: ${command} exited with ${result.status ?? `signal ${result.signal}`}.`,
    );
  }
}

function output(step, command, args) {
  console.log(`\n> ${step}`);
  const timeout = 30 * 1000;
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    windowsHide: true,
    timeout,
  });
  if (result.error) {
    const message =
      result.error.code === 'ETIMEDOUT'
        ? `timed out after ${timeout / 1000}s`
        : `unable to start ${command}: ${result.error.message}`;
    throw new Error(`${step}: ${message}.`);
  }
  if (result.status !== 0) {
    throw new Error(
      `${step}: ${command} exited with ${result.status ?? `signal ${result.signal}`}.${result.stderr?.trim() ? ` ${result.stderr.trim()}` : ''}`,
    );
  }
  return result.stdout.trim();
}

function installMetricsServer() {
  run('Installing Kind metrics server', 'kubectl', [
    '--context',
    context,
    'apply',
    '-k',
    'infra/kind/metrics-server',
    kubectlTimeout,
  ]);
  run('Waiting for metrics server rollout', 'kubectl', [
    '--context',
    context,
    'rollout',
    'status',
    'deployment/metrics-server',
    '--namespace',
    'kube-system',
    '--timeout=3m',
  ]);
  run('Waiting for metrics API', 'kubectl', [
    '--context',
    context,
    'wait',
    '--for=condition=Available',
    'apiservice/v1beta1.metrics.k8s.io',
    '--timeout=2m',
  ]);
}

function ensureNamespace() {
  const existing = output('Checking namespace', 'kubectl', [
    '--context',
    context,
    'get',
    'namespace',
    namespace,
    '--ignore-not-found',
    '-o',
    'name',
    kubectlTimeout,
  ]);
  if (!existing) {
    run('Creating namespace', 'kubectl', [
      '--context',
      context,
      'create',
      'namespace',
      namespace,
      kubectlTimeout,
    ]);
  }
}

if (metricsOnly) {
  installMetricsServer();
  process.exit(0);
}

if (!existsSync('.local/helm-secrets.json')) {
  throw new Error('Missing .local/helm-secrets.json. Run yarn setup first.');
}

installMetricsServer();
ensureNamespace();
run('Applying Helm secrets', 'kubectl', [
  '--context',
  context,
  'apply',
  '-f',
  '.local/helm-secrets.json',
  kubectlTimeout,
]);
run(
  'Deploying Helm release',
  'helm',
  [
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
    ...helmArgs,
  ],
  6 * 60 * 1000,
);
