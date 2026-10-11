import { spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const databasePath = '/var/lib/telemetry-hub/platform.sqlite';
const context = 'kind-observability';
const namespace = 'telemetry-hub';
const claim = 'backend-platform-store';
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

function kubectl(args, input) {
  const result = spawnSync('kubectl', ['--context', context, '-n', namespace, ...args], {
    input, maxBuffer: 64 * 1024 * 1024, timeout: 75_000, windowsHide: true,
  });
  if (result.error || result.status !== 0) {
    // Never print stdin (database contents) or deployment environment values.
    throw new Error(result.error?.message || result.stderr.toString().trim() || `kubectl ${args[0]} failed`);
  }
  return result.stdout;
}

const get = (kind, name) => JSON.parse(kubectl(['get', kind, name, '-o', 'json']).toString());
const apply = manifest => kubectl(['apply', '-f', '-'], JSON.stringify(manifest));
const patch = spec => kubectl(['patch', 'deployment', 'backend', '--type=merge', '-p', JSON.stringify({ spec })]);
const exec = (pod, code, input, args = []) => kubectl([
  'exec', ...(input === undefined ? [] : ['-i']), pod, '-c', 'backend', '--', 'node', '-e', code, ...args,
], input);

export function persistentStore(deployment) {
  const spec = deployment.spec.template.spec;
  const backend = spec.containers.find(container => container.name === 'backend');
  const mount = backend?.volumeMounts?.find(item => item.mountPath === '/var/lib/telemetry-hub');
  return backend?.env?.find(item => item.name === 'AUTH_DB_PATH')?.value === databasePath
    && !!spec.volumes?.find(item => item.name === mount?.name)?.persistentVolumeClaim?.claimName;
}

export function storagePatch(deployment) {
  const spec = structuredClone(deployment.spec.template.spec);
  const backend = spec.containers.find(container => container.name === 'backend');
  if (!backend) throw new Error('Expected backend container.');
  backend.env = [...(backend.env || []).filter(item => item.name !== 'AUTH_DB_PATH'),
    { name: 'AUTH_DB_PATH', value: databasePath }];
  backend.volumeMounts = [...(backend.volumeMounts || []).filter(item => item.name !== 'platform-store'),
    { name: 'platform-store', mountPath: '/var/lib/telemetry-hub' }];
  spec.volumes = [...(spec.volumes || []).filter(item => item.name !== 'platform-store'),
    { name: 'platform-store', persistentVolumeClaim: { claimName: claim } }];
  return { replicas: 1, strategy: { type: 'Recreate', rollingUpdate: null }, template: { spec } };
}

// Runs in the old container. VACUUM INTO includes committed WAL pages and creates
// a standalone snapshot. No password hashes or database rows are printed.
export const snapshotCode = `
  const { DatabaseSync } = require('node:sqlite');
  const fs = require('node:fs');
  const source = process.env.AUTH_DB_PATH || 'data/platform.sqlite';
  const target = process.argv[1];
  const db = new DatabaseSync(source, { readOnly: true });
  db.exec('PRAGMA busy_timeout=10000');
  if (db.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok') throw Error('Source SQLite integrity check failed');
  db.prepare('VACUUM INTO ?').run(target);
  db.close();
  fs.chmodSync(target, 0o600);
  process.stdout.write(fs.readFileSync(target));
`;

export const restoreCode = `
  const fs = require('node:fs');
  const { createHash } = require('node:crypto');
  const { DatabaseSync } = require('node:sqlite');
  const target = '${databasePath}';
  const expected = process.argv[1];
  const chunks = [];
  process.stdin.on('data', chunk => chunks.push(chunk));
  process.stdin.on('end', () => {
    const bytes = Buffer.concat(chunks);
    const hash = data => createHash('sha256').update(data).digest('hex');
    if (hash(bytes) !== expected) throw Error('Transferred snapshot checksum mismatch');
    if (fs.existsSync(target)) {
      if (hash(fs.readFileSync(target)) !== expected) throw Error('PVC database already exists: refusing to overwrite');
    } else {
      if (fs.existsSync(target+'-wal') || fs.existsSync(target+'-shm')) throw Error('PVC contains SQLite sidecars: refusing to overwrite');
      const staging = target + '.migration-' + expected;
      fs.writeFileSync(staging, bytes, { mode: 0o600, flag: 'wx' });
      const db = new DatabaseSync(staging, { readOnly: true });
      if (db.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok') throw Error('Restored SQLite integrity check failed');
      db.close();
      fs.renameSync(staging, target);
    }
    console.log('Snapshot checksum and SQLite integrity verified.');
  });
`;

function pvcManifest() {
  return { apiVersion: 'v1', kind: 'PersistentVolumeClaim', metadata: {
    name: claim, namespace, labels: { 'app.kubernetes.io/managed-by': 'Helm' },
    annotations: { 'helm.sh/resource-policy': 'keep', 'meta.helm.sh/release-name': 'observability',
      'meta.helm.sh/release-namespace': namespace },
  }, spec: { accessModes: ['ReadWriteOnce'], resources: { requests: { storage: '1Gi' } } } };
}

function helperManifest(name, image) {
  return { apiVersion: 'v1', kind: 'Pod', metadata: { name, namespace }, spec: {
    restartPolicy: 'Never', containers: [{ name: 'backend', image, imagePullPolicy: 'IfNotPresent',
      command: ['node', '-e', 'setInterval(()=>{},1000)'],
      volumeMounts: [{ name: 'platform-store', mountPath: '/var/lib/telemetry-hub' }] }],
    volumes: [{ name: 'platform-store', persistentVolumeClaim: { claimName: claim } }],
  } };
}

export function migrate(resumeDirectory) {
  const deployment = get('deployment', 'backend');
  if (persistentStore(deployment)) {
    if (deployment.spec.replicas !== 1) throw new Error('Persistent backend must have exactly one replica before reloading.');
    console.log('Backend SQLite already uses persistent storage.');
    return;
  }
  if (deployment.spec.replicas !== 1 && !resumeDirectory) throw new Error('Migration requires exactly one backend replica.');
  if (resumeDirectory && deployment.spec.replicas !== 0) {
    throw new Error('Recovery requires a stopped backend (replicas=0). Run a fresh migration for a running backend.');
  }
  const id = `${Date.now()}-${randomBytes(4).toString('hex')}`;
  const helper = `backend-store-migration-${id}`;
  const backupDirectory = resumeDirectory ? resolve(resumeDirectory) : resolve(root, 'data/platform-backups', id);
  const backupFile = resolve(backupDirectory, 'platform.sqlite');
  let sourcePod;
  let frozen = false;
  let stopped = false;
  let helperCreated = false;
  const unfreeze = () => {
    if (!frozen || stopped) return;
    try { exec(sourcePod, "process.kill(1,'SIGCONT')"); frozen = false; }
    catch { console.error('Could not resume source process; send SIGCONT to PID 1 in the source pod.'); }
  };
  const interrupted = () => {
    unfreeze();
    console.error(`Migration interrupted. Retained recovery directory: ${backupDirectory}`);
    process.exit(130);
  };
  process.once('SIGINT', interrupted);
  process.once('SIGTERM', interrupted);
  try {
    // Provision and pull the helper image BEFORE pausing the backend, so volume
    // binding/image startup cannot consume the old pod's liveness grace period.
    const existing = JSON.parse(kubectl(['get', 'pvc', claim, '--ignore-not-found', '-o', 'json']).toString() || 'null');
    if (!existing) apply(pvcManifest());
    apply(helperManifest(helper, deployment.spec.template.spec.containers.find(item => item.name === 'backend').image));
    helperCreated = true;
    kubectl(['wait', '--for=condition=Ready', `pod/${helper}`, '--timeout=60s']);
    let snapshot;
    if (resumeDirectory) {
      snapshot = readFileSync(backupFile);
      const receipt = JSON.parse(readFileSync(resolve(backupDirectory, 'receipt.json'), 'utf8'));
      if (receipt.context !== context || receipt.namespace !== namespace || digest(snapshot) !== receipt.sha256) {
        throw new Error('Recovery backup receipt/checksum mismatch.');
      }
    } else {
      const selector = Object.entries(deployment.spec.selector.matchLabels).map(([key, value]) => `${key}=${value}`).join(',');
      const pods = JSON.parse(kubectl(['get', 'pods', '-l', selector, '-o', 'json']).toString()).items;
      if (pods.length !== 1 || pods[0].status.phase !== 'Running') throw new Error('Expected exactly one running source pod.');
      sourcePod = pods[0].metadata.name;
      mkdirSync(backupDirectory, { recursive: true, mode: 0o700 });
      // Stop the actual backend writer, not the separately exec-ed snapshot process.
      exec(sourcePod, `const fs=require('node:fs'); if (!fs.readFileSync('/proc/1/cmdline','utf8').split('\\0')[0].endsWith('node')) throw Error('Expected Node PID 1'); process.kill(1,'SIGSTOP');`);
      frozen = true;
      snapshot = exec(sourcePod, snapshotCode, undefined, [`/tmp/platform-${id}.sqlite`]);
      writeFileSync(backupFile, snapshot, { mode: 0o600, flag: 'wx' });
      chmodSync(backupFile, 0o600);
      writeFileSync(resolve(backupDirectory, 'receipt.json'), JSON.stringify({ context, namespace,
        sourcePod, sha256: digest(snapshot), createdAt: new Date().toISOString() }, null, 2), { mode: 0o600, flag: 'wx' });
    }
    console.log(`Verified SQLite backup retained at ${backupFile}`);
    // Restore before destroying the old pod. Conflicting PVC data aborts safely.
    console.log(exec(helper, restoreCode, snapshot, [digest(snapshot)]).toString().trim());
    patch({ replicas: 0 });
    stopped = true;
    if (sourcePod) kubectl(['wait', '--for=delete', `pod/${sourcePod}`, '--timeout=60s']);
    else {
      const selector = Object.entries(deployment.spec.selector.matchLabels).map(([key, value]) => `${key}=${value}`).join(',');
      kubectl(['wait', '--for=delete', 'pod', '-l', selector, '--timeout=60s']);
    }
    patch(storagePatch(deployment));
    kubectl(['rollout', 'status', 'deployment/backend', '--timeout=60s']);
    console.log('SQLite migration complete. Existing users, teams and settings were preserved.');
  } catch (error) {
    console.error(`Migration stopped: ${error.message}`);
    if (stopped) console.error(`Backend may remain stopped. Resume with: node infra/kind/migrate-platform-store.mjs --resume "${backupDirectory}"`);
    else console.error('Original backend configuration was not replaced.');
    throw error;
  } finally {
    process.removeListener('SIGINT', interrupted);
    process.removeListener('SIGTERM', interrupted);
    unfreeze();
    if (helperCreated) {
      try { kubectl(['delete', 'pod', helper, '--wait=false']); } catch { console.error(`Temporary helper pod retained: ${helper}`); }
    }
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.length && (args.length !== 2 || args[0] !== '--resume')) throw new Error('Usage: migrate-platform-store.mjs [--resume BACKUP_DIRECTORY]');
    migrate(args[1]);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
