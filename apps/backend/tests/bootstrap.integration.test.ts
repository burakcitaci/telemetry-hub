import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { once } from 'node:events';

test('compiled backend resolves the real provider graph and serves health without live infrastructure', { timeout: 30000 }, async () => {
  let queries = 0;
  const upstream = createServer((request, response) => {
    request.resume();
    request.on('end', () => {
      if (request.url?.startsWith('/v1/')) { response.end(); return; }
      queries++;
      response.setHeader('Content-Type', 'application/json');
      response.end('{"count":"1"}\n');
    });
  });
  await new Promise<void>(resolve => upstream.listen(0, '127.0.0.1', resolve));
  const upstreamPort = (upstream.address() as { port: number }).port;
  const reservation = createServer();
  await new Promise<void>(resolve => reservation.listen(0, '127.0.0.1', resolve));
  const port = (reservation.address() as { port: number }).port;
  await new Promise<void>(resolve => reservation.close(() => resolve()));
  const child = spawn(process.execPath, [fileURLToPath(new URL('../dist/app.js', import.meta.url))], {
    cwd: fileURLToPath(new URL('..', import.meta.url)), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NODE_ENV: 'test', HOST: '127.0.0.1', PORT: String(port), AUTH_DB_PATH: ':memory:',
      AUTH_JWT_SECRET: randomBytes(32).toString('base64url'), AUTH_USERS_JSON: '[]', INGESTION_KEYS_JSON: '[]',
      INGESTION_COLLECTOR_TOKEN: randomBytes(32).toString('base64url'),
      CLICKHOUSE_HOST: '127.0.0.1', CLICKHOUSE_PORT: String(upstreamPort), CLICKHOUSE_DATABASE: 'default',
      CLICKHOUSE_USERNAME: 'default', CLICKHOUSE_PASSWORD: '', CLICKHOUSE_TIMEOUT: '1000',
      OTEL_EXPORTER_OTLP_ENDPOINT: `http://127.0.0.1:${upstreamPort}` },
  });
  let output = '', startupError: Error | undefined;
  child.stdout.on('data', chunk => { output = (output + chunk).slice(-4000); });
  child.stderr.on('data', chunk => { output = (output + chunk).slice(-4000); });
  child.on('error', error => { startupError = error; });
  try {
    const deadline = Date.now() + 20000;
    let healthy = false;
    while (Date.now() < deadline && child.exitCode === null && !startupError) {
      try {
        const response = await fetch(`http://127.0.0.1:${port}/health`, { signal: AbortSignal.timeout(1000) });
        healthy = response.status === 200; if (healthy) break;
      } catch { /* The process has not bound its socket yet. */ }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.equal(healthy, true, startupError?.message ?? output);
    assert.ok(queries >= 2, 'ClickhouseService must initialize and inspect its required tables');
    assert.doesNotMatch(output, /UndefinedDependencyException|Cannot read properties of undefined/);
  } finally {
    if (child.exitCode === null) {
      const exited = once(child, 'exit'); child.kill();
      await exited;
    }
    upstream.closeAllConnections();
    await new Promise<void>(resolve => upstream.close(() => resolve()));
  }
});
