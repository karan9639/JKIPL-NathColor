/**
 * Match the stock rules used by the ERP KPI cards.
 * Missing/non-numeric values are excluded from out-of-stock counts.
 */
export const EMPTY_GREIGE_SUMMARY = Object.freeze({
  qualities: 0,
  totalStock: 0,
  outOfStock: 0,
  below500: 0,
});

function stockNumber(value) {
  if (value == null || String(value).trim() === '') return null;
  const parsed = Number(String(value).replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : null;
}

export function summarizeGreigeRows(rows, unit) {
  if (unit !== 'u2' && unit !== 'u3') throw new Error('Unknown greige stock unit.');
  const result = { ...EMPTY_GREIGE_SUMMARY };
  for (const row of rows) {
    result.qualities += 1;
    const raw = unit === 'u3' ? row?.closing?.qtyKgs : row?.currentStock;
    const value = stockNumber(raw);
    if (value === null) continue;
    result.totalStock += value;
    if (value <= 0) result.outOfStock += 1;
    else if (value < 500) result.below500 += 1;
  }
  return result;
}

/** Retrieve every matching row only for KPIs, never for the normal table.
 * The existing backend limits each page to 100 records and has no KPI endpoint.
 * Query cancellation and caching are managed by the caller (React Query).
 */
export async function loadGreigeSummary(fetchPage, unit, { search = '', maxPages = 100 } = {}) {
  const requestedLimit = 100;
  const first = await fetchPage({ page: 1, limit: requestedLimit, search });
  const total = Number(first.pagination?.totalEntries);
  if (!Number.isSafeInteger(total) || total < 0) {
    throw new Error('Invalid stock totalEntries returned by API.');
  }
  if (total === 0) return { ...EMPTY_GREIGE_SUMMARY };

  const actualLimit = Number(first.pagination?.limit);
  if (!Number.isSafeInteger(actualLimit) || actualLimit <= 0 || actualLimit > 100) {
    throw new Error('Invalid stock API page size.');
  }
  const totalPages = Math.ceil(total / actualLimit);
  if (totalPages > maxPages) {
    throw new Error(`Stock totals exceed ${maxPages} API pages; please add a backend summary endpoint.`);
  }

  const rows = [...first.rows];
  const snapshot = first.rows[0]?.snapshotId ?? null;
  for (let page = 2; page <= totalPages; page += 1) {
    const next = await fetchPage({ page, limit: actualLimit, search });
    if (Number(next.pagination?.totalEntries) !== total || Number(next.pagination?.currentPage) !== page) {
      throw new Error('Greige Stock changed while calculating KPIs. Refresh the page.');
    }
    if (!next.rows.length) {
      throw new Error('An API page was empty while stock records were expected.');
    }
    rows.push(...next.rows);
  }

  if (rows.length !== total || (snapshot !== null && rows.some((row) => row.snapshotId !== snapshot))) {
    throw new Error('Greige Stock changed during KPI calculation. Refresh the page.');
  }
  return summarizeGreigeRows(rows, unit);
}
