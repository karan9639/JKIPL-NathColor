import { isAllPageSize } from './all-page-size.js';
// Normalize legacy MIX recipe rows and the newer ERP Dyed & Chemical Details.
// Deliberately keep all source fields accessible to the details dialog.
export function recipeField(row, ...names) {
  if (!row || typeof row !== 'object') return '';
  const fields = new Map(Object.entries(row).map(([key, value]) =>
    [String(key).replace(/[^a-z0-9]/gi, '').toLowerCase(), value]));
  for (const name of names) {
    const value = fields.get(name.replace(/[^a-z0-9]/gi, '').toLowerCase());
    if (value !== null && value !== undefined && String(value).trim() !== '') return value;
  }
  return '';
}

export function recipeType(row) {
  if (recipeField(row, 'Jobcard No.', 'Jobcard No', 'Job Card No')) return 'Dyed & chemical details';
  if (recipeField(row, 'SHADE', 'COLOR1', 'QUALITY')) return 'Legacy MIX recipe';
  return 'ERP record';
}

export function recipeDisplay(row) {
  return {
    recordType: recipeType(row),
    jobCard: recipeField(row, 'Jobcard No.', 'JOBCARDNO', 'REGNO'),
    lot: recipeField(row, 'Manual Lot No.', 'MANUALLOTNO'),
    customer: recipeField(row, 'Customer Name', 'PARTY'),
    fabric: recipeField(row, 'Item Name', 'QUALITY'),
    colour: recipeField(row, 'Colour', 'SHADE'),
    date: recipeField(row, 'Request Date', 'Jobcard Date', 'DATE'),
    kgs: recipeField(row, 'Jobcard Kg', 'Job Card KG', 'KGS'),
    cost: recipeField(row, 'Cost Per Kg'),
    register: recipeField(row, 'Register No.', 'REGNO'),
    page: recipeField(row, 'Page No.', 'PAGENO'),
  };
}

export function getRecipePage(response, requestedPage = 1, requestedLimit = 50) {
  if (response?.success === false) throw new Error(response.message || 'Unable to load recipe records.');
  const data = response?.data ?? response;
  if (data != null && !Array.isArray(data) && typeof data !== 'object') {
    throw new Error('Unexpected recipe API response. Expected ERP records.');
  }
  if (data && !Array.isArray(data) && !Array.isArray(data.rows)) {
    throw new Error('Unexpected recipe API response. Expected data.rows to be an array.');
  }
  const rows = Array.isArray(data?.rows) ? data.rows : Array.isArray(data) ? data : [];
  const meta = data?.pagination ?? {};
  const totalEntries = Number(meta.totalEntries ?? rows.length);
  const limit = isAllPageSize(meta.limit ?? requestedLimit) ? 'all' : Number(meta.limit ?? requestedLimit);
  const currentPage = Number(meta.currentPage ?? requestedPage);
  return {
    rows,
    pagination: {
      totalEntries, limit, currentPage,
      totalPages: isAllPageSize(limit) ? 1 : Number(meta.totalPages ?? Math.ceil(totalEntries / limit)),
      hasNextPage: Boolean(meta.hasNextPage ?? (!isAllPageSize(limit) && currentPage * limit < totalEntries)),
      hasPrevPage: Boolean(meta.hasPrevPage ?? currentPage > 1),
    },
  };
}
