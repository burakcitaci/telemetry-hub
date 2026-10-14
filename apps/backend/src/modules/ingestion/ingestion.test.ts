import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import express, { raw } from 'express';
import type { Server } from 'node:http';
import { ConfigService } from '@nestjs/config';
import { IngestionKeysService } from './ingestion-keys.service';
import { IngestionMiddleware } from './ingestion.middleware';

const apiKey = 'test-client-key-with-32-random-chars';
const token = 'test-private-collector-token-with-32-chars';
const keyHash = createHash('sha256').update(apiKey).digest('hex');
const record = { keyHash, orgSlug: 'acme', teamId: 'platform', expiresAt: Date.now() + 60_000 };

function keyStore(overrides = {}) {
  return new IngestionKeysService(new ConfigService({
    INGESTION_KEYS_JSON: JSON.stringify([{ ...record, ...overrides }]),
  }));
}

async function listen(app: ReturnType<typeof express>): Promise<{ server: Server; url: string }> {
  const server = await new Promise<Server>(resolve => {
    const started = app.listen(0, '127.0.0.1', () => resolve(started));
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing server address.');
  return { server, url: `http://127.0.0.1:${address.port}` };
}

test('API key resolution fails closed for unknown, revoked and expired credentials', () => {
  assert.equal(keyStore().resolve('unknown-client-key-with-32-random-chars'), undefined);
  assert.equal(keyStore().resolve(''), undefined);
  assert.equal(keyStore({ revoked: true }).resolve(apiKey), undefined);
  assert.equal(keyStore({ expiresAt: Date.now() - 1 }).resolve(apiKey), undefined);
  assert.equal(keyStore().resolve(apiKey)?.orgSlug, 'acme');
  assert.throws(() => keyStore({ orgSlug: 'injected\r\nheader' }));
  assert.equal(keyStore({ env: 'staging' }).resolve(apiKey)?.env, 'staging');
  assert.equal(keyStore().resolve(apiKey)?.env, undefined);
  for (const env of ['', 'all', 'injected\r\nheader', 'a'.repeat(65)]) assert.throws(() => keyStore({ env }));
});

test('OTLP gateway rejects unauthorized requests and replaces spoofed headers for all signals', async t => {
  const received: { path: string; headers: Record<string, unknown>; body: Buffer }[] = [];
  const collector = express();
  collector.use(raw({ type: () => true }));
  collector.post('/v1/:signal', (req, res) => {
    received.push({ path: req.path, headers: req.headers, body: req.body });
    res.type('application/x-protobuf').send(Buffer.from([0x08, 0x01]));
  });
  const upstream = await listen(collector);
  t.after(() => upstream.server.close());
  const config = new ConfigService({ INGESTION_COLLECTOR_ENDPOINT: upstream.url, INGESTION_COLLECTOR_TOKEN: token });
  const gateway = new IngestionMiddleware(keyStore({ env: 'staging' }), config);
  const app = express();
  app.use('/api/ingest', gateway.authenticate, raw({ type: () => true, limit: '8mb' }), gateway.forward);
  app.use(express.json()); // Mirrors Nest's parser registration after the raw gateway.
  const publicServer = await listen(app);
  t.after(() => publicServer.server.close());
  const endpoint = `${publicServer.url}/api/ingest/v1/`;

  const denied = await fetch(`${endpoint}traces`, { method: 'POST', body: '{}', headers: { 'Content-Type': 'application/json' } });
  assert.equal(denied.status, 401);
  assert.equal(received.length, 0);
  for (const signal of ['traces', 'logs', 'metrics']) {
    const bytes = Buffer.from([0x0a, 0x02, 0x08, 0x01]);
    const response = await fetch(`${endpoint}${signal}`, {
      method: 'POST', body: bytes,
      headers: { 'Content-Type': 'application/x-protobuf', 'X-API-Key': apiKey,
        'X-Telemetry-Org': 'victim', 'X-Telemetry-Team': 'victim-team',
        'X-Telemetry-Environment': 'production', Cookie: 'secret-session' },
    });
    assert.equal(response.status, 200);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), Buffer.from([0x08, 0x01]));
    const sent = received.at(-1)!;
    assert.equal(sent.path, `/v1/${signal}`);
    assert.deepEqual(sent.body, bytes);
    assert.equal(sent.headers['x-telemetry-org'], 'acme');
    assert.equal(sent.headers['x-telemetry-team'], 'platform');
    assert.equal(sent.headers['x-telemetry-environment'], 'staging');
    assert.equal(sent.headers.authorization, `Bearer ${token}`);
    assert.equal(sent.headers['x-api-key'], undefined);
    assert.equal(sent.headers.cookie, undefined);
  }
  const json = '{"resourceSpans":[{"resource":{"attributes":[{"key":"org.slug","value":{"stringValue":"victim"}}]}}]}';
  const response = await fetch(`${endpoint}traces`, { method: 'POST', body: json,
    headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey } });
  assert.equal(response.status, 200);
  assert.equal(received.at(-1)!.body.toString(), json); // Collector overrides payload resource identity.
  assert.equal(received.at(-1)!.headers['x-telemetry-org'], 'acme');
});
