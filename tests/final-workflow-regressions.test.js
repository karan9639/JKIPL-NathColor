import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { plannerStatusFromRemarks } from '../src/utils/knitting.js';

test('planner CLOSED is derived from ERP remarks, never a separate upload',()=>{
 assert.equal(plannerStatusFromRemarks(' closed '),'CLOSED');
 assert.equal(plannerStatusFromRemarks('SHORT CLOSE'),'REVIEW');
 assert.equal(plannerStatusFromRemarks('HOLD BY NIKHIL'),'HOLD');
 assert.equal(plannerStatusFromRemarks(''),'OPEN');
});
test('search preserves customer text instead of sorting words',()=>{
 const source = readFileSync(new URL('../src/services/orders.service.js', import.meta.url),'utf8');
 assert.ok(source.includes('trim().replace(/\\s+/g'));
});
test('retired completion import and job-card linking are not exposed',()=>{
 const nav=readFileSync(new URL('../src/constants/navigation.js',import.meta.url),'utf8');
 const tracker=readFileSync(new URL('../src/pages/production/tracker.jsx',import.meta.url),'utf8');
 assert.ok(!nav.includes('/imports/knitting-completion'));
 assert.ok(!tracker.includes('linkKnittingJobCard'));
 assert.ok(!tracker.includes('createKnittingEntry'));
});
test('order modal reads camelCase MongoDB API and never fabricated zero metrics',()=>{
 const code=readFileSync(new URL('../src/components/orders/order-detail-dialog.jsx', import.meta.url),'utf8');
 assert.ok(code.includes('customerName'));assert.ok(code.includes('fetchOrderSummary'));
 assert.ok(code.includes('Not verified'));assert.ok(!code.includes('formatNumber(order[key])'));
});
