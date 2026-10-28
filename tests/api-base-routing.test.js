import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeApiBaseUrl } from '../src/config/api-url.js';
const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('local development API is always on localhost:8000, not localhost:3000', () => {
  const env = read('../.env.development');
  assert.match(env, /^VITE_API_BASE_URL=http:\/\/localhost:8000\/api\/v1$/m);
  const base = normalizeApiBaseUrl('http://localhost:8000/api/v1');
  assert.equal(new URL(base + '/orderbook/fetch-order').href,
    'http://localhost:8000/api/v1/orderbook/fetch-order');
});

test('production API goes direct to Railway and never uses app.jkipl.com', () => {
  const env = read('../.env.production');
  assert.match(env, /^VITE_API_BASE_URL=https:\/\/nathcolorbackend-production\.up\.railway\.app\/api\/v1$/m);
  const base = normalizeApiBaseUrl('https://nathcolorbackend-production.up.railway.app/api/v1/');
  assert.equal(base, 'https://nathcolorbackend-production.up.railway.app/api/v1');
  assert.equal(new URL(base + '/user/login').hostname, 'nathcolorbackend-production.up.railway.app');
});

test('rejects URL values that cause /orders/api/v1 and HTML 200 responses', () => {
  for (const invalid of ['', 'api/v1', '/api/v1', 'localhost:8000/api/v1',
    'http://localhost:3000/orders/api/v1', 'https://example.com/api/v1?test=1',
    'ftp://example.com/api/v1', 'https://user:secret@example.com/api/v1']) {
    assert.throws(() => normalizeApiBaseUrl(invalid), /VITE_API_BASE_URL/);
  }
});

test('all API services use shared HTTP clients, never frontend-relative fetch', () => {
  const names = ['orders.service.js','production.service.js','inventory.service.js','recipes.service.js','imports.service.js','job-card.service.js'];
  for (const name of names) {
    const source = read(`../src/services/${name}`);
    assert.doesNotMatch(source, /(?<!\w)fetch\s*\(/, name);
    assert.match(source, /\b(?:http|legacyHttp)\./, name);
  }
  assert.match(read('../src/services/http/client.js'), /INVALID_API_RESPONSE/);
});
