import { isAllPageSize } from './all-page-size.js';
/** Preserve every order allocation row even if its jobCardNo/manualLotNo repeats. */
export function readJobCardLotsPage(payload, requestedPage = 1) {
  if (!Array.isArray(payload?.jobCards)) {
    throw new Error('Unexpected job-card API response: data.jobCards must be an array.');
  }
  const meta = payload.pagination;
  if (!meta || !Number.isFinite(Number(meta.totalEntries))) {
    throw new Error('Unexpected job-card API response: pagination is missing.');
  }
  const page = Math.max(1, Number(meta.currentPage) || requestedPage);
  const limit = isAllPageSize(meta.limit) ? 'all' : Math.min(100, Math.max(1, Number(meta.limit) || 100));
  const totalEntries = Math.max(0, Number(meta.totalEntries));
  const totalPages = isAllPageSize(limit) ? 1 : Math.max(1, Number(meta.totalPages) || Math.ceil(totalEntries / limit));
  return {
    rows: payload.jobCards,
    summary: payload.summary ?? null,
    pagination: {
      totalEntries, totalPages, currentPage: page, limit,
      hasPrevPage: Boolean(meta.hasPrevPage ?? page > 1),
      hasNextPage: Boolean(meta.hasNextPage ?? page < totalPages),
    },
  };
}
