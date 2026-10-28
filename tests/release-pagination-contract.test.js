import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(file)=>readFileSync(new URL(`../src/${file}`,import.meta.url),'utf8');
test('three large read models use server pagination and cancelable queries',()=>{
 const service=read('services/production.service.js');
 for(const endpoint of ['/vtracker','/production_stages','/knitting/po-lines'])assert.match(service,new RegExp(endpoint));
 assert.equal((service.match(/paged: ?1/g)||[]).length,3);
 assert.equal((service.match(/signal/g)||[]).length>=6,true);
});
test('tracker and planner do not double-paginate records',()=>{
 for(const path of ['pages/production/tracker.jsx','pages/production/in-progress.jsx','pages/unit3/po-planner.jsx']){
   const src=read(path);
   assert.match(src,/serverPagination=\{\{/);
   assert.match(src,/onPageSizeChange/);
 }
});
test('PO-only workflow still has no separate completion entry and no job-card linkage',()=>{
 const src=read('pages/unit3/po-planner.jsx');
 assert.doesNotMatch(src,/Link job card|Save production entry|KNITTING_COMPLETION/);
});
