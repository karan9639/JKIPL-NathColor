import test from 'node:test';
import assert from 'node:assert/strict';
import { authenticatedUserFromMe, sessionCookieHelp } from '../src/services/auth/session-verification.js';

test('GET /user/me requires an authenticated user identity', () => {
  const user = authenticatedUserFromMe({success:true,data:{foundUser:{_id:'123',email:'staff@example.com',role:'unit3'}}});
  assert.equal(user.id,'123');
  assert.equal(user.role,'unit3');
  assert.throws(()=>authenticatedUserFromMe({success:true,data:{foundUser:{}}}), /valid user/);
  assert.throws(()=>authenticatedUserFromMe({success:false}), /verification failed/);
});

test('unauthorized /user/me after accepted login is explained as cookie failure', () => {
  assert.match(sessionCookieHelp({status:401}),/cookie may be blocked/i);
  assert.equal(sessionCookieHelp({status:500}),null);
});
