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

export function mapLastUpdatedRows(apiRows) {
    return asRows(apiRows).map((row) => {
        const source = String(row.source ?? row.Source ?? '').trim();
        const details = LUD_DETAILS[source.toUpperCase()] ?? { owner: '—', remarks: '—' };
        return {
          Report: source,
          LUD: row.lastUpdatedAt ?? row.LUD ?? null,
          USERNAME: row.importedBy ?? "—",
          REMARKS: row.count + " updated items",
        };
    });
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
    async lud({ signal } = {}) {
        const { data } = await http.get('/user/fetch-last-updated', { signal });

        return mapLastUpdatedRows(data);
    },
};