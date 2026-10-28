import test from 'node:test';
import assert from 'node:assert/strict';
import { findReportTable,reportHeaders,withErpOccurrences,parseERPFile,FILE_EXTENSIONS } from '../src/utils/erp-file-parser.js';

test('all report file input types are available',()=>assert.equal(FILE_EXTENSIONS,'.html,.htm,.xls,.xlsx'));
test('actual dispatch header maps to report',()=>{
 const def={endpoint:'/insertDispatch'};
 const table=[['Despatch Details Report'],['Challan Date','Challan Number','Book Code','Invoice No','Item Specification','Despatch Qty.','Order ID'],['1-Sep-26','1238','JOBWORK CHALLAN','8192','FABRIC A','92.4','0']];
 const found=findReportTable([table],[reportHeaders(def)]);
 assert.equal(found.headerIndex,1);
});
test('actual closing report header maps to report',()=>{
 const found=findReportTable([[['Closed Job Card Report'],['ORDER ID','JOB CARD NO.','MANUAL LOT NO.','JOB CARD CLOSED DATE','CLOSED KGS']]], [reportHeaders({endpoint:'/insertClosedJobCards'})]);
 assert.equal(found.headerIndex,1);
});
test('same ERP invoice line gets global occurrence across chunks',()=>{
 const row={'Invoice No':'8192','Item Specification':'A','Despatch Qty.':'10'};
 const rows=withErpOccurrences([row,{'Invoice No':'8193','Item Specification':'B'},row]);
 assert.deepEqual(rows.map(x=>x.__erp_occurrence),[1,1,2]);
});
test('recipe workbook can use the actual Dyedr sheet instead of MIX',async()=>{
 const def={endpoint:'/upload-recipe',backend:undefined,sheet:'MIX'};
 const fakeFile={name:'Recipes.xlsx',slice:()=>new Blob(['PK'])};
 const parsed=await parseERPFile(fakeFile,def,{readWorkbook:async()=>({sheetNames:['Dyedr832919'],sheetRows:()=>[
 ['Dyed and Chemical Details Report'],['Jobcard No.','Manual Lot No.','Item Name','Cost Per Kg'],['61644','8800/1 (1)','ANZUMA SPACER FABRIC','15.1']
 ]}),readHtmlTables:async()=>{throw Error('unexpected html')}});
 assert.equal(parsed.rows.length,1);assert.equal(parsed.rows[0]['Jobcard No.'],'61644');
});
