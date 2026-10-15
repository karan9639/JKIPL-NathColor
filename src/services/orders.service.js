import { legacyHttp } from '@/services/http/client';
import { session } from '@/services/auth/session';
import { asRows } from '@/utils/format';

export function normalizeSearch(query) {
    return String(query ?? '').toUpperCase().split(/\s+/).filter(Boolean).sort().join(' ');
}

export const ordersService = {
    async searchOrders(menuKey, page, search) {
        const params = { page, menuKey, username: session.getUsername() };
        if (search.trim()) params.search = normalizeSearch(search);
        const { data } = await legacyHttp.get('/searchorders', { params });
        const rows = asRows(data);
        return { rows, totalPending: Number(data?.totalPending ?? 0), totalMtr: Number(data?.totalMtr ?? 0), hasMore: rows.length > 0 };
    },
};
