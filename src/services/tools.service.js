import { legacyHttp } from '@/services/http/client';

export const toolsService = {
    async generateQr(value) {
        const { data } = await legacyHttp.post('/generate_qr', { data: value }, { responseType: 'blob' });
        return data;
    },
    async flushCache() {
        const { data } = await legacyHttp.post('/flush_cache', {});
        return data;
    },
};
