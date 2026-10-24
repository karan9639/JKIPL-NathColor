import { http } from '@/services/http/client';
import { fetchImportPage } from './import-report.service';

/** Verified yarn stock endpoints and payloads from the supplied Express backend. */
export const yarnService = {
    yarnStock(params = {}, signal) {
        return fetchImportPage('/yarn/fetch-yarnstock', 'yarnStocks', 'yarn', params, signal);
    },
    async createImportedYarnStock(yarnStocks, reportPeriod) {
        const { data } = await http.post('/yarn/create-yarnstock', { yarnStocks, reportPeriod });
        return { ...data?.data, message: data?.message };
    },
    async fetchImportedYarnStock(params = {}) {
        const { data } = await http.get('/yarn/fetch-yarnstock', { params: { limit: 100, ...params } });
        return data?.data ?? {};
    },
};
