/** Parser for the real 14-column ERP U-1 greige ledger (shown as U-3 in NathColor). */
import { asNumber, asText, excelDate, headerKey } from './import-mappers.js';
const same = (a,b) => headerKey(a) === headerKey(b);
const numberAt = (cells, i, rowNo, title) => {
  const value = cells[i];
  if (value === undefined || value === null || asText(value) === '' || asText(value) === '-') return 0;
  const n = asNumber(value);
  if (!Number.isFinite(n)) throw new Error(`ERP row ${rowNo}: invalid ${title}: ${value}`);
  return n;
};
const dateAt = (cells, i, rowNo) => {
  const value = cells[i];
  if (value === undefined || value === null || !asText(value) || asText(value) === '-') return null;
  const parsed = excelDate(value);
  if (!parsed) throw new Error(`ERP row ${rowNo}: invalid date ${value}`);
  return parsed;
};
export function normalizeU3GreigeSheet(table) {
  if (!Array.isArray(table) || !table.length) throw new Error('Greige U-1 ledger workbook is empty');
  // Two verified exports of this same ERP ledger use different merged-header anchors:
  // 256947.xlsx places the Closing heading in I, while 295.xlsx places it in J.
  // Importantly, the actual 14-column data schema does NOT move: Closing Qty
  // and Closing Qty Kgs still occupy I and J in both exports.
  const isLedgerHeader = (r) => Array.isArray(r)
    && same(r[0], 'Item Name')
    && same(r[1], 'UOM')
    && same(r[4], 'Receipt')
    && same(r[7], 'Issue')
    && (same(r[8], 'Closing') || same(r[9], 'Closing'));
  const headerIndex = table.findIndex(isLedgerHeader);
  if (headerIndex < 0) throw new Error('Expected ERP stock ledger headers: Item Name (A), UOM (B), Receipt (E), Issue (H), Closing (I or J).');
  const sub = table[headerIndex + 2] ?? [];
  if (!same(sub[4], 'Qty') || !same(sub[5], 'Qty Kgs') || !same(sub[6], 'Qty') || !same(sub[7], 'Qty Kgs') || !same(sub[8], 'Qty') || !same(sub[9], 'Qty Kgs') || !same(sub[10], 'Date') || !same(sub[11], 'Qty Kgs') || !same(sub[12], 'Date') || !same(sub[13], 'Qty Kgs')) {
    throw new Error('Unexpected U-1 ledger subheaders. Expected Receipt Qty/Kgs (E-F), Issue Qty/Kgs (G-H), Closing Qty/Kgs (I-J), Last Received Date/Kgs (K-L) and Last Issue Date/Kgs (M-N).');
  }
  const out=[];const identities=new Map();const skipped=[];
  table.forEach((r,idx)=>{
    if(idx<=headerIndex+2 || !Array.isArray(r))return;
    const name=asText(r[0]),uom=asText(r[1]).toUpperCase();
    if(!name) return;
    // ERP repeats report title + headers on every printed page and has a Total footer.
    if (/^(stock ledger|item name|total\b|page \d+\b)/i.test(name) || !uom && !r.slice(2,14).some(v=> typeof v==='number')) {skipped.push(idx+1);return;}
    if(!/^(KGS?|KG\.?|MTRS?|METERS?|PCS|YRD|YARDS?|NOS?)$/i.test(uom)) {
      throw new Error(`ERP row ${idx+1}: unknown UOM ${JSON.stringify(uom)} for ${name}; check the report instead of importing zero stock.`);
    }
    const doc={ itemName:name,uom,
      opening:{qty:numberAt(r,2,idx+1,'Opening Qty'),qtyKgs:numberAt(r,3,idx+1,'Opening Kgs')},
      receipt:{qty:numberAt(r,4,idx+1,'Receipt Qty'),qtyKgs:numberAt(r,5,idx+1,'Receipt Kgs')},
      issue:{qty:numberAt(r,6,idx+1,'Issue Qty'),qtyKgs:numberAt(r,7,idx+1,'Issue Kgs')},
      closing:{qty:numberAt(r,8,idx+1,'Closing Qty'),qtyKgs:numberAt(r,9,idx+1,'Closing Kgs')},
      lastReceived:{date:dateAt(r,10,idx+1),qtyKgs:numberAt(r,11,idx+1,'Last Received Kgs')},
      lastIssue:{date:dateAt(r,12,idx+1),qtyKgs:numberAt(r,13,idx+1,'Last Issue Kgs')}
    };
    const key=`${name.trim().replace(/\s+/g,' ').toUpperCase()}|${uom}`;
    if (identities.has(key)) {
      const prior=identities.get(key);
      if(JSON.stringify(prior.doc)===JSON.stringify(doc)){skipped.push(idx+1);return;}
      throw new Error(`ERP row ${idx+1}: ${name} / ${uom} conflicts with ERP row ${prior.row}; verify item identity and amounts.`);
    }
    identities.set(key,{doc,row:idx+1});out.push(doc);
  });
  if(!out.length)throw new Error('No real stock ledger rows found after skipping repeated page headers');
  return out;
}
