import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = (file) => readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8');

test('all ERP tables use the same responsive internal scroll viewport', () => {
  const component = source('components/ui/data-table.jsx');
  const css = source('index.css');
  assert.match(component, /erp-data-table-viewport/);
  assert.match(component, /min-w-full/);
  assert.match(component, /<thead className="sticky top-0/);
  assert.match(css, /\.erp-data-table-viewport\s*\{[^}]*max-height:\s*min\(65dvh, 720px\)/s);
  assert.match(css, /@media\s*\(max-width:\s*639px\)[\s\S]*?\.erp-data-table-viewport/);
  assert.match(component, /style=\{\{ maxHeight \}\}/); // explicit special-case override remains possible
});

test('app shell does not shrink panels when the sidebar expands or collapses', () => {
  const shell = source('layouts/AppShell.jsx');
  const css = source('index.css');
  const component = source('components/ui/data-table.jsx');
  assert.match(shell, /app-content-scroll/);
  assert.match(css, /\.app-content-scroll\s*>\s*\*\s*\{\s*flex-shrink:\s*0;/);
  assert.match(component, /<Panel className="flex min-w-0 shrink-0/);
});

test('orders, dyeing, inventory, reports and production use shared table headings', () => {
  const labels = [
    ['pages/orders.jsx', 'Order book records'],
    ['pages/dyeing-programs.jsx', 'Dyeing schedule records'],
    ['pages/stock/greige.jsx', 'Greige stock records'],
    ['pages/stock/job-card-lots.jsx', 'Job card allocation lines'],
    ['pages/stock/yarn.jsx', 'Yarn stock records'],
    ['pages/production/in-progress.jsx', 'Dyeing production records'],
    ['pages/production/records.jsx', 'Daily production records'],
  ];
  for (const [file, title] of labels) {
    assert.match(source(file), new RegExp(`title="${title}"`), file);
  }
  assert.match(source('pages/reports.jsx'), /title=\{`\$\{def\.title\} records`\}/);
  assert.match(source('pages/production/tracker.jsx'), /title="Job card \/ lot records"/);
});

test('one pager remains inside DataTable, with no second pagination of server rows', () => {
  const table = source('components/ui/data-table.jsx');
  assert.match(table, /pageRows = serverPagination \? visible : visible\.slice/);
  assert.match(table, /Page \{remoteCurrent\.toLocaleString/);
  assert.match(table, /isAllPageSize\(pageSize\)/);
  assert.match(table, /\[25, 50, 100\]/);
  assert.doesNotMatch(source('pages/production/tracker.jsx'), /maxHeight="65vh"/);
});
