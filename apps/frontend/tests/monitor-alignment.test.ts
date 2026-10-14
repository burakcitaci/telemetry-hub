import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = (path: string) =>
  readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');

test('monitor page uses the canonical feature header', () => {
  const view = source('features/monitors/components/monitors-view.tsx');

  assert.match(view, /components\/shared\/feature-header/);
  assert.doesNotMatch(view, /aria-label="Go back"/);
  assert.doesNotMatch(view, /aria-label=\{sidebarOpen/);
  assert.match(view, /onFiltersOpen/);
});

test('monitor authoring follows the shared sheet structure', () => {
  const view = source('features/monitors/components/monitors-view.tsx');
  const trace = source('components/shared/trace-detail-sheet.tsx');
  const form = source('features/monitors/components/monitors-components.tsx');
  const workSurface = /className="(flex w-\[min\(96vw,1080px\)\][^"]+)"/;

  assert.match(view, /w-\[min\(96vw,1080px\)\]/);
  assert.equal(view.match(workSurface)?.[1], trace.match(workSurface)?.[1]);
  assert.doesNotMatch(view.match(workSurface)?.[1] ?? '', /shadow-/);
  assert.match(view, /\[&>button:first-of-type\]:hidden/);
  assert.match(view, /aria-label="Close monitor editor"/);
  assert.match(form, /min-h-0 flex-1[^"\n]*overflow-y-auto/);
  assert.match(form, /shrink-0[^"\n]*border-t/);
  assert.match(form, /Saving…/);
  const monitorForm = form.slice(form.indexOf('export const MonitorForm'));
  assert.doesNotMatch(monitorForm, /<Card[>\s]/);
  assert.doesNotMatch(monitorForm, /<select/);
  assert.match(monitorForm, /SelectTrigger id="monitor-team"/);
  assert.match(monitorForm, /\[&_input\]:h-8/);
  assert.match(monitorForm, /\[&_button\[role=combobox\]\]:h-8/);
});
