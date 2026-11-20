import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { collectorConfig, environmentFor, root } from './setup.mjs';

const id = randomBytes(6).toString('hex');
const project = 'telemetry-journey-' + id;
const tenantSlug = 'journey';
const email = 'journey@example.test';
const password = randomBytes(24).toString('hex');
const team = 'backend';
const envName = 'journey';
const service = 'fixture-' + id;
const directory = await mkdtemp(join(tmpdir(), project + '-'));
const configPath = join(directory, 'collector.yaml');
const emptyEnvFile = join(directory, 'compose.env');
let composeEnv;
let base;
let cookie;

function compose(...args) {
  const result = spawnSync(
    'docker',
    ['compose', '--env-file', emptyEnvFile, '--project-name', project, ...args],
    { cwd: root, env: composeEnv, encoding: 'utf8', windowsHide: true, timeout: 360_000 },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      'Docker Compose command failed (' + args[0] + ')\n' + result.stdout + result.stderr,
    );
  }
  return result.stdout.trim();
}

async function request(path, { method = 'GET', body, key } = {}) {
  const headers = {};
  if (body) headers['content-type'] = 'application/json';
  if (cookie && !key) headers.cookie = cookie;
  if (key) headers['x-api-key'] = key;
  const response = await fetch(base + path, {
    method,
    headers,
    body: body && JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  if (path === '/api/auth/login') cookie = response.headers.getSetCookie()[0]?.split(';')[0];
  assert.ok(
    response.ok,
    method +
      ' ' +
      path +
      ' returned ' +
      response.status +
      ' ' +
      (response.ok ? '' : await response.text()),
  );
  const result = await response.json();
  return result.data ?? result;
}

function unixNano(time) {
  return (BigInt(time) * 1_000_000n).toString();
}

function logRecord(time, message, severityText = 'INFO') {
  return { timeUnixNano: unixNano(time), severityText, body: { stringValue: message } };
}

function traceSpan(time, traceId, name) {
  return {
    traceId,
    spanId: randomBytes(8).toString('hex'),
    name,
    kind: 2,
    startTimeUnixNano: unixNano(time),
    endTimeUnixNano: unixNano(time + 20),
    status: { code: 1 },
  };
}

async function eventually(check) {
  const deadline = Date.now() + 75_000;
  let lastError;
  do {
    try {
      return await check();
    } catch (error) {
      lastError = error;
      await delay(1_500);
    }
  } while (Date.now() < deadline);
  throw lastError;
}

async function verifyJourney() {
  await request('/api/auth/login', { method: 'POST', body: { tenantSlug, email, password } });
  assert.ok(cookie, 'login returned a session cookie');
  const { key } = await request('/api/admin/ingestion-keys', {
    method: 'POST',
    body: { name: service, teamId: team, env: envName, expiresInDays: 1 },
  });
  const resource = { attributes: [{ key: 'service.name', value: { stringValue: service } }] };
  const now = Date.now();
  const older = now - 60_000;
  const marker = 'historical match ' + id;
  const traceId = randomBytes(16).toString('hex');
  const logRecords = [logRecord(older, marker, 'ERROR')];
  for (let index = 0; index < 205; index++) {
    logRecords.push(logRecord(older + 10_000 + index, 'newer log ' + index));
  }
  await request('/api/ingest/v1/logs', {
    method: 'POST',
    key,
    body: { resourceLogs: [{ resource, scopeLogs: [{ scope: { name: 'fixture' }, logRecords }] }] },
  });
  await request('/api/ingest/v1/traces', {
    method: 'POST',
    key,
    body: {
      resourceSpans: [
        {
          resource,
          scopeSpans: [
            {
              scope: { name: 'fixture' },
              spans: [
                traceSpan(older, traceId, 'historical span'),
                traceSpan(now - 1_000, randomBytes(16).toString('hex'), 'newer span'),
              ],
            },
          ],
        },
      ],
    },
  });

  const range = {
    from: new Date(older - 10_000).toISOString(),
    to: new Date(now).toISOString(),
    service,
    env: envName,
  };
  const logs = '/api/logs?';
  await eventually(async () => {
    const batch = await request(logs + new URLSearchParams({ ...range, limit: '200' }));
    assert.equal(batch.length, 200);
    assert.ok(batch.every((row) => row.Body !== marker));
  });
  const matches = await request(
    logs + new URLSearchParams({ ...range, q: id, statuses: 'ERROR', limit: '1' }),
  );
  assert.deepEqual(
    matches.map((row) => row.Body),
    [marker],
  );
  await eventually(async () => {
    const traces = await request(
      '/api/traces?' +
        new URLSearchParams({
          ...range,
          to: new Date(older + 1_000).toISOString(),
          q: 'historical',
          statuses: 'OK',
        }),
    );
    assert.deepEqual(
      traces.map((row) => row.TraceId),
      [traceId],
    );
  });
  const activity = await request(
    '/api/ingestion-status?' + new URLSearchParams({ service, env: envName, team }),
  );
  assert.ok(activity.find((row) => row.signal === 'logs')?.latest);
  assert.ok(activity.find((row) => row.signal === 'traces')?.latest);

  const rule = {
    name: 'Fixture log alert',
    signal_type: 'LOG',
    query: 'severity_text:ERROR',
    aggregation: 'COUNT',
    comparator: 'GT',
    threshold: 0,
    window_seconds: 300,
    service,
    team_id: team,
    env: envName,
  };
  const preview = await request('/api/monitors/preview', { method: 'POST', body: rule });
  assert.equal(preview.state, 'FIRING');
  assert.equal(preview.value, 1);
  assert.deepEqual((await request('/api/alerts')).items, []);
  const { id: monitorId } = await request('/api/monitors', { method: 'POST', body: rule });
  await eventually(async () => {
    const { items } = await request(
      '/api/alerts?' + new URLSearchParams({ monitor_id: monitorId }),
    );
    assert.equal(items.length, 1);
    assert.equal(items[0].state, 'FIRING');
    assert.equal(items[0].value, 1);
    assert.equal(items[0].service, service);
    assert.equal(items[0].team_id, team);
    assert.equal(items[0].env, envName);
  });
  console.log(
    'Verified OTLP log/trace ingestion, historical search, onboarding status, and a persisted monitor transition.',
  );
}

try {
  const generated = await environmentFor({
    org: tenantSlug,
    team,
    email,
    password,
    port: 5000,
    apiPort: 3001,
  });
  await writeFile(configPath, collectorConfig());
  await writeFile(emptyEnvFile, '');
  composeEnv = {
    ...process.env,
    ...generated,
    API_PORT: '0',
    COLLECTOR_CONFIG_PATH: configPath,
    MONITOR_NOTIFIER: 'dummy',
    MONITOR_WEBHOOK_URL: '',
    MONITOR_TEAM_DESTINATIONS: '{}',
  };
  compose('up', '--build', '--wait', '--wait-timeout', '150', 'backend');
  const address = compose('port', 'backend', '3001');
  assert.match(address, /^127\.0\.0\.1:\d+$/);
  base = 'http://' + address;
  await verifyJourney();
} catch (error) {
  if (composeEnv) console.error(compose('logs', '--no-color', '--tail', '25'));
  throw error;
} finally {
  try {
    if (composeEnv) compose('down', '--volumes', '--remove-orphans');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
