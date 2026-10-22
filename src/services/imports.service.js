import { legacyHttp } from '@/services/http/client';
import { session } from '@/services/auth/session';

/** Legacy import methods: only work with the corresponding legacy API enabled. */
export const importsService = {
    async postRows(endpoint, rows, extra = {}) {
        const { data } = await legacyHttp.post(endpoint, { ...extra, rows });
        return data?.data && typeof data.data === 'object' ? { ...data.data, message: data.message, success: data.success } : data;
    },
    async postArray(endpoint, rows) {
        const { data } = await legacyHttp.post(endpoint, rows);
        return data;
    },
    async uploadZip(endpoint, zipped, filename) {
        const form = new FormData();
        form.append('username', session.getUsername());
        form.append('file', zipped, filename);
        const { data } = await legacyHttp.post(endpoint, form);
        return data;
    },
};
