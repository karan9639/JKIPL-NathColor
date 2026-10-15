import { toIsoDate } from './spreadsheet.js';

/** Convert an ERP/Excel column label to a stable lookup key. */
export const headerKey = (value) => String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
export function recordAt(row, ...names) {
    const values = Object.fromEntries(Object.entries(row).map(([key, value]) => [headerKey(key), value]));
    for (const name of names) {
        const value = values[headerKey(name)];
        if (value !== undefined && value !== null && String(value).trim() !== '') return value;
    }
    return '';
}
export function asText(value) { return String(value ?? '').trim(); }
export function asNumber(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
    const raw = asText(value).replace(/,/g, '');
    if (!raw || raw === '-') return 0;
    const negative = /^\(.*\)$/.test(raw);
    const result = Number(negative ? raw.slice(1, -1) : raw);
    return negative ? -result : result;
}
export function excelDate(value) {
    if (value === null || value === undefined || value === '') return '';
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
    if (typeof value === 'number' || /^\d{5}(\.\d+)?$/.test(asText(value))) {
        const serial = Number(value);
        if (!Number.isFinite(serial) || serial < 1 || serial > 2958465) return '';
        return new Date(Math.round((Math.floor(serial) - 25569) * 86400000)).toISOString().slice(0, 10);
    }
    const input = asText(value);
    const iso = toIsoDate(input);
    if (!iso) return '';
    const date = new Date(`${iso}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === iso ? iso : '';
}
export function dataTableRows(table, requiredHeaders = [], minimumColumns = 2) {
    const rows = table.map((r) => r.map((v) => (v === undefined || v === null) ? '' : v));
    const index = rows.findIndex((cells) => requiredHeaders.length
        ? requiredHeaders.every((h) => cells.some((cell) => headerKey(cell) === headerKey(h)))
        : cells.filter((v) => asText(v)).length >= minimumColumns);
    if (index < 0) throw new Error(`Cannot locate the header row${requiredHeaders.length ? ` (${requiredHeaders.join(', ')})` : ''}.`);
    const headers = rows[index].map((h, i) => asText(h) || `COL${i + 1}`);
    const records = rows.slice(index + 1).filter((r) => r.some((v) => asText(v)))
        .map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ''])));
    return records;
}
const dyeingFields = {
    dyeingScheduleDate: ['Dyeing Schedule Date'],
    dyeingScheduleNo: ['Dyeing Schedule No.'],
    orderId: ['Order ID'], orderDate: ['Order Date'], deliveryDate: ['Delivery Date'],
    custGroup: ['Cust Group'], customerName: ['Customer Name'], groupingLevel: ['Grouping Level'],
    subProduct: ['Sub Product'], itemName: ['Item Name'], color: ['Color', 'Colour'],
    width: ['Width'], gsm: ['GSM'], heatSet: ['Heat Set'], jetNo: ['Jet No.'],
    quantityMtr: ['Quantity Mtr.'], quantityKgs: ['Quantity Kgs.'],
    manualLotNo: ['Manual Lot No.'], jobCardDate: ['Job card Date'],
    jobCardNo: ['Job card No.'], jobCardQtyMtr: ['Job card Qty. Mtr.'],
    jobCardQtyKgs: ['Job card Qty. Kgs.'], balanceQtyKgs: ['Balance Qty. Kgs.'],
    pendingDays: ['Pending Days'], remark: ['Remark', 'Remarks'],
};
const requiredDyeing = ['dyeingScheduleDate', 'dyeingScheduleNo', 'orderId', 'orderDate', 'deliveryDate', 'customerName', 'itemName'];
const dyeingDates = ['dyeingScheduleDate', 'orderDate', 'deliveryDate', 'jobCardDate'];
const dyeingNumbers = ['width', 'gsm', 'quantityMtr', 'quantityKgs', 'jobCardQtyMtr', 'jobCardQtyKgs', 'balanceQtyKgs', 'pendingDays'];
export function normalizeDyeingRecords(records) {
    const valid = [], errors = [];
    records.forEach((row, index) => {
        const result = {};
        for (const [field, names] of Object.entries(dyeingFields)) {
            const value = recordAt(row, field, ...names);
            if (dyeingDates.includes(field)) result[field] = field === 'jobCardDate' ? excelDate(value) || null : excelDate(value);
            else if (dyeingNumbers.includes(field)) result[field] = asNumber(value);
            else result[field] = asText(value);
        }
        const missing = requiredDyeing.filter((field) => !result[field]);
        const invalidNumbers = dyeingNumbers.filter((field) => !Number.isFinite(result[field]));
        if (missing.length || invalidNumbers.length) errors.push(`Data row ${index + 1}: ${[...missing.map((f) => `${f} is required or an invalid date`), ...invalidNumbers.map((f) => `${f} must be numeric`)].join('; ')}`);
        else valid.push(result);
    });
    return { rows: valid, errors };
}
const yarnFields = {
    mainGroup: ['Main Group'], mainProduct: ['Main Product'], subGroup: ['Sub Group'],
    itemCode: ['Item Code'], itemName: ['Item Name'], color: ['Color'], uom: ['UOM'],
    lastIssueDate: ['Last Issue Date'],
};
export function normalizeYarnRecords(records) {
    const valid = [], errors = [];
    records.forEach((row, index) => {
        const result = Object.fromEntries(Object.entries(yarnFields).map(([key, names]) => [key, asText(recordAt(row, key, ...names))]));
        const rawIssueDate = result.lastIssueDate;
        result.lastIssueDate = rawIssueDate && rawIssueDate !== '0' ? excelDate(rawIssueDate) : null;
        // In the exported HTML, repeated Qty/Value column labels are grouped under
        // Opening / Receipt / Issue / Closing. Those are made unique by extractYarnTable.
        for (const group of ['opening', 'receipt', 'issue', 'closing']) {
            result[group] = { qty: asNumber(recordAt(row, `${group}.qty`)), value: asNumber(recordAt(row, `${group}.value`)) };
        }
        result.closing.rate = asNumber(recordAt(row, 'closing.rate'));
        const missing = ['mainGroup', 'mainProduct', 'subGroup', 'itemCode', 'itemName'].filter((field) => !result[field]);
        if (rawIssueDate && rawIssueDate !== '0' && !result.lastIssueDate) missing.push('valid lastIssueDate');
        const invalid = ['opening', 'receipt', 'issue', 'closing'].flatMap((g) => Object.entries(result[g]).filter(([, v]) => !Number.isFinite(v)).map(([k]) => `${g}.${k}`));
        if (missing.length || invalid.length) errors.push(`Data row ${index + 1}: ${[...missing.map((f) => `missing ${f}`), ...invalid.map((f) => `invalid ${f}`)].join(', ')}`);
        else valid.push(result);
    });
    return { rows: valid, errors };
}
export function extractYarnTable(tables) {
    const table = tables.find((t) => t.some((r) => r.some((v) => headerKey(v) === 'itemcode')));
    if (!table) throw new Error('Yarn Stock HTML table not found. Expected Item Code header.');
    const headerIndex = table.findIndex((r) => r.some((v) => headerKey(v) === 'itemcode'));
    const headers = table[headerIndex].map(headerKey);
    if (!['maingroup', 'mainproduct', 'subgroup', 'itemcode', 'itemname'].every((h) => headers.includes(h))) {
        throw new Error('Yarn Stock header does not match the ERP format.');
    }
    const fixed = ['mainGroup', 'mainProduct', 'subGroup', 'itemCode', 'itemName', 'color', 'uom', 'lastIssueDate', 'opening.qty', 'opening.value', 'receipt.qty', 'receipt.value', 'issue.qty', 'issue.value', 'closing.qty', 'closing.value', 'closing.rate'];
    if (headers.length !== fixed.length) throw new Error(`Expected 17 Yarn Stock columns, received ${headers.length}.`);
    const data = table.slice(headerIndex + 1).filter((r) => r.length >= 17 && r[3]?.trim() && !/total/i.test(r[3]));
    const records = data.map((r) => Object.fromEntries(fixed.map((h, i) => [h, r[i]])));
    const report = table.slice(0, headerIndex).flat().join(' ').match(/From\s*Date\s*:\s*(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})\s*To\s*Date\s*:\s*(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})/i);
    return { records, reportPeriod: report ? { fromDate: excelDate(report[1]), toDate: excelDate(report[2]) } : null };
}
