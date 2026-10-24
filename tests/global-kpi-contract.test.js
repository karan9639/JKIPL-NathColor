import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readImportPage, emptyImportPage } from '../src/utils/import-read-models.js';
import { readJobCardLotsPage } from '../src/utils/job-card-lots.js';

test('import read-model forwards full result summary separately from visible page', () => {
  const data = readImportPage({ data: {
    dyeingPrograms: [{orderId:'100'}],
    summary: {totalLines:3928, scheduledKgs:123456},
    pagination: {totalEntries:3928, currentPage:3, totalPages:40, limit:100},
  } }, 'dyeingPrograms',3,100);
  assert.equal(data.rows.length, 1);
  assert.equal(data.summary.totalLines, 3928);
  assert.equal(data.pagination.currentPage, 3);
  assert.equal(emptyImportPage().summary, null);
});

test('Job Card Lots read-model preserves global totals with current page', () => {
  const result = readJobCardLotsPage({
    jobCards:[{orderId:'187127'}],
    summary:{totalLines:529, distinctJobCards:411},
    pagination:{totalEntries:529,currentPage:2,limit:50,totalPages:11},
  },2);
  assert.equal(result.rows.length,1);
  assert.equal(result.summary.distinctJobCards,411);
});

test('pages reference full dataset summary, not a local rows.reduce quantity KPI', () => {
  for (const name of ['orders.jsx','dyeing-programs.jsx','stock/yarn.jsx','stock/job-card-lots.jsx']) {
    const contents = readFileSync(new URL(`../src/pages/${name}`, import.meta.url),'utf8');
    assert.match(contents,/\.summary/);
    assert.doesNotMatch(contents,/\b(?:quantity|balance|closing|allocated) on page\b/i);
  }
});
