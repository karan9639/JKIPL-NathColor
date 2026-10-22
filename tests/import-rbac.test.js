import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { canAccess } from '../src/constants/permissions.js';
import { dataTableRows, normalizeDyeingRecords, normalizeYarnRecords, extractYarnTable, excelDate } from '../src/utils/import-mappers.js';
const nav = readFileSync(new URL('../src/constants/navigation.js', import.meta.url), 'utf8');
const imports = {
    dyeing: ['dyeing-programs'], billing: ['dispatch'], jobcard: ['job-cards-opening'],
    order: ['orders-book'], unit2: ['greige-stock-u2'], unit3: ['greige-stock-u3', 'knitting-po-planning'],
    yarn: ['yarn-stock'], closing: ['job-cards-closing'], recipe: ['recipes'],
};
test('every ERP import is role-restricted (UI only; server enforces permissions)', () => {
    for (const [role, routes] of Object.entries(imports)) {
        for (const route of routes) {
            assert.ok(nav.includes(`path:'/imports/${route}'`), `Missing ${route} in navigation`);
            assert.equal(canAccess({allowedRoles:[role]},{role}),true);
            assert.equal(canAccess({allowedRoles:[role]},{role:'other'}),false);
        }
    }
});
test('Excel dyeing status report headers and serial dates normalize to backend model', () => {
    const table = [
        ['Dyeing Schedules Status Report'], ['JASMINE'],
        ['S. No.', 'Dyeing Schedule Date', 'Dyeing Schedule No.', 'Order ID', 'Order Date', 'Delivery Date', 'Customer Name', 'Item Name', 'Quantity Kgs.'],
        [1, 46308, 73057, 191870, 46307, 46314, 'VEEKESY', 'HEAVY MERRY MESH 160', 42.445],
    ];
    const { rows, errors } = normalizeDyeingRecords(dataTableRows(table, ['Dyeing Schedule Date', 'Order ID']));
    assert.deepEqual(errors, []);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].dyeingScheduleDate, excelDate(46308));
    assert.equal(rows[0].orderId, '191870');
    assert.equal(rows[0].quantityKgs, 42.445);
    assert.equal(rows[0].customerName, 'VEEKESY');
    const invalid = normalizeDyeingRecords([{ ...table[3], customerName: '' }]);
    assert.equal(invalid.rows.length, 0);
    assert.equal(invalid.errors.length, 1);
});
test('Yarn Stock HTML multi-level headers map to the required nested API payload', () => {
    const columns = ['Main Group', 'Main Product', 'Sub Group', 'Item Code', 'Item Name', 'Color', 'UOM', 'Last Issue Date', 'Qty', 'Value', 'Qty', 'Value', 'Qty', 'Value', 'Qty', 'Value', 'Rate'];
    const table = [
        ['Item Wise Stock'], ['From Date : 01/04/2026 To Date : 14/10/2026'],
        columns,
        ['RAW MATERIAL', 'RAW MATERIAL', 'YARN', 'I00053850', '0.11 MM MONO', '', 'KGS', '8-Oct-26', '0', '0', '4120.4', '1071304', '2512.4', '653224', '1608', '418080', '260'],
    ];
    const { records, reportPeriod } = extractYarnTable([table]);
    assert.deepEqual(reportPeriod, { fromDate: '2026-04-01', toDate: '2026-10-14' });
    const { rows, errors } = normalizeYarnRecords(records);
    assert.deepEqual(errors, []);
    assert.equal(rows[0].receipt.qty, 4120.4);
    assert.equal(rows[0].closing.rate, 260);
    assert.equal(rows[0].lastIssueDate, '2026-10-08');
    assert.equal(rows[0].itemCode, 'I00053850');
});
