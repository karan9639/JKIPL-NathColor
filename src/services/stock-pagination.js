/** Read every committed stock page for accurate totals and export.
 * Querying only page 1 previously displayed just 100 out of 533 ERP U-3 items. */
export async function loadAllStockPages(fetchPage, { limit = 100, maxPages = 100 } = {}) {
  const all = [];
  let expectedSnapshot = null;
  for (let page = 1; page <= maxPages; page += 1) {
    const response = await fetchPage({page, limit});
    const payload = response?.data?.data ?? response?.data ?? response;
    const rows = Array.isArray(payload) ? payload : (payload?.stocks ?? []);
    if (!Array.isArray(rows)) throw new Error('Invalid stock API response: stocks must be an array');
    for (const row of rows) {
      const id = row?.snapshotId || '';
      if (expectedSnapshot === null) expectedSnapshot = id;
      if (id !== expectedSnapshot) throw new Error('Stock report changed while loading; refresh the page to read a consistent snapshot.');
    }
    all.push(...rows);
    const pagination = payload?.pagination;
    if (!pagination) return all;
    if (!pagination.hasNextPage) {
      if (Number.isFinite(Number(pagination.totalEntries)) && all.length !== Number(pagination.totalEntries)) throw new Error('Stock page count changed; refresh to read the latest snapshot.');
      return all;
    }
    if (!rows.length) throw new Error('Stock pagination returned an empty page while more records remain.');
  }
  throw new Error('Stock dataset exceeds the 10,000-record viewer limit; use server-side pagination.');
}
