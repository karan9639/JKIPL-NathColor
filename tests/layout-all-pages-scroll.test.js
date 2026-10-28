import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('document has no independent scroll area in the authenticated app', () => {
  const css = source('../src/index.css');
  assert.match(css, /html, body, #root\s*\{[^}]*height:\s*100%;[^}]*overflow:\s*hidden;/s);
  assert.match(css, /\.app-shell-root\s*\{[^}]*height:\s*100dvh;[^}]*overflow:\s*hidden;/s);
});

test('AppShell keeps sidebar and main as independent scroll areas', () => {
  const app = source('../src/layouts/AppShell.jsx');
  assert.match(app, /app-shell-root/);
  assert.match(app, /<NavList collapsed=\{collapsed\}/);
  assert.match(app, /app-content-scroll[^"\n]*overflow-y-auto/);
  assert.match(app, /useLayoutEffect\(\(\)\s*=>\s*\{/);
  assert.match(app, /mainScrollRef\.current\.scrollTop\s*=\s*0/);
});

test('login remains scrollable on short/mobile screens', () => {
  const page = source('../src/pages/login.jsx');
  assert.match(page, /<main className="[^"]*h-dvh[^"]*overflow-y-auto/);
});

test('GSM calculator is still registered and its content is not conditional on sidebar state', () => {
  const route = source('../src/routes/AppRoutes.jsx');
  const gsm = source('../src/pages/tools/gsm.jsx');
  assert.match(route, /path="tools\/gsm"/);
  assert.match(gsm, /<PageHeader title="GSM Calculator"/);
});

test('printing bypasses viewport scroll lock', () => {
  const css = source('../src/index.css');
  assert.match(css, /@media print\s*\{[\s\S]*html, body, #root, \.app-shell-root, \.app-content-scroll\s*\{/);
});
