import { http, legacyHttp } from '@/services/http/client';
import { fetchImportPage } from './import-report.service';

/** These two endpoints exist in the supplied Express backend. */
export const dyeingService = {
    dyeingPrograms(params = {}) {
        return fetchImportPage('/dyeing/fetch-dyeingprogram', 'dyeingPrograms', 'dyeing', params);
    },
    async createDyeingPrograms(dyeingPrograms) {
        const { data } = await http.post('/dyeing/create-dyeingprogram', { dyeingPrograms });
        return { ...data?.data, message: data?.message };
    },
    async fetchImportedDyeingPrograms(params = {}) {
        const { data } = await http.get('/dyeing/fetch-dyeingprogram', { params: { limit: 100, ...params } });
        return data?.data ?? {};
    },
    // Not implemented by the supplied Express API. Requires the legacy service.
    async updateDyeingProgram(payload) {
        const { data } = await legacyHttp.post('/updatedyeingprg', payload);
        return data;
    },
};
