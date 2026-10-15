import { legacyHttp } from '@/services/http/client';
import { asRows } from '@/utils/format';

export const reportsService = {
    async greigeRequisitionSummary() {
        const { data } = await legacyHttp.get('/griegereqsummary');
        return asRows(data);
    },
    async greigeIssuedSummary() {
        const { data } = await legacyHttp.get('/griegeissuedsummary');
        return asRows(data);
    },
    async lud() {
        const { data } = await legacyHttp.get('/lud');
        return asRows(data);
    },
};
