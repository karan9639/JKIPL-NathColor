import test from 'node:test';
import assert from 'node:assert/strict';
import {isSignInRequest,httpFailureMessage} from '../src/services/http/http-errors.js';
import {loadAllStockPages} from '../src/services/stock-pagination.js';
test('login 401 shows invalid credentials, not expired session',()=>{
 assert.equal(isSignInRequest('/user/login'),true);
 assert.equal(httpFailureMessage({status:401,url:'/user/login',serverMessage:'Invalid credentials'}),'Invalid email or password.');
 assert.equal(httpFailureMessage({status:401,url:'/orderbook/fetch-order',serverMessage:'Invalid token'}),'Your session has expired. Please sign in again.');
 assert.equal(httpFailureMessage({status:403,url:'/u3greige/create-stock'}),'You do not have permission to perform this action.');
});
test('entire stock snapshot is loaded across backend pagination',async()=>{
 const calls=[];
 const all=await loadAllStockPages(async ({page,limit})=>{
  calls.push({page,limit});
  return {data:{data:{stocks:page===1?[{snapshotId:'s',itemName:'A',closing:{qtyKgs:10}}]:[{snapshotId:'s',itemName:'B',closing:{qtyKgs:20}}],pagination:{totalEntries:2,hasNextPage:page<2}}}};
 },{limit:1});
 assert.equal(all.length,2);assert.equal(all.reduce((a,r)=>a+r.closing.qtyKgs,0),30);assert.equal(calls.length,2);
});
test('concurrently updated stock snapshot cannot create mixed totals',async()=>{
 await assert.rejects(loadAllStockPages(async({page})=>({data:{data:{stocks:[{snapshotId:page===1?'old':'new'}],pagination:{totalEntries:2,hasNextPage:page===1}}}}),{limit:1}),/changed while loading/);
});
