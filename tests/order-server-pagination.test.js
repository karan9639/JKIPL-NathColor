import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getServerPageMeta } from '../src/utils/server-pagination.js';

test('50 rows means 396 pages of 19782 records, not 2 pages of 100', () => {
  const p = getServerPageMeta({ totalEntries: 19782, currentPage: 1, limit: 50 }, 50);
  assert.deepEqual([p.start, p.end, p.total, p.page, p.pages], [1, 50, 19782, 1, 396]);
});

test('changing size to 100 means 198 pages over the same full dataset', () => {
  const p = getServerPageMeta({ totalEntries: 19782, currentPage: 2, limit: 100 }, 100);
  assert.deepEqual([p.start, p.end, p.pages], [101, 200, 198]);
});

test('final page and empty results are counted correctly', () => {
  const last = getServerPageMeta({ totalEntries: 19782, currentPage: 396, limit: 50 }, 32);
  assert.deepEqual([last.start, last.end, last.hasNext], [19751, 19782, false]);
  const empty = getServerPageMeta({ totalEntries: 0, currentPage: 1, limit: 50 }, 0);
  assert.deepEqual([empty.start, empty.end, empty.pages], [0, 0, 1]);
});

test('All Orders uses one server pager, not a second report pager', () => {
  const page = readFileSync(new URL('../src/pages/orders.jsx', import.meta.url), 'utf8');
  const table = readFileSync(new URL('../src/components/ui/data-table.jsx', import.meta.url), 'utf8');
  const service = readFileSync(new URL('../src/services/orders.service.js', import.meta.url), 'utf8');
  assert.match(page, /serverPagination=\{/);
  assert.doesNotMatch(page, /<ImportReportPagination/);
  assert.match(page.replace(/\s+/g, ' '), /queryKey: \[ ['\"]order-book['\"], orderBookPage, orderBookLimit, search, orderBookSort,? \]/);
  assert.match(table, /const pageRows = serverPagination \? visible :/);
  assert.match(service, /limit = 50/);
  assert.match(service, /params\.sortBy = sorting\.key/);
});
