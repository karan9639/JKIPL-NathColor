import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeU3GreigeSheet} from '../src/utils/u3-ledger.js';
import {normalizePlanningSheet} from '../src/utils/knitting.js';
const blank=()=>Array(14).fill('');
const header=()=>{
 const a=blank();a[0]='Item Name';a[1]='UOM';a[2]='Opening';a[4]='Receipt';a[7]='Issue';a[8]='Closing';a[10]='Last Received';a[12]='Last Issue';return a;
};
const labels=()=>{const a=blank();a[4]='Qty';a[5]='Qty Kgs';a[6]='Qty';a[7]='Qty Kgs';a[8]='Qty';a[9]='Qty Kgs';a[10]='Date';a[11]='Qty Kgs';a[12]='Date';a[13]='Qty Kgs';return a;};
const ledger=(item='DRYLEX FABRIC 200G 84W')=>[item,'KGS',0,0,10883.1,10883.1,9326.9,9326.9,1556.2,1556.2,'13-OCT-26',372,'21-SEP-26',1815];
test('ERP U3 (ERP U1) ledger retains exact closing KG and dates',()=>{
 const data=normalizeU3GreigeSheet([blank(),blank(),header(),blank(),labels(),ledger()]);
 assert.equal(data.length,1);assert.equal(data[0].closing.qtyKgs,1556.2);assert.equal(data[0].receipt.qty,10883.1);
 assert.equal(data[0].issue.qtyKgs,9326.9);assert.equal(data[0].lastReceived.date,'2026-10-13');
});
test('ERP repeated printed page headers and footer do not become inventory rows',()=>{
 const title=blank();title[0]='STOCK LEDGER - FROM 01.10.2021 TO 31.10.2026';
 const data=normalizeU3GreigeSheet([title,blank(),header(),blank(),labels(),ledger(),title,header(),blank(),labels(),ledger('NEW FABRIC'),['Total:']]);
 assert.equal(data.length,2);
});
test('true conflicting same fabric and UOM causes actionable error',()=>{
 const change=ledger();change[9]=12;
 assert.throws(()=>normalizeU3GreigeSheet([blank(),blank(),header(),blank(),labels(),ledger(),change]),/conflicts with ERP row/);
});
test('knitting PO sheet preserves PAIRS as distinct UOM and pending delivery note',()=>{
 const head=['DATE','PO. NO','FABRIC NAME','REQUIRED KGS','STOCK','PLANNED QTY','PLANNED MACHINE','E.D.D','DAYS','REMARKS','FABRIC TYPE'];
 const data=normalizePlanningSheet([head,[45838,'PO-20250630','ENGINEERED UPPER','40 PAIRS','','','','URGENT','#VALUE!','HOLD','SPACER']], 'UNIT-3 PLANNER.xlsx');
 assert.equal(data[0].REQUIRED_UOM,'PAIRS');assert.equal(data[0].REQUIRED_QTY,40);assert.equal(data[0].REQUIRED_KGS,null);assert.equal(data[0].EXPECTED_DELIVERY_NOTE,'URGENT');
});
test('identical PO, date, fabric occurrences get separate stable line keys',()=>{
 const head=['DATE','PO. NO','FABRIC NAME','REQUIRED KGS','STOCK','PLANNED QTY','PLANNED MACHINE','E.D.D'];
 const data=normalizePlanningSheet([head,[46296,'PO-20261001','SPACER',100,'NIL',110,26,46303],[46296,'PO-20261001','SPACER',75,'NIL',80,26,46303]],'planner.xlsx');
 assert.notEqual(data[0].PO_LINE_ID,data[1].PO_LINE_ID);assert.equal(data[0].STOCK_NOTE,'NIL');
 assert.equal(data[0].EXPECTED_DELIVERY_DATE,'2026-10-08');
});
