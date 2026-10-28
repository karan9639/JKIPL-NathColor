import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('NathColor+ premium colors stay centralized, with high contrast button red', () => {
  const css = read('../src/index.css');
  for (const token of ['--color-brand: #fc5158;', '--color-rose-mist: #dbb4b4;', '--color-primary: #b5293b;', '--color-background: #fff9f9;']) {
    assert.ok(css.includes(token), `missing ${token}`);
  }
  assert.match(read('../src/components/ui/button.jsx'), /bg-primary text-primary-foreground/);
});

test('mobile login has a fixed visible brand header and independent scrolling', () => {
  const source = read('../src/pages/login.jsx');
  assert.match(source, /auth-page-scroll h-dvh/);
  assert.match(source, /auth-brand-panel min-h-\[84px\]/);
  assert.match(source, /auth-form-panel/);
  assert.match(source, /await login\(values\.email, values\.password, values\.remember\)/);
});

test('same-site custom Railway API and Vercel SPA routing are preserved', () => {
  const env = read('../.env.production');
  assert.match(env, /VITE_API_BASE_URL=https:\/\/api\.jkipl\.com\/api\/v1/);
  const vercel = read('../vercel.json');
  assert.ok(!vercel.includes('nathcolorbackend-production.up.railway.app'), 'Vercel API proxy should not be re-added');
});

test('shared sidebar, dialogs and data table receive premium styling', () => {
  assert.match(read('../src/layouts/AppShell.jsx'), /erp-sidebar/);
  assert.match(read('../src/layouts/AppShell.jsx'), /erp-topbar/);
  assert.match(read('../src/index.css'), /erp-data-table-viewport table thead/);
  assert.match(read('../src/components/ui/dialog.jsx'), /rounded-2xl/);
});
