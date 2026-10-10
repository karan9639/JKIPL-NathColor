/** Shared PO / knitting import contract. The backend remains the source of truth. */
import { toIsoDate } from './spreadsheet';
import { pickString, toNumber } from './utils';
export const KNITTING_STATUSES = ['PLANNED', 'IN_PROGRESS', 'PARTIAL', 'COMPLETED', 'ON_HOLD', 'STOCK_FULFILLED'];
const normal = (value) => String(value ?? '').trim();
const decimal = (value) => normal(value).replace(/,/g, '');
/** Excel's 1900 date system: numeric serials from sheetRows(raw=true). */
const excelDate = (serial) => {
    if (!Number.isFinite(serial) || serial < 61 || serial > 2958465)
        return '';
    return new Date(Date.UTC(1899, 11, 30) + serial * 86400000).toISOString();
};
const iso = (value) => typeof value === 'number' ? excelDate(value).slice(0, 10) : toIsoDate(normal(value));
const dateTime = (value) => typeof value === 'number' ? excelDate(value).slice(0, 16) : normal(value);
const decimalOrBlank = (value) => (normal(value) ? decimal(value) : '');
export function poLineId(row) {
    return pickString(row, 'PO_LINE_ID', 'po_line_id');
}
export function poNumber(row) {
    return pickString(row, 'PO_NUMBER', 'po_number');
}
export function linkedCards(row) {
    const value = row.LINKED_JOB_CARDS ?? row.linked_job_cards;
    if (Array.isArray(value))
        return value.map((v) => (typeof v === 'object' && v !== null ? pickString(v, 'JOBCARDNO', 'jobcardno') : String(v))).filter(Boolean);
    return pickString(row, 'JOB_CARDS', 'job_cards').split(',').map((v) => v.trim()).filter(Boolean);
}
export function poDateValue(row, key) {
    return pickString(row, key, key.toLowerCase());
}
export function knittingStatus(row) {
    return pickString(row, 'KNITTING_STATUS', 'knitting_status', 'STATUS') || 'PLANNED';
}
export function producedKgs(row) {
    return toNumber(row.PRODUCED_KGS ?? row.produced_kgs);
}
export function plannedKgs(row) {
    return toNumber(row.PLANNED_KGS ?? row.planned_kgs);
}
export function normalizePlanningSheet(table, sourceFilename) {
    const headers = (table[0] ?? []).map((v) => normal(v).toUpperCase().replace(/\s+/g, ' '));
    const required = ['DATE', 'PO. NO', 'FABRIC NAME', 'REQUIRED KGS'];
    const missing = required.filter((key) => !headers.includes(key));
    if (missing.length)
        throw new Error(`PO sheet is missing required header(s): ${missing.join(', ')}`);
    const get = (cells, key) => cells[headers.indexOf(key)];
    return table.slice(1).flatMap((cells, i) => {
        const po = normal(get(cells, 'PO. NO')).toUpperCase();
        const fabric = normal(get(cells, 'FABRIC NAME'));
        if (!po && !fabric)
            return [];
        const date = iso(get(cells, 'DATE'));
        const requiredKgs = decimalOrBlank(get(cells, 'REQUIRED KGS'));
        if (!po || !fabric || !date || !requiredKgs || !Number.isFinite(Number(requiredKgs)) || Number(requiredKgs) < 0) {
            throw new Error(`PO sheet row ${i + 2}: PO number, fabric, valid date and required KGS are mandatory.`);
        }
        return [{
                SOURCE_FILE: sourceFilename, SOURCE_SHEET: 'PO', SOURCE_ROW_NUMBER: i + 2,
                PO_NUMBER: po, PO_DATE: date, FABRIC_NAME: fabric,
                REQUIRED_KGS: requiredKgs, AVAILABLE_STOCK_KGS: decimalOrBlank(get(cells, 'STOCK')),
                PLANNED_KGS: decimalOrBlank(get(cells, 'PLANNED QTY')),
                PLANNED_MACHINE: normal(get(cells, 'PLANNED MACHINE')),
                EXPECTED_DELIVERY_DATE: iso(get(cells, 'E.D.D')),
                PLANNED_DAYS: decimalOrBlank(get(cells, 'DAYS')),
                PLANNING_REMARKS: normal(get(cells, 'REMARKS')),
                FABRIC_TYPE: normal(get(cells, 'FABRIC TYPE')),
            }];
    });
}
export function normalizeCompletionSheet(table) {
    const headers = (table[0] ?? []).map((v) => normal(v).toUpperCase().replace(/[. ]/g, '_'));
    const required = ['PO_LINE_ID', 'PRODUCTION_EVENT_ID', 'PRODUCTION_DATE', 'MACHINE_NO', 'PRODUCED_KGS', 'STATUS'];
    const missing = required.filter((key) => !headers.includes(key));
    if (missing.length)
        throw new Error(`Knitting completion sheet is missing header(s): ${missing.join(', ')}`);
    const get = (cells, key) => cells[headers.indexOf(key)];
    return table.slice(1).flatMap((cells, i) => {
        if (!cells.some((v) => normal(v)))
            return [];
        const row = i + 2;
        const status = normal(get(cells, 'STATUS')).toUpperCase().replace(/\s+/g, '_');
        const qty = Number(decimal(get(cells, 'PRODUCED_KGS')));
        const date = iso(get(cells, 'PRODUCTION_DATE'));
        const completed = dateTime(get(cells, 'COMPLETED_AT'));
        if (!normal(get(cells, 'PO_LINE_ID')) || !normal(get(cells, 'PRODUCTION_EVENT_ID')) || !date || !normal(get(cells, 'MACHINE_NO'))) {
            throw new Error(`Completion sheet row ${row}: valid PO line ID, event ID, production date and machine number are required.`);
        }
        if (!['IN_PROGRESS', 'PARTIAL', 'COMPLETED', 'ON_HOLD'].includes(status) || !Number.isFinite(qty) || qty < 0 || (['PARTIAL', 'COMPLETED'].includes(status) && qty <= 0)) {
            throw new Error(`Completion sheet row ${row}: invalid status or produced KGS.`);
        }
        if (status === 'COMPLETED' && !completed)
            throw new Error(`Completion sheet row ${row}: COMPLETED_AT is required when status is COMPLETED.`);
        return [{
                PO_LINE_ID: normal(get(cells, 'PO_LINE_ID')),
                PRODUCTION_EVENT_ID: normal(get(cells, 'PRODUCTION_EVENT_ID')),
                PRODUCTION_DATE: date,
                MACHINE_NO: normal(get(cells, 'MACHINE_NO')),
                PRODUCED_KGS: qty,
                STATUS: status,
                COMPLETED_AT: completed,
                GREIGE_LOT_NO: normal(get(cells, 'GREIGE_LOT_NO')),
                REMARKS: normal(get(cells, 'REMARKS')),
            }];
    });
}
export const COMPLETION_TEMPLATE = [{
        PO_LINE_ID: '', PRODUCTION_EVENT_ID: '', PRODUCTION_DATE: '', MACHINE_NO: '',
        PRODUCED_KGS: '', STATUS: '', COMPLETED_AT: '', GREIGE_LOT_NO: '', REMARKS: '',
    }];
