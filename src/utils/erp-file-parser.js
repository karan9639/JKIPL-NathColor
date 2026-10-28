import { dataTableRows, headerKey, extractYarnTable, extractOrderBookTable } from './import-mappers.js';
import { normalizeU3GreigeSheet } from './u3-ledger.js';
import { normalizePlanningSheet } from './knitting.js';

export const FILE_EXTENSIONS = '.html,.htm,.xls,.xlsx';

export function reportHeaders(def) {
  if (def.backend === 'orderbook') return ['ORDER ID', 'CUSTOMER NAME'];
  if (def.backend === 'dyeing') return ['Dyeing Schedule No.', 'Order ID'];
  if (def.backend === 'yarn') return ['Main Group', 'Item Code', 'Item Name'];
  if (def.backend === 'greige-u2') return ['Fabric Name', 'Current Stock'];
  if (def.endpoint === '/insertJobCards') return ['ORDER ID', 'JOB CARD NO.', 'MANUAL LOT NO.'];
  if (def.endpoint === '/insertClosedJobCards') return ['ORDER ID', 'JOB CARD NO.', 'JOB CARD CLOSED DATE'];
  if (def.endpoint === '/insertDispatch') return ['Challan Number', 'Invoice No', 'Despatch Qty.'];
  if (def.endpoint === '/upload-recipe') return ['Jobcard No.', 'Manual Lot No.', 'Item Name'];
  return [];
}
export const LEGACY_RECIPE_HEADERS = ['REGNO', 'SHADE', 'QUALITY'];

export function findReportTable(tables, alternatives) {
  for (const table of tables) {
    for (const required of alternatives) {
      const idx = table.findIndex(row => required.every(label => row.some(cell => headerKey(cell) === headerKey(label))));
      if (idx !== -1) return { table, headerIndex: idx, required };
    }
  }
  throw new Error(`This ERP report does not have the required columns: ${alternatives.map(x => x.join(' / ')).join(' OR ')}`);
}

/** Stable ordinal of an EXACT duplicate row in the full ERP report, before batches are sliced.
 * Distinguishes repeated valid challan/invoice lines without using invoice number alone.
 */
export function withErpOccurrences(rows) {
  const seen = new Map();
  return rows.map(row => {
    const fields = Object.entries(row).filter(([k]) => !/^__erp[_-]/i.test(k)).map(([k,v])=>[headerKey(k),String(v??'').trim()]).sort(([a],[b])=>a.localeCompare(b));
    const signature = JSON.stringify(fields);
    const count = (seen.get(signature) ?? 0) + 1;
    seen.set(signature, count);
    return { ...row, __erp_occurrence: count };
  });
}

/**
 * Every importer returns { rows, reportPeriod, sheetName }.
 * A stable return shape is important: the upload page passes `rows` to
 * normalizeRecords, which expects an array (including when a file is empty).
 *
 * Recognize HTML exported by ERP even when Excel calls it .xls; recognize
 * binary .xls and zipped .xlsx by their signature instead of by their name.
 */
export async function parseERPFile(file, def, { readWorkbook, readHtmlTables }) {
  const name = String(file?.name ?? '');
  if (!/\.(?:html?|xlsx?)$/i.test(name)) {
    throw new Error('Unsupported file type. Choose an ERP .html, .htm, .xls or .xlsx file.');
  }
  if (!file || typeof file.slice !== 'function') {
    throw new Error('A readable ERP file is required.');
  }
  if (Number.isFinite(file.size) && file.size > 80 * 1024 * 1024) {
    throw new Error('ERP file exceeds 80 MB. Split or export a smaller report; no records were uploaded.');
  }
  const prefix = new Uint8Array(await file.slice(0, 4096).arrayBuffer());
  if (!prefix.length) throw new Error('The ERP file is empty.');
  const isZip = prefix[0] === 0x50 && prefix[1] === 0x4b;
  const isOle = prefix.length >= 8 && [0xd0,0xcf,0x11,0xe0,0xa1,0xb1,0x1a,0xe1].every((byte, i) => prefix[i] === byte);
  const encoding = prefix[0] === 0xff && prefix[1] === 0xfe ? 'utf-16le'
    : prefix[0] === 0xfe && prefix[1] === 0xff ? 'utf-16be' : 'utf-8';
  let textHead = new TextDecoder(encoding, { fatal: false }).decode(prefix);
  // Strip BOM/whitespace to recognize Excel-compatible HTML exports.
  textHead = textHead.replace(/^\uFEFF/, '').replace(/\u0000/g, '').trimStart();
  const isHtml = !isZip && !isOle && /<(?:!doctype\s+html|html|head|body|table|meta)\b/i.test(textHead);
  const isXmlWorkbook = !isZip && !isOle && /<\?xml\b/i.test(textHead) && /<Workbook\b|urn:schemas-microsoft-com:office:spreadsheet/i.test(textHead);
  if (!isHtml && !isZip && !isOle && !isXmlWorkbook) {
    throw new Error('Unrecognized ERP file contents. Export a genuine Excel workbook or Excel HTML report (renaming a file does not convert it).');
  }
  let tables = [];
  let names = [];
  if (isHtml) {
    tables = await readHtmlTables(file);
    if (!Array.isArray(tables)) throw new Error('HTML report reader returned no tables. Check the ERP export.');
    names = ['HTML report'];
  } else {
    const book = await readWorkbook(file);
    const sheetNames = Array.isArray(book?.sheetNames) ? book.sheetNames : [];
    if (!sheetNames.length) throw new Error('The Excel workbook contains no readable worksheets.');
    if (def.knittingFormat && def.sheet && !sheetNames.some(x => x.trim().toUpperCase() === def.sheet.toUpperCase())) {
      throw new Error(`Required PO worksheet missing. Found: ${sheetNames.slice(0, 10).join(', ')}`);
    }
    names = def.knittingFormat ? sheetNames.filter(x => x.trim().toUpperCase() === def.sheet.toUpperCase()) : sheetNames;
    // Keep sheet names paired with their rows. A report may be on any worksheet;
    // never depend on a hard-coded MIX sheet except for the verified PO workflow.
    tables = names.map(sheet => book.sheetRows(sheet, def.backend === 'dyeing' || !!def.knittingFormat));
    if (tables.some(table => !Array.isArray(table))) {
      throw new Error('Excel worksheet parser returned invalid rows. Check the ERP export.');
    }
  }
  if (!tables.length || !tables.some(t => Array.isArray(t) && t.length)) {
    throw new Error('No readable ERP table was found in the selected file.');
  }
  if (def.backend === 'greige-u3') {
    const index = tables.findIndex(t => t.some(r => Array.isArray(r) && r.some(x => /item\s*name/i.test(String(x)))));
    return { rows: normalizeU3GreigeSheet(tables[Math.max(index, 0)]), sheetName: names[Math.max(index, 0)] };
  }
  if (def.knittingFormat) return { rows: normalizePlanningSheet(tables[0] || [], name), sheetName: names[0] };
  if (def.backend === 'yarn') {
    // extractYarnTable returns `records` (raw rows), not `rows`.
    // Returning its result unchanged caused undefined.forEach in normalizeYarnRecords.
    const parsed = extractYarnTable(tables);
    if (!Array.isArray(parsed?.records)) throw new Error('Yarn Stock report contains no readable item rows.');
    return { rows: parsed.records, reportPeriod: parsed.reportPeriod ?? null, sheetName: names[0] };
  }
  if (def.backend === 'orderbook') return { rows: extractOrderBookTable(tables) };
  const headers = reportHeaders(def);
  const alternatives = def.endpoint === '/upload-recipe' ? [headers, LEGACY_RECIPE_HEADERS] : [headers];
  const found = findReportTable(tables, alternatives);
  let rows = dataTableRows(found.table.slice(found.headerIndex), found.required, Math.min(3, found.required.length));
  rows = rows.filter(row => {
    const values = Object.values(row);
    if (values.filter(x => String(x ?? '').trim()).length < 2) return false;
    const headerMatches = found.required.filter(h => String(row[h] ?? '').trim().toLowerCase() === h.toLowerCase()).length;
    if (headerMatches >= 2) return false;
    const first = String(values[0] ?? '').trim();
    return !/^(grand\s+total|subtotal|page\s+\d+)$/i.test(first);
  });
  return { rows };
}
