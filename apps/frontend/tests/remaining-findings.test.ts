import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = (path: string) =>
  readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');

test('logs expose stream state and pause controls', () => {
  const actions = source('shared/components/feature-actions.tsx');
  const logs = source('features/logs/hooks/use-logs.tsx');
  const explorer = source('shared/hooks/use-explorer-results.ts');

  assert.match(actions, /explorer\.pauseLive/);
  assert.match(actions, /explorer\.livePaused/);
  assert.match(logs, /useExplorerResults\('logs', getLogs\)/);
  assert.match(explorer, /changed && !paused/);
});

test('monitor authoring previews its rule and protects dirty drafts', () => {
  const form = source('features/monitors/components/monitors-components.tsx');
  const view = source('features/monitors/components/monitors-view.tsx');

  assert.match(form, /Preview against real data/);
  assert.match(form, /htmlFor="monitor-name"/);
  assert.match(form, /aria-label="Monitor query"/);
  assert.match(form, /onDirtyChange/);
  assert.match(view, /Discard unsaved monitor changes\?/);
  assert.doesNotMatch(view, /window\.confirm/);
  assert.match(view, /AlertDialogContent/);
});
