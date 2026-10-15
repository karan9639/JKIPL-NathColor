import { legacyHttp } from '@/services/http/client';
import { session } from '@/services/auth/session';
import { asRows } from '@/utils/format';

const username = () => session.getUsername();
export const productionService = {
    async searchJobCard(jobCardNumber) {
        const { data } = await legacyHttp.get('/searchjobcard', { params: { jobcard_number: jobCardNumber } });
        const rows = asRows(data);
        if (rows.length) return rows[0];
        if (data && typeof data === 'object' && 'JOBCARDNO' in data) return data;
        return null;
    },
    async submitStage({ endpoint, payload }) {
        const { data } = await legacyHttp.post(endpoint, { ...payload, username: username() });
        return data;
    },
    async productionStages() {
        const { data } = await legacyHttp.get('/production_stages');
        return asRows(data);
    },
    async tracker() {
        const { data } = await legacyHttp.get('/vtracker');
        return asRows(data);
    },
    async knittingPOLines() {
        const { data } = await legacyHttp.get('/knitting/po-lines');
        return asRows(data);
    },
    async createKnittingEntry(payload) {
        const { data } = await legacyHttp.post('/knitting/entries', { ...payload, username: username() });
        return data;
    },
    async linkKnittingJobCard(payload) {
        const { data } = await legacyHttp.post('/knitting/jobcards/link', { ...payload, username: username() });
        return data;
    },
    async records() {
        const { data } = await legacyHttp.get('/vrecords');
        return asRows(data);
    },
};
