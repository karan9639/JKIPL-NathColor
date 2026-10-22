import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readImportPage, isEmptyImportReport, emptyImportPage, importQueryParams } from '../src/utils/import-read-models.js';

const dyeingServiceCode = readFileSync(new URL('../src/services/dyeing.service.js', import.meta.url), 'utf8');
const yarnServiceCode = readFileSync(new URL('../src/services/yarn.service.js', import.meta.url), 'utf8');
const dyeingPage = readFileSync(new URL('../src/pages/dyeing-programs.jsx', import.meta.url), 'utf8');
const yarnPage = readFileSync(new URL('../src/pages/stock/yarn.jsx', import.meta.url), 'utf8');

test('GET endpoints for both live screens match Express routes; legacy endpoints are not used by their methods', () => {
    const dyeingSection = dyeingServiceCode.split('dyeingPrograms(params')[1].split('async createDyeingPrograms')[0];
    const yarnSection = yarnServiceCode.split('yarnStock(params')[1].split('async createImportedYarnStock')[0];
    assert.match(dyeingSection, /fetchImportPage\(\s*'\/dyeing\/fetch-dyeingprogram',\s*'dyeingPrograms'/);
    assert.match(yarnSection, /fetchImportPage\('\/yarn\/fetch-yarnstock', 'yarnStocks'/);
    assert.doesNotMatch(dyeingSection, /searchorders/);
    assert.doesNotMatch(yarnSection, /getYarnStock/);
    assert.match(dyeingPage, /quantityKgs/);
    assert.match(yarnPage, /closing\?\.qty/);
});

test('dyeing wrapper unwraps data.dyeingPrograms and preserves pagination', () => {
    const result = readImportPage({ success: true, data: {
        pagination: { currentPage: 2, totalEntries: 220, totalPages: 3, limit: 100, hasPrevPage: true, hasNextPage: true },
        dyeingPrograms: [{ orderId: 'D-10', quantityKgs: 42 }],
    } }, 'dyeingPrograms', 2);
    assert.deepEqual(result.rows, [{ orderId: 'D-10', quantityKgs: 42 }]);
    assert.deepEqual(result.pagination, {
        currentPage: 2, totalEntries: 220, totalPages: 3, limit: 100, hasPrevPage: true, hasNextPage: true,
    });
});

test('yarn wrapper preserves nested closing.qty and reportPeriod dates', () => {
    const result = readImportPage({ data: { yarnStocks: [{ itemName: 'COTTON', closing: { qty: 320 }, reportPeriod: { toDate: '2026-10-14' } }], pagination: { totalEntries: 1 } } }, 'yarnStocks');
    assert.equal(result.rows[0].closing.qty, 320);
    assert.equal(result.rows[0].reportPeriod.toDate, '2026-10-14');
    assert.equal(result.pagination.totalEntries, 1);
    assert.equal(result.pagination.hasNextPage, false);
});

test('404 missing-data errors become empty; missing route 404 remains actionable', () => {
    assert.equal(isEmptyImportReport({ status: 404, message: 'No dyeing programs found.' }, 'dyeing'), true);
    assert.equal(isEmptyImportReport({ status: 404, message: 'No yarn stock records found for the selected date or range' }, 'yarn'), true);
    assert.equal(isEmptyImportReport({ status: 404, message: 'Cannot GET /api/v1/searchorders' }, 'dyeing'), false);
    assert.equal(isEmptyImportReport({ status: 403, message: 'No yarn stock records found' }, 'yarn'), false);
    assert.deepEqual(emptyImportPage().rows, []);
});

test('date filter query avoids conflicting date and range params and retains search', () => {
    assert.deepEqual(importQueryParams({ mode: 'latest' }), { page: 1, limit: 100 });
    assert.deepEqual(importQueryParams({ mode: 'date', date: '2026-10-14', search: '   BLUE  ', page: 2 }), { page: 2, limit: 100, date: '2026-10-14', search: 'BLUE' });
    assert.deepEqual(importQueryParams({ mode: 'range', fromDate: '2026-10-01', toDate: '2026-10-14', date: '2026-09-01' }), { page: 1, limit: 100, fromDate: '2026-10-01', toDate: '2026-10-14' });
});

test('reject unexpected API shapes rather than silently rendering zero rows', () => {
    assert.throws(() => readImportPage({ data: { unrelated: [] } }, 'yarnStocks'), /Unexpected yarnStocks API response/);
});

test('no mock API fallback remains in runtime client', () => {
 const code=readFileSync(new URL('../src/services/http/client.js',import.meta.url),'utf8');
 assert.doesNotMatch(code,/mockAdapter|\/mock-api/);
 assert.match(code,/withCredentials:\s*true/);
});
