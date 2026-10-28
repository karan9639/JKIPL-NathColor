import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isAllPageSize, localPageSize, normalizePageSize, MAX_ALL_ROWS } from '../src/utils/all-page-size.js';
import { getServerPageMeta } from '../src/utils/server-pagination.js';
import { readJobCardLotsPage } from '../src/utils/job-card-lots.js';
import { getRecipePage } from '../src/utils/recipe-records.js';
import { readImportPage } from '../src/utils/import-read-models.js';
const source = (f) => readFileSync(new URL('../src/'+f,import.meta.url),'utf8');

test('All works locally and across remote pagination without miscalculating pages',()=>{
 assert.equal(normalizePageSize('all'),'all');
 assert.equal(localPageSize('all',19782),19782);
 assert.equal(localPageSize('all',0),1);
 assert.equal(isAllPageSize('all'),true);
 const p=getServerPageMeta({totalEntries:19782,limit:'all',currentPage:1,totalPages:1},19782);
 assert.deepEqual([p.page,p.pages,p.start,p.end],[1,1,1,19782]);
 assert.equal(MAX_ALL_ROWS,50000);
});
test('All metadata survives order/jobcard, yarn and recipe adapters',()=>{
 const yarn=readImportPage({data:{yarnStocks:[{itemName:'A'}],pagination:{limit:'all',totalEntries:1,totalPages:1}}},'yarnStocks');
 assert.equal(yarn.pagination.limit,'all');
 const lots=readJobCardLotsPage({jobCards:[{jobCardNo:'A'}],pagination:{limit:'all',totalEntries:1,totalPages:1}});
 assert.equal(lots.pagination.limit,'all');
 const recipe=getRecipePage({success:true,data:{rows:[{}],pagination:{limit:'all',totalEntries:1,totalPages:1}}});
 assert.equal(recipe.pagination.limit,'all');
});
test('all submitted search screens reset applied search when textbox becomes empty',()=>{
 for(const path of ['pages/orders.jsx','pages/recipes.jsx','pages/stock/job-card-lots.jsx','pages/production/tracker.jsx']) {
  const s=source(path);
  assert.match(s,/if\(!next\.trim\(\)\)/,path);
  assert.match(s,/setSearch\(['"]['"]\)/,path);
 }
 assert.match(source('components/reports/import-report-filters.jsx'),/!value\.trim\(\)/);
});
test('shared table includes All and uses a finite rendering window',()=>{
 const s=source('components/ui/data-table.jsx');
 assert.match(s,/<option value="all"/);
 assert.match(s,/displayRows = isVirtual/);
 assert.match(s,/remoteTotal > MAX_ALL_ROWS/);
});
