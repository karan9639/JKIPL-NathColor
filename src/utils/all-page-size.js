export const ALL_PAGE_SIZE = 'all';
export const PAGE_SIZES = [25, 50, 100, ALL_PAGE_SIZE];
export const MAX_ALL_ROWS = 50000;

export function isAllPageSize(value) {
  return String(value).toLowerCase() === ALL_PAGE_SIZE;
}

export function normalizePageSize(value) {
  return isAllPageSize(value) ? ALL_PAGE_SIZE : (PAGE_SIZES.includes(Number(value)) ? Number(value) : 50);
}

export function localPageSize(value, rowCount) {
  return isAllPageSize(value) ? Math.max(1, rowCount) : normalizePageSize(value);
}

export function resetAppliedSearchWhenEmpty(value, reset) {
  if (!String(value ?? '').trim()) reset();
  return value;
}
