import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = (path: string) =>
  readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');

test('FE-C1: brand surfaces use the shared semantic color token', () => {
  const css = source('index.css');
  const surfaces = [
    source('app/components/app-sidebar.tsx'),
    source('features/auth/login-page.tsx'),
  ].join('\n');

  assert.match(css, /--brand:/);
  assert.match(css, /--color-brand:/);
  assert.doesNotMatch(surfaces, /bg-purple-600/);
  assert.equal((surfaces.match(/bg-brand/g) ?? []).length, 3);
});
