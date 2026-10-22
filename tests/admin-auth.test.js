import test from 'node:test';
import assert from 'node:assert/strict';
import { canAccess } from '../src/constants/permissions.js';
import { isSuccessfulLoginResponse, userFromLoginResponse } from '../src/services/auth/identity.js';
import { session } from '../src/services/auth/session.js';

const loginResponse = {
    statusCode: 200,
    data: {
        foundUser: {
            _id: 'example-id',
            fullname: 'Prashant',
            email: 'prashant@natharts.com',
            role: 'admin',
        },
    },
    message: 'User Loggedin successfully',
    success: true,
};
const recipes = { allowedUsers: ['dilip', 'ap'] };
const knitting = { allowedUsers: ['shubham', 'gagan', 'ap'] };
const everyone = { allowedUsers: null };

test('recognizes backend success and reads role from data.foundUser', () => {
    assert.equal(isSuccessfulLoginResponse(loginResponse), true);
    assert.deepEqual(userFromLoginResponse(loginResponse, 'wrong@sample.com'), {
        id: 'example-id',
        email: 'prashant@natharts.com',
        username: 'prashant@natharts.com',
        fullname: 'Prashant',
        role: 'admin',
    });
});

test('email is the login identity even when a legacy username is present', () => {
    const account = userFromLoginResponse({
        data: { foundUser: { username: 'prashant', email: 'PRASHANT@Natharts.com', role: 'admin' } },
    });
    assert.equal(account.email, 'prashant@natharts.com');
    assert.equal(account.username, 'prashant@natharts.com');
});

test('admin can see all restricted modules and dashboard', () => {
    const user = userFromLoginResponse(loginResponse);
    assert.equal(canAccess(recipes, user), true);
    assert.equal(canAccess(knitting, user), true);
    assert.equal(canAccess(everyone, user), true);
});

test('roles are normalized and admin is not inferred from email alone', () => {
    const elevated = userFromLoginResponse({ data: { foundUser: { role: ' ADMIN ' } } }, 'staff@example.com');
    assert.equal(canAccess(knitting, elevated), true);
    assert.equal(canAccess(knitting, { email: 'admin@example.com', role: 'staff' }), false);
    assert.equal(canAccess(recipes, { email: 'prashant@natharts.com', role: 'staff' }), false);
});

test('legacy username grants cannot bypass role authorization',()=>{
 const item={allowedRoles:['dyeing'],allowedUsers:['anyone']};
 assert.equal(canAccess(item,{role:'dyeing',email:'staff@example.com'}),true);
 assert.equal(canAccess(item,{role:'billing',email:'anyone@example.com'}),false);
 assert.equal(canAccess({allowedUsers:['someone']},{role:'billing'}),false);
 assert.equal(canAccess({},{role:'billing'}),true);
});
test('explicit failed responses cannot authenticate using stale token fields', () => {
    assert.equal(isSuccessfulLoginResponse({ success: false, token: 'stale' }), false);
    assert.equal(isSuccessfulLoginResponse({ success: false }), false);
    assert.equal(isSuccessfulLoginResponse({ success: true }), true);
});

test('session persists admin role across refresh and clears it on logout', () => {
    const contents = new Map();
    globalThis.localStorage = {
        getItem: (key) => contents.get(key) ?? null,
        setItem: (key, value) => contents.set(key, String(value)),
        removeItem: (key) => contents.delete(key),
    };
    const user = userFromLoginResponse(loginResponse);
    session.save(null, user.username, '', user);
    assert.equal(session.getToken(), null);
    assert.equal(session.getUsername(), 'prashant@natharts.com');
    assert.equal(session.getUser().role, 'admin');
    session.save('outdated-jwt', 'other@example.com', '', { role: 'staff' });
    session.save(null, user.username, '', user);
    assert.equal(session.getToken(), null, 'older bearer token must be removed');
    session.clear();
    assert.equal(session.getUsername(), '');
    assert.equal(session.getUser(), null);
    session.setRememberedEmail('prashant@natharts.com');
    assert.equal(session.getRememberedEmail(), 'prashant@natharts.com');
    session.setRememberedEmail(null);
    assert.equal(session.getRememberedEmail(), '');
});
