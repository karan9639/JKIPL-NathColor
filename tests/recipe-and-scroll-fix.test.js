import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { recipeField, recipeType, recipeDisplay, getRecipePage } from '../src/utils/recipe-records.js';

const actual={
  'Jobcard No.':61644,'Jobcard Date':'2024-10-24',
  'Customer Name':'ALPINE SHOES PVT LTD','Manual Lot No.':'8800/1 (1)',
  'Item Name':'ANZUMA SPACER FABRIC 400G',Colour:'GREY 3(000-55-00)',
  'Jobcard Kg':26.5,'Cost Per Kg':15.1,
};
test('actual Dyed and Chemical Details headers are recognized',()=>{
  assert.equal(recipeType(actual),'Dyed & chemical details');
  const row=recipeDisplay(actual);
  assert.equal(row.jobCard,61644);
  assert.equal(row.lot,'8800/1 (1)');
  assert.equal(row.kgs,26.5);
  assert.equal(row.cost,15.1);
});
test('legacy MIX recipe fields are preserved separately',()=>{
  const legacy={ REGNO:'199',SHADE:'NAVY',QUALITY:'PIQUE',PARTY:'RAYMOND',COLOR1:'BLUE',C1PER:'10' };
  assert.equal(recipeType(legacy),'Legacy MIX recipe');
  assert.equal(recipeDisplay(legacy).colour,'NAVY');
  assert.equal(recipeField(legacy,'COLOR1'),'BLUE');
});
test('paginated response reflects matching total not visible 50 records',()=>{
  const response={success:true,data:{rows:[actual],pagination:{totalEntries:31649,currentPage:2,limit:50,totalPages:633}}};
  const result=getRecipePage(response,2,50);
  assert.equal(result.pagination.totalEntries,31649);
  assert.equal(result.pagination.currentPage,2);
  assert.equal(result.rows.length,1);
});
test('app shell scrolls main content independently of sidebar',()=>{
  const shell=readFileSync(new URL('../src/layouts/AppShell.jsx',import.meta.url),'utf8');
  assert.match(shell,/app-content-scroll/);
  assert.match(shell,/overflow-y-auto overscroll-contain/);
  assert.match(shell,/mainScrollRef/);
  assert.match(shell,/location\.pathname, location\.search/);
});
