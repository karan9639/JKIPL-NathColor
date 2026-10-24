import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getServerPageMeta } from '../src/utils/server-pagination.js';
import { readImportPage, importQueryParams } from '../src/utils/import-read-models.js';
import { readJobCardLotsPage } from '../src/utils/job-card-lots.js';

const read = path => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');

test('all remote collections use one DataTable server pager with row-size callback', () => {
  for (const page of [
    'pages/dyeing-programs.jsx',
    'pages/stock/yarn.jsx',
    'pages/stock/job-card-lots.jsx',
    'pages/orders.jsx',
    'pages/imports.jsx',
  ]) {
    const source = read(page);
    assert.match(source, /serverPagination=\{/ , page);
    assert.doesNotMatch(source, /<ImportReportPagination/, page);
    assert.match(source, /onPageSizeChange:/, page);
  }
});

test('yarn/dyeing remote report filters preserve user page size', () => {
  for (const page of ['pages/dyeing-programs.jsx', 'pages/stock/yarn.jsx']) {
    const source = read(page);
    assert.match(source, /limit: previous\.limit, page: 1/, page);
    assert.match(source, /queryKey: \[(?:'dyeing-programs'|'yarn-stock'), params\]/, page);
  }
  const filters = read('components/reports/import-report-filters.jsx');
  assert.match(filters, /pageSize = 50/);
  assert.doesNotMatch(filters, /export function ImportReportPagination/);
});

test('remote results are not sliced into secondary client pagination', () => {
  const source = read('components/ui/data-table.jsx');
  assert.match(source, /const pageRows = serverPagination \? visible : visible\.slice/);
  assert.match(source, /remoteTotal/);
  assert.match(source, /\[25, 50, 100\]/);
  assert.match(source, /loading=\{loadMore\.loading\}/);
});

test('19,782 records support all sizes and boundary pages', () => {
  for (const [size, pages] of [[25, 792], [50, 396], [100, 198]]) {
    const first = getServerPageMeta({ totalEntries: 19782, currentPage: 1, limit: size }, size);
    assert.equal(first.pages, pages);
    assert.deepEqual([first.start, first.end], [1, size]);
  }
  assert.deepEqual(
    (({start,end,pages})=>[start,end,pages])(getServerPageMeta({ totalEntries:19782,currentPage:792,limit:25 },7)),
    [19776,19782,792],
  );
});

test('report and job-card page adapters keep full count and selected remote limit', () => {
  const report = readImportPage({ data: { yarnStocks: Array.from({length:50}, (_,i) => ({itemCode:`Y${i}`})), pagination: {totalEntries: 533, totalPages: 11, currentPage: 2, limit:50} } }, 'yarnStocks', 2, 50);
  assert.equal(report.pagination.totalEntries, 533);
  assert.equal(getServerPageMeta(report.pagination,report.rows.length).start, 51);
  const lots = readJobCardLotsPage({ jobCards: [{jobCardNo:'143021',orderId:'187131'}], pagination: {totalEntries: 529, totalPages: 11, currentPage:1, limit:50} });
  assert.equal(lots.pagination.totalEntries, 529);
  assert.equal(lots.pagination.limit, 50);
  assert.deepEqual(importQueryParams({page:1,limit:25,search:'  A   '}), {page:1,limit:25,search:'A'});
});

test('yarn search is backend-wide rather than filtering current page locally', () => {
  const source = read('pages/stock/yarn.jsx');
  assert.match(source, /searchable=\{false\}/);
  const backend = readFileSync(new URL('../../backend/src/controllers/yarnStockControllers/fetchYarnStock.controller.js', import.meta.url), 'utf8');
  assert.match(backend, /const \{ fromDate, toDate, date, search \}/);
  assert.match(backend, /filter\.\$or/);
});
