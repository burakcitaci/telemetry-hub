import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { environmentOptions, backendEnvironment } from './backend-environment.mjs';
import { assertUniqueService } from './service-name-guard.mjs';

test('onboarding requires a concrete environment and provides standard SDK resource metadata', () => {
  for (const value of [undefined, '', 'all', 'bad,org.slug=victim', 'bad\r\nheader', 'a'.repeat(65)]) {
    assert.throws(() => environmentOptions(value));
  }
  const variables = backendEnvironment(environmentOptions('staging'), 'demo', 'platform');
  assert.equal(variables.find(variable => variable.name === 'DEPLOY_ENV').value, 'staging');
  assert.equal(variables.find(variable => variable.name === 'OTEL_RESOURCE_ATTRIBUTES').value,
    'deployment.environment.name=staging,org.slug=demo,team.id=platform');
});

test('deployment plan includes environment and performs no cluster writes', () => {
  const script = fileURLToPath(new URL('./deploy-backend.mjs', import.meta.url));
  const args = ['--name', 'sample-api', '--image', 'local/sample:v1', '--service', 'sample-api', '--org', 'demo', '--team', 'platform'];
  const missing = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /Supply --env/);
  const plan = spawnSync(process.execPath, [script, ...args, '--env', 'staging'], { encoding: 'utf8' });
  assert.equal(plan.status, 0, plan.stderr);
  assert.match(plan.stdout, /env=staging/);
  assert.match(plan.stdout, /PLAN ONLY/);
});

test('service guard allows redeployment and rejects duplicate active service identities', () => {
  const deployment = { metadata: { name: 'api', annotations: { 'telemetry-hub/service-name': 'checkout' } }, spec: { replicas: 1 } };
  assert.doesNotThrow(() => assertUniqueService([deployment], 'api', 'checkout'));
  assert.throws(() => assertUniqueService([deployment], 'another-api', 'checkout'));
});
