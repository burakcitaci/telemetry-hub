import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

export function reloadPlan(dockerArgs = []) {
  return [
    [process.execPath, ['infra/kind/migrate-platform-store.mjs']],
    ['docker', ['build', ...dockerArgs, '-f', 'apps/backend/Dockerfile', '-t', 'local/backend:latest', '.']],
    ['kind', ['load', 'docker-image', 'local/backend:latest', '--name', 'observability']],
    ['kubectl', ['--context', 'kind-observability', 'rollout', 'restart', 'deployment/backend', '--namespace', 'telemetry-hub']],
    ['kubectl', ['--context', 'kind-observability', 'rollout', 'status', 'deployment/backend', '--namespace', 'telemetry-hub', '--timeout=3m']],
  ];
}

function execute(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', windowsHide: true });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} failed with exit code ${result.status ?? 'unknown'}.`);
}

export function reloadBackend(dockerArgs = [], runner = execute) {
  for (const [command, args] of reloadPlan(dockerArgs)) runner(command, args);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { reloadBackend(process.argv.slice(2)); }
  catch (error) { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }
}
