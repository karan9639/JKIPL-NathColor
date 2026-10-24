import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read=(path)=>readFileSync(new URL(`../src/${path}`,import.meta.url),'utf8');
test('yarn numeric columns import their number conversion helper',()=>{
  const code=read('pages/stock/yarn.jsx');
  assert.match(code, /formatDate, formatNumber, toNumber/);
});
test('all large paginated list requests receive React Query AbortSignal',()=>{
  for(const page of ['pages/orders.jsx','pages/dyeing-programs.jsx','pages/stock/yarn.jsx','pages/stock/job-card-lots.jsx']){
    assert.match(read(page), /queryFn:\s*(?:async\s*)?\(\{\s*signal\s*\}\)/,page);
  }
  for(const service of ['services/orders.service.js','services/import-report.service.js','services/job-card.service.js']){
    assert.match(read(service),/signal/,service);
  }
});
test('DataTable uses MongoDB identity for stable row reconciliation',()=>{
  assert.match(read('components/ui/data-table.jsx'), /row\._id \?\? row\.recordKey \?\? i/);
});

import { retryReadOnce } from '../src/services/http/retry.js';
test('network/server errors retry once; 401/403/422 never automatically retry',()=>{
  assert.equal(retryReadOnce(0,{status:503}),true);
  assert.equal(retryReadOnce(1,{status:503}),false);
  assert.equal(retryReadOnce(0,{status:401}),false);
  assert.equal(retryReadOnce(0,{status:422}),false);
  assert.equal(retryReadOnce(0,{code:'ERR_NETWORK'}),true);
});
