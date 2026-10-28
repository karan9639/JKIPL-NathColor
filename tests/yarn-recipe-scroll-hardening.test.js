import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeYarnRecords, normalizeDyeingRecords, recordAt } from '../src/utils/import-mappers.js';
import { parseERPFile } from '../src/utils/erp-file-parser.js';
import { getRecipePage } from '../src/utils/recipe-records.js';

const fixture = (name, bytes) => {
  const blob = new Blob([bytes]);
  Object.defineProperty(blob,'name',{value:name});
  return blob;
};
test('Yarn Stock missing rows throws actionable error (never undefined.forEach)', () => {
  assert.throws(()=>normalizeYarnRecords(undefined), /Yarn Stock report must contain an array/);
  assert.throws(()=>normalizeYarnRecords({ records:[] }), /Yarn Stock report must contain an array/);
  assert.deepEqual(normalizeYarnRecords([]),{rows:[],errors:[]});
});
test('Malformed individual Yarn and Dyeing records report row numbers instead of crashing',()=>{
  assert.deepEqual(normalizeYarnRecords([null]).rows,[]);
  assert.match(normalizeYarnRecords([null]).errors[0],/Data row 1/);
  assert.match(normalizeDyeingRecords([undefined]).errors[0],/Data row 1/);
  assert.equal(recordAt(null,'Item Name'),'');
});
test('UTF-16LE HTML .xls uses HTML parser rather than Excel OLE reader',async()=>{
  const html='<html><table><tr><td>Item Code</td></tr></table></html>';
  const withBom=new Uint8Array([0xff,0xfe,...new Uint8Array(Buffer.from(html,'utf16le'))]);
  const table=[['Main Group','Main Product','Sub Group','Item Code','Item Name','Color','UOM','Last Issue Date','Qty','Value','Qty','Value','Qty','Value','Qty','Value','Rate'],
  ['RAW MATERIAL','RAW MATERIAL','YARN','X1','YARN','','KGS','',0,0,0,0,0,0,0,0,0]];
  let calls=0;
  const parsed=await parseERPFile(fixture('ERP.xls',withBom),{backend:'yarn'},{
    readHtmlTables:async()=>{calls++;return [table];},
    readWorkbook:async()=>{throw Error('should use HTML reader');}
  });
  assert.equal(calls,1);assert.equal(parsed.rows.length,1);
});
test('Recipe response rejects invalid rows payload; valid paged response renders records',()=>{
 assert.throws(()=>getRecipePage({success:true,data:{pagination:{totalEntries:2}}}),/Unexpected recipe API response/);
 const result=getRecipePage({success:true,data:{rows:[{'Jobcard No.': '144293'}],pagination:{totalEntries:2,currentPage:1,limit:50}}});
 assert.equal(result.pagination.totalEntries,2);
 assert.equal(result.rows[0]['Jobcard No.'],'144293');
});
test('all ERP tables share Order Tracker viewport and imports keep a smaller preview override',()=>{
 const table=readFileSync(new URL('../src/components/ui/data-table.jsx',import.meta.url),'utf8');
 const imports=readFileSync(new URL('../src/pages/imports.jsx',import.meta.url),'utf8');
 const tracker=readFileSync(new URL('../src/pages/production/tracker.jsx',import.meta.url),'utf8');
 const css=readFileSync(new URL('../src/index.css',import.meta.url),'utf8');
 assert.doesNotMatch(table,/maxHeight = ['"]70vh['"]/);
 assert.match(imports,/maxHeight="55vh"/);
 assert.doesNotMatch(tracker,/maxHeight="65vh"/);
 assert.match(table,/erp-data-table-viewport/);
 assert.match(css,/max-height: min\(65dvh, 720px\)/);
 assert.match(css,/overflow-anchor: none/);
});
