import { legacyHttp } from '@/services/http/client';
import { asRows } from '@/utils/format';

export const inventoryService = {
    async greigeStock() {
        const { data } = await legacyHttp.get('/gstock');
        return asRows(data);
    },
    async fabricMappings() {
        const { data } = await legacyHttp.get('/greigestock');
        return asRows(data);
    },
    async erpGreigeNames() {
        const { data } = await legacyHttp.get('/greigeslist');
        if (Array.isArray(data) && data.every((v) => typeof v === 'string')) return data;
        return asRows(data).map((r) => String(r.ItemName ?? r.ERP_Name ?? r.FABRICNAME ?? '')).filter(Boolean);
    },
    async saveFabricMapping(FabricName, ERP_Name) {
        const { data } = await legacyHttp.post('/greigestock', { FabricName, ERP_Name });
        return data;
    },
};
