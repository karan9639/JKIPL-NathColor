import test from 'node:test';
import assert from 'node:assert/strict';
import { parseERPFile } from '../src/utils/erp-file-parser.js';
import { normalizeYarnRecords } from '../src/utils/import-mappers.js';

const file = (name, content) => {
  const blob = new Blob([content]);
  Object.defineProperty(blob, 'name', { value: name });
  return blob;
};
const zipped = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0, 0]);
const ole = new Uint8Array([0xd0,0xcf,0x11,0xe0,0xa1,0xb1,0x1a,0xe1,0]);
const yarnHeader = ['Main Group','Main Product','Sub Group','Item Code','Item Name','Color','UOM','Last Issue Date','Qty','Value','Qty','Value','Qty','Value','Qty','Value','Rate'];
const yarnData = ['RAW MATERIAL','RAW MATERIAL','YARN','I00053850','0.11 MM MONO','','KGS','8-Oct-26','0','0','4120.4','1071304','2512.4','653224','1608','418080','260'];
const yarnTable = [['Item Wise Stock'],['From Date : 01/04/2026 To Date : 14/10/2026'], yarnHeader, yarnData];

for (const [name, content, expectHtml] of [
  ['Yarn Stock.HTML', '<html><table></table></html>', true],
  ['Yarn Stock.htm', '<!doctype html><html><table></table></html>', true],
  ['Yarn Stock.xls', '\ufeff <html xmlns:x="urn:schemas-microsoft-com:office:excel"><table></table></html>', true],
  ['Yarn Stock.xlsx', zipped, false],
  ['Yarn Stock.xls', ole, false],
]) {
  test(`${name} signature chooses the correct reader and returns .rows`, async () => {
    let used = '';
    const result = await parseERPFile(file(name, content), {backend:'yarn'}, {
      readHtmlTables: async () => {used = 'html'; return [yarnTable];},
      readWorkbook: async () => {used = 'workbook'; return {sheetNames:['Report'],sheetRows:()=>yarnTable};},
    });
    assert.equal(used, expectHtml ? 'html' : 'workbook');
    assert.equal(result.rows.length, 1);
    assert.equal(result.reportPeriod.fromDate, '2026-04-01');
    assert.equal(result.reportPeriod.toDate, '2026-10-14');
    const { rows, errors } = normalizeYarnRecords(result.rows);
    assert.deepEqual(errors, []);
    assert.equal(rows[0].closing.qty, 1608);
    assert.equal(rows[0].receipt.qty, 4120.4);
  });
}

test('numeric Item Code from genuine Excel workbook does not throw .trim error', async()=>{
  const table = [['Item Wise Stock'], yarnHeader, [...yarnData.slice(0,3),1234,...yarnData.slice(4)]];
  const result = await parseERPFile(file('stock.xlsx', zipped),{backend:'yarn'}, {
    readWorkbook:async()=>({sheetNames:['Sheet1'],sheetRows:()=>table}),
    readHtmlTables:async()=>{throw Error('unexpected');},
  });
  assert.equal(result.rows.length,1);
});

test('invalid content and mislabeled text fail with an actionable message',async()=>{
  await assert.rejects(()=>parseERPFile(file('report.xlsx','ordinary text'),{},{}),/Unrecognized ERP file contents/);
  await assert.rejects(()=>parseERPFile(file('report.csv','column1,column2'),{},{}),/Unsupported file type/);
});

test('orders excel preview receives every row, not just the first 300',async()=>{
  const records=Array.from({length:401},(_,i)=>[String(100000+i),'CUSTOMER '+i,'FABRIC '+i]);
  const parsed=await parseERPFile(file('orders.xlsx',zipped),{backend:'orderbook'}, {
    readWorkbook:async()=>({sheetNames:['Orders'],sheetRows:()=>[['ORDER ID','CUSTOMER NAME','ITEM NAME'],...records]}),
    readHtmlTables:async()=>{throw Error('unexpected');},
  });
  assert.equal(parsed.rows.length,401);
  assert.equal(parsed.rows[400]['ORDER ID'],'100400');
});

test('recipe report in non-MIX sheet works for HTML and Excel exports',async()=>{
 const table=[['Dyed and Chemical Details Report'],['Jobcard No.','Manual Lot No.','Item Name','Cost Per Kg'],['61644','8800/1','FABRIC','12.5']];
 for(const f of [file('recipe.HTM','<html><table></table></html>'),file('recipe.xlsx',zipped)]){
  const result=await parseERPFile(f,{endpoint:'/upload-recipe',sheet:'MIX'}, {
   readHtmlTables:async()=>[table],readWorkbook:async()=>({sheetNames:['Dyedr832919'],sheetRows:()=>table}),
  });
  assert.equal(result.rows.length,1);
 }
});

test('dispatch keeps multiple separate lines under same invoice and challan',async()=>{
 const table=[['Challan Date','Challan Number','Invoice No','Item Specification','Despatch Qty.'],
  ['1-Sep-26','1238','8192','FABRIC ONE','92.4'],['1-Sep-26','1238','8192','FABRIC TWO','102.5']];
 const result=await parseERPFile(file('dispatch.xls','<html><table></table></html>'),{endpoint:'/insertDispatch'}, {
  readHtmlTables:async()=>[table],readWorkbook:async()=>{throw Error('unexpected');},
 });
 assert.equal(result.rows.length,2);
 assert.equal(result.rows[1]['Despatch Qty.'],'102.5');
});
