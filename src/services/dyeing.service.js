import { http, legacyHttp } from '@/services/http/client';
import { fetchImportPage } from './import-report.service';

/**
 * Dyeing API integration follows the same pattern as yarn.service.js.
 * The upload screen parses the selected Excel file into normalized rows,
 * then createDyeingPrograms sends those rows to the authenticated backend.
 */
export const dyeingService = {
    // Used by the Dyeing Programs page; returns { rows, pagination } like yarnStock().
    dyeingPrograms(params = {}) {
        return fetchImportPage(
            '/dyeing/fetch-dyeingprogram',
            'dyeingPrograms',
            'dyeing',
            params
        );
    },

    // Used by the Imports screen after the Excel file has been parsed/previewed.
    async createDyeingPrograms(dyeingPrograms) {
        if (!Array.isArray(dyeingPrograms) || dyeingPrograms.length === 0) {
            throw new Error('No dyeing program rows were provided for upload.');
        }

        const { data } = await http.post('/dyeing/create-dyeingprogram', {
            dyeingPrograms,
        });

        if (data?.success === false) {
            throw new Error(data?.message ?? 'Could not create dyeing programs.');
        }

        return {
            ...(data?.data && typeof data.data === 'object' ? data.data : {}),
            message: data?.message ?? 'Dyeing programs uploaded successfully.',
        };
    },

    // Used by Imports > Saved imports; preserves the same raw response shape as yarn.
    async fetchImportedDyeingPrograms(params = {}) {
        const { data } = await http.get('/dyeing/fetch-dyeingprogram', {
            params: { limit: 100, ...params },
        });
        return data?.data ?? {};
    },

    // Existing legacy endpoint retained unchanged; it is not in the supplied router.
    async updateDyeingProgram(payload) {
        const { data } = await legacyHttp.post('/updatedyeingprg', payload);
        return data;
    },
};
