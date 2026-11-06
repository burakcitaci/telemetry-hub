import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, readFileSync, rmSync, mkdirSync, copyFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, basename } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import {
  collectorConfig,
  environmentFor,
  saveSetup,
  startCommand,
  checkPrerequisites,
  saveHelmSetup,
  root,
} from './setup.mjs';
import { passwordMatches } from '../apps/backend/src/modules/auth/password.ts';

const settings = {
  org: 'example-org',
  email: 'owner@example.test',
  team: 'backend',
  port: 5000,
  apiPort: 3001,
  password: 'a-long-fixture-password',
};

test('first admin uses existing password format and fresh secrets without plaintext persistence', async () => {
  const first = await environmentFor(settings),
    second = await environmentFor(settings);
  const [admin] = JSON.parse(first.AUTH_USERS_JSON);
  assert.deepEqual(
    { org: admin.tenantSlug, email: admin.email, role: admin.role, teams: admin.teams },
    { org: settings.org, email: settings.email, role: 'admin', teams: ['backend'] },
  );
  assert.equal(await passwordMatches(settings.password, admin.passwordHash), true);
  assert.equal(JSON.stringify(first).includes(settings.password), false);
  assert.notEqual(first.AUTH_JWT_SECRET, second.AUTH_JWT_SECRET);
  assert.notEqual(first.INGESTION_COLLECTOR_TOKEN, second.INGESTION_COLLECTOR_TOKEN);
  assert.match(first.INGESTION_COLLECTOR_TOKEN, /^[A-Za-z0-9_-]{32,256}$/);
  assert.equal(first.HUB_PUBLIC_URL, 'http://localhost:5000');
});

test('invalid first-user details fail before creating a configuration', async () => {
  const invalid = [
    { org: 'UPPER' },
    { email: 'not-email' },
    { team: 'bad/team' },
    { password: 'short' },
    { password: 'x'.repeat(129) },
    { port: 1 },
    { apiPort: 5000 },
  ];
  for (const patch of invalid) await assert.rejects(environmentFor({ ...settings, ...patch }));
});

test('configuration is exclusive, keeps dollar-bearing hashes literal and reuses Collector policy', async () => {
  const folder = mkdtempSync(join(tmpdir(), 'telemetry-setup-'));
  const output = join(folder, '.env'),
    collector = join(folder, 'collector.yaml');
  try {
    await saveSetup({ ...settings, email: "o'reilly@example.test" }, output, collector);
    const content = readFileSync(output, 'utf8');
    assert.match(content, /AUTH_USERS_JSON='/);
    assert.match(content, /scrypt\$/);
    assert.match(content, /o\\'reilly/);
    assert.equal(content.includes(settings.password), false);
    assert.ok(readFileSync(collector, 'utf8').endsWith(collectorConfig()));
    await assert.rejects(saveSetup(settings, output, collector), /already exists/);
    assert.equal(readFileSync(output, 'utf8'), content);
  } finally {
    removeTestFolder(folder);
  }
});

test('Collector rendering retains authentication, verified ownership and table creation', () => {
  const yaml = collectorConfig();
  for (const token of [
    'bearertokenauth/ingestion',
    'metadata.x-telemetry-org',
    'include_metadata: true',
    'create_schema: true',
  ])
    assert.ok(yaml.includes(token));
  assert.equal(yaml.includes('{{'), false);
  assert.equal(yaml.includes('kind: ConfigMap'), false);
});

test('setup help works before dependencies, Docker access or user input', () => {
  const result = spawnSync(process.execPath, ['scripts/setup.mjs', '--help'], {
    encoding: 'utf8',
    windowsHide: true,
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /password-stdin/);
  assert.match(result.stdout, /never overwritten/);
});

test('printed startup commands apply Helm secrets without shell interpolation', () => {
  assert.equal(startCommand(join(root, '.local/helm-secrets.json')), 'yarn cluster:init');
  assert.ok(
    startCommand(join(root, 'a folder', 'secrets.json')).includes(
      "kubectl --context kind-observability apply -f 'a folder/secrets.json'",
    ),
  );
});

test('prerequisite checks explain unavailable Docker and Windows-container mode', () => {
  assert.throws(() => checkPrerequisites(() => ({ status: 1 })), /docker is not available/);
  assert.throws(
    () => checkPrerequisites(() => ({ status: 0, stdout: 'windows' })),
    /Linux containers/,
  );
  const commands = [];
  checkPrerequisites((tool, args) => {
    commands.push([tool, ...args]);
    return { status: 0, stdout: 'linux' };
  });
  assert.equal(commands.length, 4);
});

test('Helm setup writes Kubernetes secrets and never plaintext passwords', async () => {
  const folder = mkdtempSync(join(tmpdir(), 'telemetry-helm-'));
  try {
    const key = await saveHelmSetup(settings, join(folder, 'helm-secrets.json'));
    const content = readFileSync(join(folder, 'helm-secrets.json'), 'utf8');
    assert.match(content, /backend-auth/);
    assert.match(content, /telemetry-ingestion/);
    assert.equal(content.includes(settings.password), false);
    assert.match(key, /^[A-Za-z0-9_-]{43}$/);
  } finally {
    removeTestFolder(folder);
  }
});

test('password validation counts Unicode characters consistently', async () => {
  await assert.rejects(environmentFor({ ...settings, password: '😀'.repeat(6) }), /12–128/);
  const environment = await environmentFor({ ...settings, password: '😀'.repeat(12) });
  assert.equal(
    await passwordMatches('😀'.repeat(12), JSON.parse(environment.AUTH_USERS_JSON)[0].passwordHash),
    true,
  );
});

test('first-user setup runs in a copy with no node_modules or installed package dependencies', () => {
  const folder = mkdtempSync(join(tmpdir(), 'telemetry-fresh-setup-'));
  const files = [
    'scripts/setup.mjs',
    'apps/backend/src/modules/auth/password.ts',
    'infra/charts/observability/templates/collector-config.yaml',
  ];
  try {
    for (const file of files) {
      const target = join(folder, file);
      mkdirSync(join(target, '..'), { recursive: true });
      copyFileSync(join(root, file), target);
    }
    writeFileSync(join(folder, 'apps/backend/package.json'), '{"type":"module"}');
    const moduleUrl = pathToFileURL(join(folder, 'scripts/setup.mjs')).href;
    const code = `let input=''; for await (const chunk of process.stdin) input+=chunk;
      const {saveSetup}=await import(${JSON.stringify(moduleUrl)}); await saveSetup(JSON.parse(input));`;
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', code], {
      input: JSON.stringify(settings),
      encoding: 'utf8',
      windowsHide: true,
      cwd: folder,
    });
    assert.equal(result.status, 0, result.stderr);
    assert.ok(readFileSync(join(folder, '.env'), 'utf8').includes('AUTH_USERS_JSON='));
  } finally {
    removeTestFolder(folder);
  }
});

function removeTestFolder(folder) {
  const target = resolve(folder);
  assert.equal(dirname(target), resolve(tmpdir()));
  assert.ok(basename(target).startsWith('telemetry-'));
  rmSync(target, { recursive: true, force: true });
}
