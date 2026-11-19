import assert from 'node:assert/strict';
import { test } from 'node:test';
import { WebhookNotifier } from './webhook-notifier';
import type { AlertEvent } from './monitor.model';

const event: AlertEvent = {
  id: 'event-1', monitor_id: 'rule-1', monitor_name: 'Errors', signal_type: 'LOG', state: 'FIRING',
  value: 4, threshold: 3, comparator: 'GT', window_seconds: 300, unit: 'logs', estimated: false,
  fired_at: '2026-11-19T09:00:00Z', transition_revision: 1,
};

test('webhook delivers the persisted event with an idempotency key and no redirect', async () => {
  const url = 'https://receiver.example.test/alerts';
  const send: typeof fetch = async (destination, init) => {
    assert.equal(destination, url);
    assert.equal(init?.method, 'POST');
    assert.equal(init?.redirect, 'error');
    assert.equal(new Headers(init?.headers).get('idempotency-key'), event.id);
    assert.deepEqual(JSON.parse(String(init?.body)), event);
    assert.ok(init?.signal);
    return new Response(null, { status: 204 });
  };
  await new WebhookNotifier(url, send).notify(event);
  await assert.rejects(() => new WebhookNotifier(url, async () => new Response(null, { status: 503 })).notify(event),
    /delivery failed/);
});
