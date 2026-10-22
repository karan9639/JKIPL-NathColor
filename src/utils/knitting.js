/** Shared PO / knitting import contract. The backend remains the source of truth. */
import { toIsoDate } from './spreadsheet.js';
const pickString = (obj, ...keys) => { for(const k of keys) { const v=obj?.[k]; if(v!==null&&v!==undefined&&String(v).trim())return String(v).trim(); } return ''; };
const toNumber = (value) => {const n=Number(String(value??'').replaceAll(',',''));return Number.isFinite(n)?n:0;};
// Only ERP PO worksheet remarks are authoritative for Unit-3 planning state.
// CLOSED means closed in the PO planner. No actual produced quantity is implied.
export function plannerStatusFromRemarks(remarks) {
    const value = String(remarks ?? '').trim().replace(/\s+/g, ' ').toUpperCase();
    if (value === 'CLOSED') return 'CLOSED';
    if (/\bHOLD\b/.test(value)) return 'HOLD';
    return value ? 'REVIEW' : 'OPEN';
}
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
export function poDateValue(row, key) {
    return pickString(row, key, key.toLowerCase());
}
export function knittingStatus(row) {
    // Calculate from the imported PO remarks, never from obsolete manual events.
    return plannerStatusFromRemarks(row?.PLANNING_REMARKS ?? row?.REMARKS);
}
export function plannedKgs(row) {
    const raw = row?.PLANNED_KGS;
    return raw === null || raw === undefined || raw === '' ? null : toNumber(raw);
}
/** Consolidated PO sheet in the user's 346-sheet UNIT-3 PLANNER workbook. */
export function normalizePlanningSheet(table, sourceFilename) {
    const headers = (table[0] ?? []).map(v=>normal(v).toUpperCase().replace(/\s+/g,' '));
    const needed=['DATE','PO. NO','FABRIC NAME','REQUIRED KGS'];
    const missing=needed.filter(k=>!headers.includes(k));
    if(missing.length)throw new Error(`PO sheet missing ${missing.join(', ')}. Select the consolidated PO tab, not the PLANNER machine-grid tab.`);
    const get=(row,k)=>row[headers.indexOf(k)];
    const identities=new Map();const records=[];
    table.slice(1).forEach((cells,i)=>{
        const po=normal(get(cells,'PO. NO')).toUpperCase();
        const fabric=normal(get(cells,'FABRIC NAME')).replace(/\s+/g,' ');
        if(!po && !fabric)return;
        if(!po || /^(TOTAL|SUMMARY|PO\. NO)$/i.test(po)) throw new Error(`PO!${i+2}: a valid PO reference is required`);
        const date=iso(get(cells,'DATE'));
        const required=decimalOrBlank(get(cells,'REQUIRED KGS'));
        const units=required.match(/^([0-9,]+(?:\.[0-9]+)?)\s+(PAIRS|PCS|MTRS?|METERS?|YARDS?|YRD|NOS)$/i);
        const requiredQty=units?Number(units[1].replace(/,/g,'')):Number(required);
        const requiredUom=units?units[2].toUpperCase():'KGS';
        if(!fabric || !date || !required || !Number.isFinite(requiredQty) || requiredQty<=0)
            throw new Error(`PO!${i+2}: fabric, valid date and positive required quantity are mandatory`);
        const identity=`${po}|${fabric.toUpperCase()}|${date}`;
        const occurrence=(identities.get(identity)||0)+1;identities.set(identity,occurrence);
        // Ordinal differentiates repeated PO/fabric lines. Exact line identity cannot be guaranteed
        // if the ERP reorders genuinely indistinguishable repeats; review changes before upload.
        const stock=decimalOrBlank(get(cells,'STOCK'));
        const planned=decimalOrBlank(get(cells,'PLANNED QTY'));
        for(const [label,v] of [['stock',stock],['planned quantity',planned]]) {
            if(v && Number.isFinite(Number(v)) && Number(v)<0)throw new Error(`PO!${i+2}: negative ${label} ${v}`);
        }
        const machine=normal(get(cells,'PLANNED MACHINE'));
        const eddValue=get(cells,'E.D.D');const edd=iso(eddValue);
        records.push({
            SOURCE_FILE:sourceFilename,SOURCE_SHEET:'PO',SOURCE_ROW_NUMBER:i+2,
            PO_LINE_ID:`${identity}|${occurrence}`, PO_NUMBER:po,PO_DATE:date,FABRIC_NAME:fabric,
            REQUIRED_KGS:requiredUom==='KGS'?requiredQty:null,REQUIRED_QTY:requiredQty,REQUIRED_UOM:requiredUom,AVAILABLE_STOCK_KGS:Number.isFinite(Number(stock))&&stock!==''?Number(stock):null,
            STOCK_NOTE:stock && !Number.isFinite(Number(stock))?stock:'',
            PLANNED_KGS:planned!==''&&Number.isFinite(Number(planned))?Number(planned):null,
            PLANNED_QTY_NOTE:planned!==''&&!Number.isFinite(Number(planned))?planned:'',PLANNED_MACHINE:machine,
            EXPECTED_DELIVERY_DATE:edd,EXPECTED_DELIVERY_NOTE:normal(eddValue)&&!edd?normal(eddValue):'',
            PLANNED_DAYS:decimalOrBlank(get(cells,'DAYS')),
            PLANNING_REMARKS:normal(get(cells,'REMARKS')),
            PLANNER_STATUS:plannerStatusFromRemarks(get(cells,'REMARKS')),
            FABRIC_TYPE:normal(get(cells,'FABRIC TYPE')),
        });
    });
    if(!records.length)throw new Error('PO sheet has no valid PO lines');
    return records;
}
