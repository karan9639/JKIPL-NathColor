import test from 'node:test';
import assert from 'node:assert/strict';
import {preflightJobCards} from '../src/utils/jobcard-import-preview.js';
const a={'ORDER ID':'187131','JOB CARD NO.':'143021','MANUAL LOT NO.':'2321/1 (10)','JOB CARD DATE':'1-Oct-26','CUSTOMER NAME':'SSA','ITEM NAME':'FABRIC','KGS':'90.71'};
test('preserves different orders for one job card',()=>{
 const r=preflightJobCards([a,{...a,'ORDER ID':'187127'}]);assert.equal(r.rows.length,2);assert.equal(r.errors.length,0);
});
test('skips repeated identical line, but rejects conflicting line',()=>{
 const d=preflightJobCards([a,{...a}]);assert.equal(d.rows.length,1);assert.equal(d.duplicateRows,1);
 const e=preflightJobCards([a,{...a,KGS:'160'}]);assert.equal(e.errors.length,1);
});
