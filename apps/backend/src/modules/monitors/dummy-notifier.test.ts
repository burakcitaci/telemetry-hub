import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { DummyNotifier } from './dummy-notifier';
import type { AlertEvent } from './monitor.model';

const event: AlertEvent = { id: 'event-1', monitor_id: 'monitor-1', monitor_name: 'API errors\nproduction',
  signal_type: 'LOG', state: 'FIRING', value: 101, threshold: 100, comparator: 'GT', window_seconds: 300,
  unit: 'logs', estimated: false, fired_at: '2026-10-15T12:00:00.000Z', transition_revision: 1,
  notification: { status: 'PENDING', attempted_at: '2026-10-15T12:00:00.000Z' } };
const moduleUrl = new URL('./dummy-notifier.ts', import.meta.url).href;

for (const signal_type of ['LOG', 'METRIC', 'TRACE'] as const) for (const state of ['FIRING', 'RECOVERED'] as const) {
  test(`dummy emits one structured ${state} payload for ${signal_type}`, async () => {
    const lines: string[] = [];
    const notifier = new DummyNotifier(line => { lines.push(line); });
    await notifier.notify({ ...event, signal_type, state });
    assert.equal(lines.length, 1); assert.equal(lines[0].split('\n').length, 2);
    const { notification: _delivery, ...snapshot } = event;
    assert.deepEqual(JSON.parse(lines[0]), { event: 'monitor.alert', status: state === 'FIRING' ? 'firing' : 'resolved',
      ...snapshot, signal_type, state });
  });
}

test('default dummy writer emits a complete JSON line on real stdout', () => {
  const script = `import { DummyNotifier } from ${JSON.stringify(moduleUrl)};
    await new DummyNotifier().notify(${JSON.stringify(event)});`;
  const result = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', script], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).monitor_name, event.monitor_name);
  assert.equal(result.stdout.split('\n').length, 2);
});

test('default stdout failure rejects without an unhandled stream error', () => {
  const script = `import { Writable } from 'node:stream'; import { DummyNotifier } from ${JSON.stringify(moduleUrl)};
    const broken = new Writable({ write(chunk, encoding, callback) { callback(new Error('broken stdout')); } });
    Object.defineProperty(process, 'stdout', { value: broken });
    for (let i = 0; i < 3; i++) {
      try { await new DummyNotifier().notify(${JSON.stringify(event)}); process.exitCode = 2; }
      catch { }
    }
    if (broken.listenerCount('error') !== 0) process.exitCode = 3;
    process.stderr.write('handled');`;
  const result = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', script], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, 'handled');
});

test('dummy awaits asynchronous output and propagates writer failures', async () => {
  let finish!: () => void, completed = false;
  const pending = new Promise<void>(resolve => { finish = resolve; });
  const notification = new DummyNotifier(() => pending).notify(event).then(() => { completed = true; });
  await Promise.resolve(); assert.equal(completed, false);
  finish(); await notification; assert.equal(completed, true);
  await assert.rejects(new DummyNotifier(async () => { throw new Error('output unavailable'); }).notify(event), /output unavailable/);
});
