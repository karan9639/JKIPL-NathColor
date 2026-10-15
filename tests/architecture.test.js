import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const src = new URL('../src/', import.meta.url);
function source(path) { return readFileSync(new URL(path, src), 'utf8'); }
test('all requested project layers are present', () => {
    for (const dir of ['app','assets','components','config','constants','context','hooks','layouts','pages','routes','services','state','utils']) {
        assert.equal(existsSync(new URL(dir + '/', src)), true, `Missing ${dir}`);
    }
});
test('verified Express API routes live in dedicated services', () => {
    const dyeing = source('services/dyeing.service.js');
    const yarn = source('services/yarn.service.js');
    for (const [text, path, verb] of [
        [dyeing, '/dyeing/create-dyeingprogram', 'post'], [dyeing, '/dyeing/fetch-dyeingprogram', 'get'],
        [yarn, '/yarn/create-yarnstock', 'post'], [yarn, '/yarn/fetch-yarnstock', 'get'],
    ]) {
        assert.match(text, new RegExp(`\\.${verb}\\('${path.replaceAll('/', '\\/')}'`));
    }
    assert.doesNotMatch(source('pages/dyeing-programs.jsx'), /axios\.|\bfetch\(/);
    assert.doesNotMatch(source('pages/stock/yarn.jsx'), /axios\.|\bfetch\(/);
});
test('permissions keep roles and former legacy username grants', () => {
    const policy = source('constants/permissions.js');
    assert.match(policy, /item\.allowedRoles/);
    assert.match(policy, /item\.allowedUsers/);
});
