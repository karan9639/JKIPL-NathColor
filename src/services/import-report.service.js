import { http } from '@/services/http/client';
import { readImportPage, emptyImportPage, isEmptyImportReport } from '@/utils/import-read-models';

/** Get a paginated page from the verified Express API contract. */
export async function fetchImportPage(route, collectionKey, resource, params = {}) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 100));
    try {
        const { data } = await http.get(route, { params: { ...params, page, limit } });
        return readImportPage(data, collectionKey, page, limit);
    } catch (error) {
        // The backend uses 404 for an empty collection as well as for missing routes.
        if (isEmptyImportReport(error, resource)) return emptyImportPage(page, limit);
        throw error;
    }
}
