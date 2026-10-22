import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

let server;
let fields;
let Button;
let DataTable;
before(async () => {
  server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' });
  fields = await server.ssrLoadModule('/src/components/ui/field.jsx');
  ({ Button } = await server.ssrLoadModule('/src/components/ui/button.jsx'));
  ({ DataTable } = await server.ssrLoadModule('/src/components/ui/data-table.jsx'));
});
after(async () => { await server?.close(); });
const render = (component, props, ...children) => renderToStaticMarkup(React.createElement(component, props, ...children));

test('field errors are linked to their input and required status is semantic', () => {
  const html = render(fields.Field, { htmlFor: 'quantity', label: 'Quantity', required: true, error: 'Enter quantity' }, React.createElement(fields.Input));
  assert.match(html, /for="quantity"/);
  assert.match(html, /id="quantity"/);
  assert.match(html, /aria-describedby="quantity-description"/);
  assert.match(html, /aria-invalid="true"/);
  assert.match(html, /required=""/);
});
test('independently labeled nested controls do not inherit duplicate input IDs', () => {
  const html = render(fields.Field, { htmlFor: 'width', label: 'Width' }, React.createElement(fields.Input, { id: 'width' }), React.createElement(fields.Select, { 'aria-label': 'Width unit' }));
  assert.equal((html.match(/id="width"/g) || []).length, 1);
});
test('loading buttons prevent repeated submissions', () => {
  const html = render(Button, { loading: true, type: 'submit' }, 'Save entry');
  assert.match(html, /disabled=""/);
  assert.match(html, /aria-busy="true"/);
});
test('large tables initially render only their first page', () => {
  const rows = Array.from({ length: 120 }, (_, index) => ({ id: index + 1 }));
  const html = render(DataTable, { rows, columns: [{ key: 'id', label: 'Record ID' }], searchable: false });
  const body = html.match(/<tbody>([\s\S]*?)<\/tbody>/)?.[1] || '';
  assert.equal((body.match(/<tr/g) || []).length, 50);
  assert.match(html, /Rows per page/);
  assert.match(html, /scroll to view all columns/);
});
test('table failures remain visible and disable export of stale rows', () => {
  const html = render(DataTable, { rows: [{ id: 1 }], error: 'Network unavailable', exportName: 'records' });
  assert.match(html, /Network unavailable/);
  assert.match(html, /disabled=""/);
  assert.doesNotMatch(html, /<tbody>/);
});
test('truncated identifiers expose a keyboard-accessible full-value action', () => {
  const html = render(DataTable, { rows: [{ id: 'ERP-identifier' }], columns: [{ key: 'id', label: 'Order', className: 'max-w-56 truncate' }] });
  assert.match(html, /aria-label="View full Order: ERP-identifier"/);
});
