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
    async productionStages({page=1,limit=50,status='ALL',signal}={}) {
        const {data}=await legacyHttp.get('/production_stages',{params:{paged:1,page,limit,status},signal});
        return data?.data??{rows:[],summary:{},pagination:{currentPage:page,limit,totalEntries:0,totalPages:1}};
    },
    async tracker({ page = 1, limit = 50, status = 'All', search = '', signal } = {}) {
        const { data } = await legacyHttp.get('/vtracker', {
            params: { paged: 1, page, limit, status, search }, signal,
        });
        return data?.data ?? { rows: [], summary: {}, pagination: { totalEntries: 0, totalPages: 1, currentPage: page, limit } };
    },
    async knittingPOLines({page=1,limit=50,filters={},signal}={}) {
        const {data}=await legacyHttp.get('/knitting/po-lines',{
            params:{paged:1,page,limit,basis:filters.basis||'PO_DATE',from:filters.from||'',to:filters.to||'',search:filters.search||'',status:filters.status||'ALL'},signal,
        });
        return data?.data??{rows:[],summary:{},pagination:{currentPage:page,limit,totalEntries:0,totalPages:1}};
    },
    async records() {
        const { data } = await legacyHttp.get('/vrecords');
        return asRows(data);
    },
};
