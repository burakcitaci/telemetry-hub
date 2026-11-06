import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { randomBytes, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const image = process.argv[2] || 'telemetry-hub-check';
const name = `telemetry-hub-check-${randomUUID()}`;
const run = args => {
  const result = spawnSync('docker', args, { encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
};
const upstream = createServer((req, res) => {
  req.resume();
  req.on('end', () => {
    if (req.url.startsWith('/v1/')) { res.end(); return; }
    res.setHeader('Content-Type', 'application/json');
    res.end('{"count":"1"}\n');
  });
});
await new Promise(resolve => upstream.listen(0, '0.0.0.0', resolve));
try {
  const port = upstream.address().port;
  run(['run', '--detach', '--name', name, '--read-only', '--tmpfs', '/tmp',
    '--tmpfs', '/var/lib/telemetry-hub:uid=1000,gid=1000,mode=0700',
    ...(process.platform === 'linux' ? ['--add-host', 'host.docker.internal:host-gateway'] : []), '-p', '127.0.0.1::3001',
    '-e', `AUTH_JWT_SECRET=${randomBytes(32).toString('base64url')}`,
    '-e', 'AUTH_USERS_JSON=[]', '-e', 'INGESTION_KEYS_JSON=[]',
    '-e', 'CLICKHOUSE_HOST=host.docker.internal', '-e', `CLICKHOUSE_PORT=${port}`,
    '-e', `OTEL_EXPORTER_OTLP_ENDPOINT=http://host.docker.internal:${port}`, image]);
  const published = run(['port', name, '3001/tcp']).split(':').at(-1);
  await waitForHealth(`http://127.0.0.1:${published}/health`);
  run(['exec', name, 'node', '--input-type=module', '-e',
    `import assert from 'node:assert/strict'; import { DatabaseSync } from 'node:sqlite';
     assert.equal(process.getuid(), 1000);
     const db = new DatabaseSync(process.env.AUTH_DB_PATH);
     assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok'); db.close();
     for (const name of ['eslint', 'prettier', 'esbuild', '@typescript/native'])
       assert.throws(() => import.meta.resolve(name));`]);
  console.log('Container startup, non-root user, read-only root, SQLite writes, and production dependencies passed.');
} finally {
  spawnSync('docker', ['rm', '--force', name], { windowsHide: true, stdio: 'ignore' });
  upstream.closeAllConnections();
  await new Promise(resolve => upstream.close(resolve));
}

async function waitForHealth(url) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try { if ((await fetch(url, { signal: AbortSignal.timeout(1000) })).ok) return; }
    catch { /* Container has not finished startup. */ }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error('Container did not become healthy within 30 seconds.');
}
