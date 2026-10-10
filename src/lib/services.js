import { http } from './api';
import { session } from './session';
import { asRows } from './utils';
const username = () => session.getUsername();
export function normalizeSearch(query) {
    return query.toUpperCase().split(/\s+/).filter(Boolean).sort().join(' ');
}
export const api = {
    async login(payload) {
        const { data } = await http.post('/loginjasmine', payload);
        return data;
    },
    async searchOrders(menuKey, page, search) {
        const params = { page, menuKey, username: username() };
        if (search.trim())
            params.search = normalizeSearch(search);
        const { data } = await http.get('/searchorders', { params });
        const rows = asRows(data);
        return {
            rows,
            totalPending: Number(data?.totalPending ?? 0),
            totalMtr: Number(data?.totalMtr ?? 0),
            hasMore: rows.length > 0,
        };
    },
    async dyeingPrograms() {
        const { data } = await http.get('/searchorders', {
            params: { menuKey: 'DyeingProgramsPageKey', username: username() },
        });
        return asRows(data);
    },
    async updateDyeingProgram(payload) {
        const { data } = await http.post('/updatedyeingprg', payload);
        return data;
    },
    async greigeStock() {
        const { data } = await http.get('/gstock');
        return asRows(data);
    },
    async yarnStock() {
        const { data } = await http.get('/getYarnStock');
        return asRows(data);
    },
    async searchRecipe(query) {
        const { data } = await http.get('/search-recipe', {
            params: { search: query, page: 1, page_size: 50 },
        });
        return asRows(data);
    },
    async greigeRequisitionSummary() {
        const { data } = await http.get('/griegereqsummary');
        return asRows(data);
    },
    async greigeIssuedSummary() {
        const { data } = await http.get('/griegeissuedsummary');
        return asRows(data);
    },
    async searchJobCard(jobCardNumber) {
        const { data } = await http.get('/searchjobcard', { params: { jobcard_number: jobCardNumber } });
        const rows = asRows(data);
        if (rows.length)
            return rows[0];
        if (data && typeof data === 'object' && 'JOBCARDNO' in data)
            return data;
        return null;
    },
    async submitStage({ endpoint, payload }) {
        const { data } = await http.post(endpoint, { ...payload, username: username() });
        return data;
    },
    async productionStages() {
        const { data } = await http.get('/production_stages');
        return asRows(data);
    },
    async tracker() {
        const { data } = await http.get('/vtracker');
        return asRows(data);
    },
    async records() {
        const { data } = await http.get('/vrecords');
        return asRows(data);
    },
    async lud() {
        const { data } = await http.get('/lud');
        return asRows(data);
    },
    async generateQr(value) {
        const { data } = await http.post('/generate_qr', { data: value }, { responseType: 'blob' });
        return data;
    },
    async flushCache() {
        const { data } = await http.post('/flush_cache', {});
        return data;
    },
    async fabricMappings() {
        const { data } = await http.get('/greigestock');
        return asRows(data);
    },
    async erpGreigeNames() {
        const { data } = await http.get('/greigeslist');
        if (Array.isArray(data) && data.every((v) => typeof v === 'string'))
            return data;
        return asRows(data)
            .map((r) => String(r.ItemName ?? r.ERP_Name ?? r.FABRICNAME ?? ''))
            .filter(Boolean);
    },
    async saveFabricMapping(FabricName, ERP_Name) {
        const { data } = await http.post('/greigestock', { FabricName, ERP_Name });
        return data;
    },
    async postRows(endpoint, rows, extra = {}) {
        const { data } = await http.post(endpoint, { ...extra, rows });
        return data;
    },
    async postArray(endpoint, rows) {
        const { data } = await http.post(endpoint, rows);
        return data;
    },
    async uploadZip(endpoint, zipped, filename) {
        const form = new FormData();
        form.append('username', username());
        form.append('file', zipped, filename);
        const { data } = await http.post(endpoint, form);
        return data;
    },
};
