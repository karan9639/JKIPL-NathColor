import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = p => readFileSync(new URL(p, import.meta.url), 'utf8');
test('Vite config uses static VITE_ variables', () => {
  const source=read('../src/config/env.js');
  assert.match(source,/import\.meta\.env\.VITE_API_BASE_URL/);
  assert.doesNotMatch(source,/import\.meta\.env\[key\]/);
});
test('Vercel API rewrite has priority over SPA fallback', () => {
  const cfg=JSON.parse(read('../vercel.json'));
  assert.equal(cfg.rewrites[0].source,'/api/:path*');
  assert.match(cfg.rewrites[0].destination,/^https:\/\/nathcolorbackend-production\.up\.railway\.app\/api\//);
  assert.equal(cfg.rewrites[1].destination,'/index.html');
});
test('login goes through shared client, which sends cookies', () => {
  assert.match(read('../src/services/auth/auth.service.js'), /http\.post\('\/user\/login'/);
  assert.match(read('../src/services/http/client.js'), /withCredentials:\s*true/);
  assert.match(read('../src/context/AuthContext.jsx'), /http\.get\('\/user\/me'\)/);
  assert.match(read('../vite.config.js'), /proxy:/);
});
