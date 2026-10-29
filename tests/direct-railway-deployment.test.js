import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

test('Vite production environment references API base statically', () => {
  const source = read('../src/config/env.js');
  assert.match(source, /import\.meta\.env\.VITE_API_BASE_URL/);
  assert.doesNotMatch(source, /import\.meta\.env\[key\]/);
  assert.match(source, /legacyApiBaseUrl/);
});
test('Vercel frontend uses direct railway API, not its own api rewrite', () => {
  const config = JSON.parse(read('../vercel.json'));
  assert.equal(config.rewrites.length, 1);
  assert.equal(config.rewrites[0].destination, '/index.html');
  assert.equal(read('../.env.production').includes('https://nathcolorbackend-production.up.railway.app/api/v1'), true);
});
test('login path composes with configured Railway URL and keeps credentials', () => {
  assert.match(read('../src/services/auth/auth.service.js'), /http\.post\('\/user\/login'/);
  assert.match(read('../src/services/http/client.js'), /withCredentials:\s*true/);
  assert.match(read('../vite.config.js'), /normalizeApiBaseUrl/);
  assert.doesNotMatch(read('../vite.config.js'), /proxy:\s*\{/);
});
