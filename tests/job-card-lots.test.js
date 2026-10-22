import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readJobCardLotsPage } from '../src/utils/job-card-lots.js';

test('preserves multiple orders for one job card and lot', () => {
  const shared = { jobCardNo: '143021', manualLotNo: '2321/1 (10)', itemName: 'MESH' };
  const rows = [{ ...shared, orderId: '187131', quantity: 100, kgs: 90 }, { ...shared, orderId: '187127', quantity: 200, kgs: 161.99 }];
  const output = readJobCardLotsPage({ jobCards: rows, pagination: { totalEntries: 2, totalPages: 1, currentPage: 1, limit: 100 } });
  assert.equal(output.rows.length, 2);
  assert.deepEqual(output.rows.map(x => x.orderId), ['187131', '187127']);
});

test('empty results are legal with zero entries and no phantom lots', () => {
  const output = readJobCardLotsPage({ jobCards: [], pagination: { totalEntries: 0, currentPage: 1, totalPages: 1, limit: 100 } });
  assert.equal(output.pagination.totalEntries, 0);
  assert.equal(output.pagination.hasNextPage, false);
});

test('malformed job-card payload does not silently become an empty table', () => {
  assert.throws(() => readJobCardLotsPage({ pagination: { totalEntries: 100 } }), /jobCards/);
});

test('dispatch balance placeholder removed and navigation points to imported lot page', () => {
  const orders = readFileSync(new URL('../src/pages/orders.jsx', import.meta.url), 'utf8');
  const nav = readFileSync(new URL('../src/constants/navigation.js', import.meta.url), 'utf8');
  const routes = readFileSync(new URL('../src/routes/AppRoutes.jsx', import.meta.url), 'utf8');
  assert.doesNotMatch(orders, /Dispatch balance|Not verified/);
  assert.match(nav, /\/stock\/job-card-lots/);
  assert.match(routes, /JobCardLotsPage/);
});
