import { http, legacyHttp } from '@/services/http/client';

// Owner and remarks mapping only.
// Source names and timestamps will come dynamically from the API.
const LUD_DETAILS = {
    'ORDERS BOOK': {
        owner: 'RAM',
        remarks: '—',
    },
    'DYEING SCHEDULE': {
        owner: 'SHUBHAM',
        remarks: '—',
    },
    'DYEING JOB CARDS': {
        owner: 'SHUBHAM',
        remarks: '—',
    },
    'OPEN JOB CARDS': {
        owner: 'PRABHAKAR',
        remarks: '—',
    },
    'CLOSED JOB CARDS': {
        owner: 'PRABHAKAR',
        remarks: '—',
    },
    'GREIGE STOCK U-2': {
        owner: 'ANKUSH',
        remarks: '—',
    },
    'GREIGE STOCK U-3': {
        owner: 'GAGAN',
        remarks: 'WEEKLY',
    },
    'YARN STOCK': {
        owner: 'RAJEEV',
        remarks: '—',
    },
    DISPATCH: {
        owner: 'MUKESHK',
        remarks: '—',
    },
    'GREIGE REQUISITION': {
        owner: 'DILIP',
        remarks: '—',
    },
};

// Extract rows from API responses
function asRows(response) {
    const payload = response?.data ?? response;

    if (Array.isArray(payload)) {
        return payload;
    }

    if (Array.isArray(payload?.data)) {
        return payload.data;
    }

    if (Array.isArray(payload?.results)) {
        return payload.results;
    }

    if (Array.isArray(payload?.rows)) {
        return payload.rows;
    }

    return [];
}

export const reportsService = {
    async greigeRequisitionSummary() {
        const { data } = await legacyHttp.get('/griegereqsummary');
        return asRows(data);
    },

    async greigeIssuedSummary() {
        const { data } = await legacyHttp.get('/griegeissuedsummary');
        return asRows(data);
    },

    // LUD data comes dynamically from the backend
    async lud() {
        const { data } = await http.get('/user/fetch-last-updated');

        const apiRows = asRows(data);

        return apiRows.map((row) => {
            const source = String(
                row.source ?? row.Source ?? ''
            ).trim();

            const sourceKey = source.toUpperCase();

            const details = LUD_DETAILS[sourceKey] ?? {
                owner: '—',
                remarks: '—',
            };

            return {
                Report: source,
                LUD: row.lastUpdatedAt ?? row.LUD ?? null,
                USERNAME: details.owner,
                REMARKS: details.remarks,
            };
        });
    },
};