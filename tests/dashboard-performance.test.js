import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = p => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');
test('dashboard uses one combined authenticated API call', () => {
  assert.match(read('pages/dashboard.jsx'), /dashboardService\.overview/);
  assert.doesNotMatch(read('pages/dashboard.jsx'), /productionService\.records|reportsService\.lud/);
  assert.match(read('services/dashboard.service.js'), /http\.get\('\/dashboard\/overview', \{ signal \}\)/);
});
test('daily records and imports report endpoints remain available separately', () => {
  assert.match(read('services/production.service.js'), /legacyHttp\.get\('\/vrecords'/);
  assert.match(read('services/reports.service.js'), /http\.get\('\/user\/fetch-last-updated'/);
});
