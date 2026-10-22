import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read=(p)=>readFileSync(new URL(`../src/${p}`,import.meta.url),'utf8');

test('Unit-3 PO Planner has its own sidebar page, route and import link',()=>{
  const nav=read('constants/navigation.js');
  const routes=read('routes/AppRoutes.jsx');
  const po=read('pages/unit3/po-planner.jsx');
  assert.match(nav,/label:'Unit-3 Knitting'/);
  assert.match(nav,/path:'\/unit3\/po-planner'/);
  assert.equal((nav.match(/path:'\/imports\/knitting-po-planning'/g)??[]).length,1);
  assert.match(routes,/path="unit3\/po-planner"/);
  assert.match(routes,/Unit3POPlannerPage/);
  assert.match(po,/productionService\.knittingPOLines/);
  assert.match(po,/Import \/ Update PO sheet/);
  assert.match(po,/knittingStatus/);
  assert.doesNotMatch(po,/tracker\.refetch|linkKnittingJobCard|createKnittingEntry/);
});

test('Dyeing Lot Timeline does not request or render knitting PO data',()=>{
  const tracker=read('pages/production/tracker.jsx');
  assert.match(tracker,/productionService\.tracker/);
  assert.match(tracker,/JOBCARDNO/);
  assert.match(tracker,/MANUALLOTNO/);
  assert.doesNotMatch(tracker,/knittingPOLines|Unit-3 PO Planner Lines|PLANNER_STATUS|Import \/ Update PO/);
});
