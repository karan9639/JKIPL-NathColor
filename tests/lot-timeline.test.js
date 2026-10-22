import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  erpCalendarDate, formatErpCalendarDate, formatErpOpening, formatRecordedEvent,
  getTimelineEvents, getLotStatus, getLatestActivity, openingSortKey, formatTimelineRow,
} from '../src/utils/lot-timeline.js';

const fixture = { ORDERID:'190937', JOBCARDNO:'144296', MANUALLOTNO:'2684/2 (9)',
  JOBCARDDATE:'2026-10-14T00:00:00.000Z', JOBCARDTIME:'11:25 AM' };

test('ERP calendar date and separate time never show concatenated ISO text', () => {
  assert.equal(erpCalendarDate(fixture.JOBCARDDATE), '2026-10-14');
  assert.equal(formatErpCalendarDate(fixture.JOBCARDDATE), '14 Oct 2026');
  assert.equal(formatErpOpening(fixture), '14 Oct 2026 · 11:25 AM');
  assert.equal(formatErpOpening({...fixture,JOBCARDTIME:''}), '14 Oct 2026');
});
test('handles empty/invalid dates without inventing dates', () => {
  assert.equal(formatErpCalendarDate('2026-13-14T00:00:00Z'), '—');
  assert.equal(formatErpOpening({...fixture,JOBCARDDATE:null}), '—');
  assert.equal(formatRecordedEvent(null), '—');
  assert.equal(getLatestActivity(fixture), null);
});
test('preserves source ERP date against timezone shifts and handles DMY', () => {
  assert.equal(formatErpCalendarDate('2026-10-14T00:00:00.000Z'), '14 Oct 2026');
  assert.equal(formatErpCalendarDate('14-10-2026'), '14 Oct 2026');
  assert.equal(openingSortKey({...fixture,JOBCARDTIME:'3:17 PM'}), 202610141517);
});
test('production activity formatted in IST, display event order chronologically', () => {
  const row={...fixture,
    FINISHINGDATE: '2026-10-21T10:00:00.000Z',
    JETLOADINGDATE:'2026-10-21T08:00:00.000Z',
    DYESCHEMISSUEDATE:'2026-10-21T07:00:00.000Z'};
  assert.equal(formatRecordedEvent(row.JETLOADINGDATE), '21 Oct 2026, 01:30 pm IST');
  assert.deepEqual(getTimelineEvents(row).map(e=>e.key),['DYESCHEMISSUEDATE','JETLOADINGDATE','FINISHINGDATE']);
  assert.equal(getLatestActivity(row).short,'Finishing');
  assert.equal(getLotStatus(row),'In production');
});
test('closure sets Closed; invoice without closure does NOT set Closed',()=>{
  assert.equal(getLotStatus(fixture),'Open');
  assert.equal(getLotStatus({...fixture,INVOICE_DATE:'2026-10-22T00:00:00Z'}),'Open');
  const row={...fixture,JOBCARDCLOSEDDATE:'2026-10-22T00:00:00Z'};
  assert.equal(getLotStatus(row),'Closed');
  assert.equal(formatTimelineRow(row).LATEST_STAGE,'Closed');
});
test('views only supported job-card events and not knitting PO lines',()=>{
  const page=readFileSync(new URL('../src/pages/production/tracker.jsx',import.meta.url),'utf8');
  assert.match(page,/formatErpOpening/);
  assert.match(page,/getTimelineEvents/);
  assert.match(page,/onRowClick=\{setSelected\}/);
  assert.doesNotMatch(page,/knittingPOLines|Import \/ Update PO/);
});
