import assert from 'node:assert/strict';
import test from 'node:test';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DataTable } from '../src/shared/components/data-table';
import { FeatureBody, FeatureContent } from '../src/shared/components/feature-layout';

// The standalone tsx runner uses classic JSX for files outside src.
Object.assign(globalThis, { React });

test('table preserves column widths and cell whitespace inside a scroll container', () => {
  const html = renderToStaticMarkup(<DataTable
    columns={[
      { accessorKey: 'id', size: 240, cell: ({ getValue }) => <span className="whitespace-nowrap">{String(getValue())}</span> },
      { accessorKey: 'service', size: 180 },
    ]}
    data={[{ id: '0123456789abcdef0123456789abcdef', service: 'backend' }]}
    enableSearch={false}
    enablePagination={false}
  />);
  assert.match(html, /overflow-x-auto/);
  assert.match(html, /min-width:420px/);
  assert.match(html, /<col style="width:240px"/);
  assert.match(html, /<col style="width:180px"/);
  assert.match(html, /class="whitespace-nowrap"/);
  assert.doesNotMatch(html, /overflow-wrap:anywhere|\[&_\.whitespace-nowrap\]/);
});

test('feature layout lets content grow when its sidebar collapses', () => {
  const html = renderToStaticMarkup(<FeatureBody><FeatureContent>Telemetry</FeatureContent></FeatureBody>);
  assert.match(html, /flex min-h-0 min-w-0 flex-1 gap-3/);
  assert.match(html, /min-w-0 flex-1 max-w-full/);
  assert.doesNotMatch(html, /grid-cols|16rem/);
});
