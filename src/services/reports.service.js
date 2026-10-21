import { http, legacyHttp } from '@/services/http/client';

// Names and owners for the LUD (Last Updated) page
const LUD_MODULES = [
    { source: 'ORDERS BOOK', owner: 'RAM', remarks: '—' },
    { source: 'DYEING JOB CARDS', owner: 'SHUBHAM', remarks: '—' },
    { source: 'CLOSED JOB CARDS', owner: 'PRABHAKAR', remarks: '—' },
    { source: 'GREIGE STOCK U-2', owner: 'ANKUSH', remarks: '—' },
    { source: 'GREIGE STOCK U-3', owner: 'GAGAN', remarks: 'WEEKLY' },
    { source: 'YARN STOCK', owner: 'RAJEEV', remarks: '—' },
    { source: 'DISPATCH', owner: 'MUKESHK', remarks: '—' },
    { source: 'GREIGE REQUISITION', owner: 'DILIP', remarks: '—' },
];

// Extract rows from an API response
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

// Extract rows from the Last Updated API response
function extractApiRows(responseData) {
    const candidates = [
        responseData?.data,
        responseData?.data?.data,
        responseData?.results,
        responseData?.rows,
        responseData,
    ];

    return candidates.find(Array.isArray) ?? [];
}

export const reportsService = {
    // Greige requisition summary
    async greigeRequisitionSummary() {
        const { data } = await legacyHttp.get('/griegereqsummary');

        return asRows(data);
    },

    // Greige issued summary
    async greigeIssuedSummary() {
        const { data } = await legacyHttp.get('/griegeissuedsummary');

        return asRows(data);
    },

    // Last Updated (LUD)
    async lud() {
        const { data } = await http.get('/user/fetch-last-updated');

        const apiRows = extractApiRows(data);

        const timestampBySource = new Map(
            apiRows.map((row) => [
                String(row.source ?? row.Source ?? '')
                    .trim()
                    .toUpperCase(),
                row.lastUpdatedAt ?? row.LUD ?? null,
            ])
        );

        return LUD_MODULES.map(({ source, owner, remarks }) => ({
            Report: source,
            LUD: timestampBySource.get(source) ?? null,
            USERNAME: owner,
            REMARKS: remarks,
        }));
    },
};