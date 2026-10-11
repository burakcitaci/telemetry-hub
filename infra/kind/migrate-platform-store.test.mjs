import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { persistentStore, storagePatch, snapshotCode, restoreCode } from './migrate-platform-store.mjs';

const deployment = () => ({ spec: { replicas: 1, template: { spec: {
  containers: [{ name: 'backend', image: 'local/backend:latest',
    env: [{ name: 'OTEL_SERVICE_NAME', value: 'tenant-heavy' }],
    envFrom: [{ secretRef: { name: 'backend-auth' } }],
    volumeMounts: [{ name: 'other', mountPath: '/other' }] }],
  volumes: [{ name: 'other', emptyDir: {} }], nodeSelector: { local: 'true' },
} } } });

test('storage patch preserves service identity, secret reference and unrelated volumes', () => {
  const original = deployment();
  const before = structuredClone(original);
  const patch = storagePatch(original);
  assert.deepEqual(original, before);
  assert.equal(patch.replicas, 1);
  assert.equal(patch.strategy.type, 'Recreate');
  const spec = patch.template.spec;
  assert.deepEqual(spec.nodeSelector, before.spec.template.spec.nodeSelector);
  assert.deepEqual(spec.containers[0].envFrom, before.spec.template.spec.containers[0].envFrom);
  assert.equal(spec.containers[0].env[0].value, 'tenant-heavy');
  assert.deepEqual(spec.volumes[0], { name: 'other', emptyDir: {} });
  assert.equal(persistentStore({ spec: { template: patch.template } }), true);
});

test('path alone or unmounted PVC does not count as persistent SQLite', () => {
  const original = deployment();
  assert.equal(persistentStore(original), false);
  original.spec.template.spec.containers[0].env.push({ name: 'AUTH_DB_PATH', value: '/var/lib/telemetry-hub/platform.sqlite' });
  original.spec.template.spec.volumes.push({ name: 'platform-store', persistentVolumeClaim: { claimName: 'backend-platform-store' } });
  assert.equal(persistentStore(original), false);
});

test('standalone backup includes committed WAL rows and fails without an existing database', () => {
  const folder = mkdtempSync(join(tmpdir(), 'telemetry-migration-test-'));
  const source = join(folder, 'source.sqlite');
  const target = join(folder, 'snapshot.sqlite');
  const db = new DatabaseSync(source);
  try {
    db.exec('PRAGMA journal_mode=WAL; PRAGMA wal_autocheckpoint=0; CREATE TABLE settings(value TEXT);');
    db.prepare('INSERT INTO settings VALUES (?)').run('persisted-team');
    const result = spawnSync(process.execPath, ['-e', snapshotCode, target], {
      env: { ...process.env, AUTH_DB_PATH: source }, maxBuffer: 1024 * 1024,
    });
    assert.equal(result.status, 0, result.stderr.toString());
    assert.deepEqual(result.stdout, readFileSync(target));
    const backup = new DatabaseSync(target, { readOnly: true });
    assert.equal(backup.prepare('SELECT value FROM settings').get().value, 'persisted-team');
    assert.equal(backup.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
    backup.close();
    const restored = join(folder, 'restored.sqlite');
    const code = restoreCode.replace("const target = '/var/lib/telemetry-hub/platform.sqlite';", `const target = ${JSON.stringify(restored)};`);
    const checksum = createHash('sha256').update(result.stdout).digest('hex');
    const restore = expected => spawnSync(process.execPath, ['-e', code, expected], { input: result.stdout });
    assert.notEqual(restore('invalid').status, 0);
    assert.equal(existsSync(restored), false, 'checksum failure must not create destination');
    const restoredResult = restore(checksum);
    assert.equal(restoredResult.status, 0, restoredResult.stderr.toString());
    assert.deepEqual(readFileSync(restored), result.stdout);
    assert.equal(restore(checksum).status, 0, 'identical restore is safe to retry');
    const conflictCode = code.replace(JSON.stringify(restored), JSON.stringify(source));
    assert.notEqual(spawnSync(process.execPath, ['-e', conflictCode, checksum], { input: result.stdout }).status, 0);
    assert.equal(db.prepare('SELECT value FROM settings').get().value, 'persisted-team');
    const missing = spawnSync(process.execPath, ['-e', snapshotCode, join(folder, 'missing-snapshot.sqlite')], {
      env: { ...process.env, AUTH_DB_PATH: join(folder, 'missing.sqlite') },
    });
    assert.notEqual(missing.status, 0);
  } finally {
    db.close();
    // Only the explicitly created, resolved test fixture directory is removed.
    rmSync(folder, { recursive: true });
  }
});
