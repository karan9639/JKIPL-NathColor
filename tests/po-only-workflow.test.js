import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizePlanningSheet, plannerStatusFromRemarks} from '../src/utils/knitting.js';
const read=(file)=>readFileSync(new URL(`../src/${file}`,import.meta.url),'utf8');
const header=['DATE','PO. NO','FABRIC NAME','REQUIRED KGS','STOCK','PLANNED QTY','PLANNED MACHINE','E.D.D','DAYS','REMARKS','FABRIC TYPE'];
test('same PO sheet reflects CLOSED status after reupload',()=>{
 const old=normalizePlanningSheet([header,[46296,'PO-20261001','MESH 240 GSM',100,20,100,26,46303,7,'','TRICOT']],'po.xlsx');
 const next=normalizePlanningSheet([header,[46296,'PO-20261001','MESH 240 GSM',100,20,100,26,46303,7,'CLOSED','TRICOT']],'po.xlsx');
 assert.equal(old[0].PO_LINE_ID,next[0].PO_LINE_ID);
 assert.equal(old[0].PLANNER_STATUS,'OPEN');
 assert.equal(next[0].PLANNER_STATUS,'CLOSED');
 assert.equal(next[0].PLANNING_REMARKS,'CLOSED');
});
test('non-CLOSED remarks are not falsely marked complete',()=>{
 for(const text of ['SHORT CLOSE','SKU ORDER ALREADY PLANNED',"DON'T MAKE"])
 assert.notEqual(plannerStatusFromRemarks(text),'CLOSED');
});
test('UI contains no completion import or manual PO/jobcard links',()=>{
 const tracker=read('pages/production/tracker.jsx');
 const routes=read('constants/imports.js');
 const nav=read('constants/navigation.js');
 assert.ok(!tracker.includes('createKnittingEntry'));
 assert.ok(!tracker.includes('linkKnittingJobCard'));
 assert.ok(!tracker.includes('PRODUCED_KGS'));
 assert.ok(!routes.includes("'knitting-completion':"));
 assert.ok(!nav.includes('/imports/knitting-completion'));
});
