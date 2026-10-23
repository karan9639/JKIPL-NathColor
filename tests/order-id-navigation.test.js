import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  getOrderId,
  normalizedLotRows,
  orderTrackerStatus,
  trackerSummaryValue,
  uniqueOrderUnits,
} from '../src/utils/order-tracker-presentation.js';

const dialog = readFileSync(new URL('../src/components/orders/order-detail-dialog.jsx', import.meta.url), 'utf8');
const page = readFileSync(new URL('../src/pages/order-tracker.jsx', import.meta.url), 'utf8');

test('order click navigates to order tracker without job-card checks', () => {
  assert.match(dialog, /navigate\(`\/orders\/tracker\?orderId=\$\{encodeURIComponent\(orderId\)\}`\)/);
  assert.match(dialog, /onClick=\{openTracker\}/);
  assert.doesNotMatch(dialog, /if\s*\(.*jobCards.*\)\s*return/);
});
test('tracker reads ID from query params and fetches order independently', () => {
  assert.match(page, /params\.get\('orderId'\)/);
  assert.match(page, /ordersService\.fetchOrderSummary\(orderId\)/);
  assert.match(page, /queryKey: \['order-tracker', orderId\]/);
});
test('order IDs work even with no schedule and no job cards', () => {
  assert.equal(getOrderId({ orderId: 193044 }), '193044');
  assert.equal(orderTrackerStatus({ orders: [{ orderId: '193044' }], lots: [], schedules: [] }), 'Order received · awaiting planning');
  assert.equal(orderTrackerStatus({ orders: [{ orderId: '193044' }], schedules: [{}], lots: [] }), 'Scheduled · awaiting job card');
  assert.equal(normalizedLotRows({ lots: [] }, { jobCards: [] }).length, 0);
});
test('job cards are shown even when stage timeline API fails', () => {
  const rows = normalizedLotRows(null, { jobCards: [{ jobCardNo: '144293', manualLotNo: '2585/6 (4)', kgs: 100 }] }, true);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].jobCardNo, '144293');
  assert.equal(rows[0].stageUnavailable, true);
  assert.equal(orderTrackerStatus({ orders: [{}], schedules: [{}], lots: rows }), 'Job card imported');
});
test('unknown totals are not replaced by zero; original units remain separate', () => {
  assert.equal(trackerSummaryValue(undefined, null), null);
  assert.equal(trackerSummaryValue(0, 12), 0);
  assert.deepEqual(uniqueOrderUnits([{ uom: 'PRS' }, { uom: 'KGS' }, { uom: 'PRS' }]), ['PRS', 'KGS']);
});
