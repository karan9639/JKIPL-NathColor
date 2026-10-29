import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('Greige Stock fetches a single backend page matching its 50-row default', () => {
  const page = source('../src/pages/stock/greige.jsx');
  const service = source('../src/services/greige-stock.service.js');
  assert.match(page, /\[limit, setLimit\] = useState\(50\)/);
  assert.match(page, /queryFn:\s*\(\{ signal \}\) => fetchStockPage\(unit, params, signal\)/);
  assert.match(page, /serverPagination=\{\{/);
  assert.match(page, /onServerSortChange=/);
  assert.match(page, /onPageSizeChange:\s*\(nextLimit\)/);
  assert.match(page, /searchable=\{false\}/);
  assert.match(service, /async fetchPage\(unit, \{ page = 1, limit = 50, search = '', sortBy, sortDir \} = \{\}, signal\)/);
  assert.match(service, /params:\s*\{ page, limit,/);
  // Bulk download can still be triggered explicitly by Export all.
  assert.match(page, /async function exportAll\(\)/);
  assert.ok(page.indexOf('async function exportAll()') < page.indexOf('fetchAllU3()'));
});

test('Greige Stock KPI values are API summaries, not calculated from visible page', () => {
  const page = source('../src/pages/stock/greige.jsx');
  assert.match(page, /query\.data\?\.summary/);
  assert.match(page, /summary\.totalStock/);
  assert.match(page, /summary\.qualities/);
  assert.match(page, /summary\.outOfStock/);
  assert.match(page, /summary\.below500/);
  assert.doesNotMatch(page, /rows\.map\(/);
});
