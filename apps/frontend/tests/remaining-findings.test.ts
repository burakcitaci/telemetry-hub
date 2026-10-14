import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = (path: string) =>
  readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');

test('logs expose stream state and pause controls', () => {
  const actions = source('shared/components/feature-actions.tsx');
  const logs = source('features/logs/hooks/use-logs.tsx');

  assert.match(actions, /Pause live updates/);
  assert.match(actions, /Updates paused/);
  assert.match(logs, /pausedRef\.current/);
});

test('monitor authoring previews its rule and protects dirty drafts', () => {
  const form = source('features/monitors/components/monitors-components.tsx');
  const view = source('features/monitors/components/monitors-view.tsx');

  assert.match(form, /Rule preview/);
  assert.match(form, /htmlFor="monitor-name"/);
  assert.match(form, /htmlFor="monitor-query"/);
  assert.match(form, /onDirtyChange/);
  assert.match(view, /Discard unsaved monitor changes\?/);
  assert.doesNotMatch(view, /window\.confirm/);
  assert.match(view, /AlertDialogContent/);
});
