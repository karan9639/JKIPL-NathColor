import { isAllPageSize } from './all-page-size.js';
/** Count-based pagination for a server-returned page; never paginate loaded rows twice. */
export function getServerPageMeta(pagination, loadedRows = 0) {
  const total = Math.max(0, Math.trunc(Number(pagination?.totalEntries) || 0));
  const limit = isAllPageSize(pagination?.limit) ? 'all' : Math.max(1, Math.trunc(Number(pagination?.limit) || 50));
  const pages = isAllPageSize(limit) ? 1 : Math.max(1, Math.ceil(total / limit));
  const page = Math.min(pages, Math.max(1, Math.trunc(Number(pagination?.currentPage) || 1)));
  const count = Math.max(0, Math.trunc(Number(loadedRows) || 0));
  const start = total && count ? (isAllPageSize(limit) ? 1 : (page - 1) * limit + 1) : 0;
  const end = start ? Math.min(total, start + count - 1) : 0;
  return { total, limit, pages, page, start, end, hasPrevious: page > 1, hasNext: page < pages };
}
