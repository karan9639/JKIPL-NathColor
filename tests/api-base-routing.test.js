import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeApiBaseUrl } from '../src/config/api-url.js';
const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('localhost Vite uses first-party API path and proxies to Express', () => {
  assert.match(read('../.env.development'), /^VITE_API_BASE_URL=\/api\/v1$/m);
  assert.match(read('../vite.config.js'), /proxy:.*'\/api'/);
  assert.equal(normalizeApiBaseUrl('/api/v1'), '/api/v1');
  assert.equal(new URL('/api/v1/user/login','http://localhost:3000').href,
    'http://localhost:3000/api/v1/user/login');
});
test('production serves API from app.jkipl.com and Vercel proxies to Railway', () => {
  assert.match(read('../.env.production'), /^VITE_API_BASE_URL=\/api\/v1$/m);
  assert.match(read('../.env.production'), /^VITE_LEGACY_API_BASE_URL=\/api\/v1$/m);
  const rewrites = JSON.parse(read('../vercel.json')).rewrites;
  assert.equal(rewrites.length,2);
  assert.equal(rewrites[0].source,'/api/:path*');
  assert.equal(rewrites[0].destination,'https://nathcolorbackend-production.up.railway.app/api/:path*');
  assert.equal(rewrites[1].destination,'/index.html');
  assert.match(read('../vite.config.js'), /Production builds require VITE_API_BASE_URL=\/api\/v1/);
});
test('rejects bad paths and invalid absolute URLs', () => {
  assert.equal(normalizeApiBaseUrl('http://localhost:8000/api/v1/'), 'http://localhost:8000/api/v1');
  for (const invalid of ['', 'api/v1', 'localhost:8000/api/v1', '/orders/api/v1',
    'https://example.com/api/v1?x=1', 'ftp://example.com/api/v1',
    'https://user:secret@example.com/api/v1']) {
    assert.throws(() => normalizeApiBaseUrl(invalid), /VITE_API_BASE_URL/);
  }
});
test('all API services use shared HTTP clients, never frontend-relative fetch', () => {
  const names=['orders.service.js','production.service.js','inventory.service.js',
    'recipes.service.js','imports.service.js','job-card.service.js'];
  for (const name of names) {
    const source=read(`../src/services/${name}`);
    assert.doesNotMatch(source, /(?<!\w)fetch\s*\(/,name);
    assert.match(source,/\b(?:http|legacyHttp)\./,name);
  }
  assert.match(read('../src/services/http/client.js'), /INVALID_API_RESPONSE/);
});
