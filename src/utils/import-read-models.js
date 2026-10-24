/**
 * Adapt the authenticated Express GET /dyeing/fetch-dyeingprogram and
 * GET /yarn/fetch-yarnstock response bodies without losing pagination.
 * The server returns { success, data: { pagination, dyeingPrograms | yarnStocks }}.
 */
export function readImportPage(response, collectionKey, requestedPage = 1, limit = 100) {
    const payload = response?.data ?? response;
    const records = payload?.[collectionKey];
    if (!Array.isArray(records)) {
        throw new Error(`Unexpected ${collectionKey} API response. Expected data.${collectionKey} to be an array.`);
    }
    const meta = payload.pagination ?? {};
    const page = Math.max(1, Number(meta.currentPage ?? requestedPage) || 1);
    const totalEntries = Math.max(0, Number(meta.totalEntries ?? records.length) || 0);
    const pageSize = Math.min(100, Math.max(1, Number(meta.limit ?? limit) || 100));
    const totalPages = Math.max(1, Number(meta.totalPages ?? Math.ceil(totalEntries / pageSize)) || 1);
    return {
        rows: records,
        summary: payload.summary ?? null,
        pagination: {
            totalEntries, totalPages, currentPage: page, limit: pageSize,
            hasPrevPage: Boolean(meta.hasPrevPage ?? page > 1),
            hasNextPage: Boolean(meta.hasNextPage ?? page < totalPages),
        },
    };
}

/** Only the backend's explicit no-data 404 messages denote an empty report.
 * A genuine route-not-found 404 must remain an error, not an empty table. */
export function isEmptyImportReport(error, resource) {
    if (error?.status !== 404) return false;
    const message = String(error.message ?? '');
    return resource === 'dyeing'
        ? /no dyeing programs found/i.test(message)
        : resource === 'yarn' && /no yarn stock records found/i.test(message);
}

export function emptyImportPage(page = 1, limit = 100) {
    return {
        rows: [],
        summary: null,
        pagination: {
            totalEntries: 0, totalPages: 1, currentPage: page, limit,
            hasNextPage: false, hasPrevPage: false,
        },
    };
}

export function importQueryParams({ page = 1, limit = 100, mode = 'latest', date = '', fromDate = '', toDate = '', search = '' } = {}) {
    const params = { page, limit };
    if (mode === 'date' && date) params.date = date;
    if (mode === 'range' && fromDate && toDate) {
        params.fromDate = fromDate;
        params.toDate = toDate;
    }
    if (search.trim()) params.search = search.trim();
    return params;
}
