import { http } from '@/services/http/client';
import { mapLastUpdatedRows } from '@/services/reports.service';

export const dashboardService = {
    async overview({ signal } = {}) {
        const { data } = await http.get('/dashboard/overview', { signal });
        const result = data?.data ?? data;
        if (!Array.isArray(result?.records) || !Array.isArray(result?.lastUpdated)) {
            throw new Error('Dashboard overview response is incomplete. Deploy the matching Railway backend.');
        }
        return { records: result.records, lud: mapLastUpdatedRows(result.lastUpdated) };
    },
};
