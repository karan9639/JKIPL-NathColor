import { loadAllStockPages } from './stock-pagination.js';
import { http } from '@/services/http/client';

function extractRows(response, keys) {
    const payload = response?.data ?? response;
    const nested = payload?.data ?? payload;

    if (Array.isArray(nested)) return nested;

    for (const key of keys) {
        if (Array.isArray(nested?.[key])) return nested[key];
    }

    return [];
}

function normalizeHeader(header) {
    return String(header ?? '')
        .replace(/^\uFEFF/, '')
        .trim()
        .toLowerCase()
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ');
}

function getValueByHeader(row, headers) {
    if (!row || typeof row !== 'object') return undefined;

    const entries = Object.entries(row).map(([key, value]) => [normalizeHeader(key), value]);
    for (const header of headers) {
        const entry = entries.find(([key]) => key === normalizeHeader(header));
        if (entry && entry[1] !== undefined && entry[1] !== null && String(entry[1]).trim() !== '') {
            return entry[1];
        }
    }
    return undefined;
}

function toNumber(value) {
    if (value === undefined || value === null || String(value).trim() === '') return 0;
    const number = Number(String(value).replace(/,/g, '').trim());
    return Number.isFinite(number) ? number : 0;
}

function normalizeU2Stocks(stocks) {
    return stocks.map((row, index) => {
        const fabricName = getValueByHeader(row, [
            'fabricName', 'fabric name', 'FABRIC NAME', 'fabric', 'itemName', 'item name', 'item',
        ]);
        if (!String(fabricName ?? '').trim()) {
            console.warn(`Skipping Unit 2 row ${index + 1}: missing fabric name.`, row);
            return null;
        }
        const currentStock = getValueByHeader(row, [
            'currentStock', 'current stock', 'CURRENT STOCK', 'closing.qty', 'closing qty', 'closing quantity', 'closing', 'stock', 'quantity', 'qty',
        ]);
        return { fabricName: String(fabricName).trim(), currentStock: toNumber(currentStock) };
    }).filter(Boolean);
}

// U3 parser maps the Excel ledger into the nested Mongoose schema before it reaches this service.
function normalizeU3Stocks(stocks) {
    return stocks.map((stock, index) => {
        const itemName = String(stock?.itemName ?? getValueByHeader(stock, [
            'itemName', 'item name', 'ITEM NAME', 'fabricName', 'fabric name', 'FABRIC NAME', 'fabric', 'item', 'name',
        ]) ?? '').trim();

        if (!itemName) {
            console.warn(`Skipping Unit 3 row ${index + 1}: missing item name.`, stock);
            return null;
        }

        // Preserve already-normalized nested records instead of flattening them into zeroes.
        if (stock.opening || stock.receipt || stock.issue || stock.closing) {
            return {
                itemName,
                uom: String(stock.uom ?? '').trim(),
                opening: { qty: toNumber(stock.opening?.qty), qtyKgs: toNumber(stock.opening?.qtyKgs) },
                receipt: { qty: toNumber(stock.receipt?.qty), qtyKgs: toNumber(stock.receipt?.qtyKgs) },
                issue: { qty: toNumber(stock.issue?.qty), qtyKgs: toNumber(stock.issue?.qtyKgs) },
                closing: { qty: toNumber(stock.closing?.qty), qtyKgs: toNumber(stock.closing?.qtyKgs) },
                lastReceived: { date: stock.lastReceived?.date || null, qtyKgs: toNumber(stock.lastReceived?.qtyKgs) },
                lastIssue: { date: stock.lastIssue?.date || null, qtyKgs: toNumber(stock.lastIssue?.qtyKgs) },
            };
        }

        return {
            itemName,
            uom: String(getValueByHeader(stock, ['uom', 'unit', 'unit of measurement']) ?? '').trim(),
            opening: { qty: toNumber(getValueByHeader(stock, ['opening.qty', 'opening qty', 'opening quantity', 'opening'])), qtyKgs: toNumber(getValueByHeader(stock, ['opening.qtyKgs', 'opening qty kgs', 'opening kgs'])) },
            receipt: { qty: toNumber(getValueByHeader(stock, ['receipt.qty', 'receipt qty', 'receipt quantity', 'receipt'])), qtyKgs: toNumber(getValueByHeader(stock, ['receipt.qtyKgs', 'receipt qty kgs', 'receipt kgs'])) },
            issue: { qty: toNumber(getValueByHeader(stock, ['issue.qty', 'issue qty', 'issue quantity', 'issue'])), qtyKgs: toNumber(getValueByHeader(stock, ['issue.qtyKgs', 'issue qty kgs', 'issue kgs'])) },
            closing: { qty: toNumber(getValueByHeader(stock, ['closing.qty', 'closing qty', 'closing quantity', 'closing', 'current stock'])), qtyKgs: toNumber(getValueByHeader(stock, ['closing.qtyKgs', 'closing qty kgs', 'closing kgs', 'current stock kgs'])) },
            lastReceived: { date: getValueByHeader(stock, ['lastReceived.date', 'last received date']) || null, qtyKgs: toNumber(getValueByHeader(stock, ['lastReceived.qtyKgs', 'last received qty kgs', 'last received kgs'])) },
            lastIssue: { date: getValueByHeader(stock, ['lastIssue.date', 'last issue date']) || null, qtyKgs: toNumber(getValueByHeader(stock, ['lastIssue.qtyKgs', 'last issue qty kgs', 'last issue kgs'])) },
        };
    }).filter(Boolean);
}

export const greigeStockService = {
    fetchAllU2: () => loadAllStockPages((params) => http.get('/u2greige/fetch-stock', {params})),
    fetchAllU3: () => loadAllStockPages((params) => http.get('/u3greige/fetch-stock', {params})),
    // One HTTP request for exactly the server page selected in Greige Stock.
    async fetchPage(unit, { page = 1, limit = 50, search = '' } = {}, signal) {
        if (unit !== 'u2' && unit !== 'u3') throw new Error('Invalid greige stock unit.');
        const path = unit === 'u3' ? '/u3greige/fetch-stock' : '/u2greige/fetch-stock';
        const { data } = await http.get(path, {
            params: { page, limit, ...(search.trim() ? { search: search.trim() } : {}) },
            signal,
        });
        const payload = data?.data ?? data;
        if (!Array.isArray(payload?.stocks) || !payload?.pagination) {
            throw new Error('Unexpected greige stock API response. Expected stocks and pagination.');
        }
        return {
            rows: payload.stocks,
            pagination: payload.pagination,
            summary: payload.summary ?? null,
        };
    },
    async fetchU2(params = {}) {
        const { data } = await http.get('/u2greige/fetch-stock', { params });
        return extractRows(data, ['u2GreigeStocks', 'u2GreigeStock', 'greigeStocks', 'greigeStock', 'stocks', 'records', 'rows', 'items']);
    },

    async fetchU3(params = {}) {
        const { data } = await http.get('/u3greige/fetch-stock', { params });
        return extractRows(data, ['u3GreigeStocks', 'u3GreigeStock', 'greigeStocks', 'greigeStock', 'stocks', 'records', 'rows', 'items']);
    },

    async createU2(stocks) {
        if (!Array.isArray(stocks) || stocks.length === 0) throw new Error('No Unit 2 greige stock rows to upload.');
        const normalizedStocks = normalizeU2Stocks(stocks);
        if (!normalizedStocks.length) throw new Error('No valid Unit 2 stock rows found. Check the fabric name column.');
        const { data } = await http.post('/u2greige/create-stock', { stocks: normalizedStocks });
        if (data?.success === false) throw new Error(data.message ?? 'Could not upload Unit 2 greige stock.');
        return { ...(data?.data && typeof data.data === 'object' ? data.data : {}), message: data?.message ?? 'Unit 2 greige stock uploaded successfully.' };
    },

    async createU3(stocks) {
        if (!Array.isArray(stocks) || stocks.length === 0) throw new Error('No Unit 3 greige stock rows to upload.');
        const normalizedStocks = normalizeU3Stocks(stocks);
        if (!normalizedStocks.length) throw new Error('No valid Unit 3 stock rows found. Check the Item Name column.');
        const { data } = await http.post('/u3greige/create-stock', { stocks: normalizedStocks });
        if (data?.success === false) throw new Error(data.message ?? 'Could not upload Unit 3 greige stock.');
        return { ...(data?.data && typeof data.data === 'object' ? data.data : {}), message: data?.message ?? 'Unit 3 greige stock uploaded successfully.' };
    },
};
