import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { orderTrackerPath, readTrackerOrderId, getOrderLotEvents, orderTrackingState, orderLotStatus } from '../src/utils/order-tracker.js';
const read = name => readFileSync(new URL(name, import.meta.url), 'utf8');

test('All Orders CTA builds an order-specific deep link (and escapes special characters)', () => {
  assert.equal(orderTrackerPath('193044'), '/orders/tracker?orderId=193044');
  assert.equal(orderTrackerPath(' 189904 '), '/orders/tracker?orderId=189904');
  assert.equal(orderTrackerPath('123 /A'), '/orders/tracker?orderId=123%20%2FA');
  assert.equal(readTrackerOrderId(new URLSearchParams('orderId=193044')), '193044');
  assert.match(read('../src/components/orders/order-detail-dialog.jsx'), /to=\{orderTrackerPath\(orderId\)\}/);
});

test('Order Tracker uses URL-selected Order ID and order-scoped API, not global list', () => {
  const page = read('../src/pages/order-tracker.jsx');
  assert.match(page, /useSearchParams/);
  assert.match(page, /encodeURIComponent\(orderId\)/);
  assert.match(page, /\/tracker`/);
  assert.doesNotMatch(page, /productionService\.tracker/);
  assert.match(page, /setParams\(\{ orderId: id \}\)/);
});

test('Orders without imported job cards are not shown with unrelated lots', () => {
  assert.equal(orderTrackingState({ orders: [{}], schedules: [], lots: [] }), 'Order imported — schedule not imported');
  assert.equal(orderTrackingState({ schedules: [{}], lots: [] }), 'Scheduled — no job card imported');
  assert.equal(orderTrackingState({ lots: [{ events: [], closedAt: null }] }), 'Job cards open');
});

test('Chronological lot timeline shows only real recorded events', () => {
  const lot = {jobCardDate:'2026-10-14T00:00:00.000Z',jobCardTime:'10:17 AM',events:[
    {stage:'jet',eventDate:'2026-10-22T11:31:00Z'}, {stage:'dyes',eventDate:'2026-10-22T11:30:00Z'},
  ]};
  const events = getOrderLotEvents(lot);
  assert.deepEqual(events.map(e => e.label), ['Job card opened (ERP)', 'Dyes & chemicals issued', 'Jet loading']);
  assert.equal(events[0].display, '14 Oct 2026 · 10:17 AM');
  assert.equal(orderLotStatus(lot), 'In production');
  assert.equal(getOrderLotEvents({events:[]}).length, 0);
});
