import { http } from '@/services/http/client';

/**
 * Converts HTML table headers to the field names expected by the backend.
 */
const JOB_CARD_FIELD_MAP = {
    'S. NO.': 'serialNo',
    'S.NO.': 'serialNo',
    'ORDER ID': 'orderId',
    'JOB CARD NO.': 'jobCardNo',
    'MANUAL LOT NO.': 'manualLotNo',
    'JOB CARD DATE': 'jobCardDate',
    'JOB CARD TIME': 'jobCardTime',
    'CUSTOMER NAME': 'customerName',
    'CUSTOMER GROUP CODE': 'customerGroupCode',
    'ITEM ID': 'itemId',
    'ITEM NAME': 'itemName',
    'BRAND NAME': 'brandName',
    'FABRIC NAME': 'fabricName',
    'CUSTOMER ITEM CODE': 'customerItemCode',
    'CUST. ITEM CODE': 'customerItemCode',
    COLOR: 'color',
    'ORDER QTY': 'orderQty',
    'ORDER QUANTITY': 'orderQty',
    'JOB CARD QTY': 'jobCardQty',
    'JOB CARD QUANTITY': 'jobCardQty',
    'BALANCE QTY': 'balanceQty',
    REMARK: 'remark',
};

/**
 * Converts dates such as:
 * 5-Oct-26     -> 2026-10-05
 * 05-Oct-2026  -> 2026-10-05
 * 2026-10-05  -> 2026-10-05
 */
function normalizeJobCardDate(value) {
    if (value === null || value === undefined || value === '') {
        return '';
    }

    const input = String(value).trim();

    // Already in YYYY-MM-DD format.
    const isoMatch = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (isoMatch) {
        const [, year, month, day] = isoMatch;

        if (!isValidDate(Number(year), Number(month), Number(day))) {
            throw new Error(`Invalid jobCardDate: "${input}".`);
        }

        return input;
    }

    // Handle DD-MMM-YY and DD-MMM-YYYY.
    const textDateMatch = input.match(
        /^(\d{1,2})[-/\s]([A-Za-z]{3,9})[-/\s](\d{2,4})$/
    );

    if (textDateMatch) {
        const [, dayText, monthText, yearText] = textDateMatch;

        const months = {
            jan: 1,
            feb: 2,
            mar: 3,
            apr: 4,
            may: 5,
            jun: 6,
            jul: 7,
            aug: 8,
            sep: 9,
            oct: 10,
            nov: 11,
            dec: 12,
        };

        const month = months[monthText.slice(0, 3).toLowerCase()];

        if (!month) {
            throw new Error(`Invalid jobCardDate: "${input}".`);
        }

        const day = Number(dayText);
        let year = Number(yearText);

        if (yearText.length === 2) {
            year += year >= 50 ? 1900 : 2000;
        }

        if (!isValidDate(year, month, day)) {
            throw new Error(`Invalid jobCardDate: "${input}".`);
        }

        return [
            String(year).padStart(4, '0'),
            String(month).padStart(2, '0'),
            String(day).padStart(2, '0'),
        ].join('-');
    }

    // Handle dates such as 05/10/2026, interpreted as DD/MM/YYYY.
    const numericDateMatch = input.match(
        /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/
    );

    if (numericDateMatch) {
        const [, dayText, monthText, yearText] = numericDateMatch;

        const day = Number(dayText);
        const month = Number(monthText);
        const year = Number(yearText);

        if (!isValidDate(year, month, day)) {
            throw new Error(`Invalid jobCardDate: "${input}".`);
        }

        return [
            String(year),
            String(month).padStart(2, '0'),
            String(day).padStart(2, '0'),
        ].join('-');
    }

    throw new Error(
        `Invalid jobCardDate "${input}". Expected DD-MMM-YY or YYYY-MM-DD.`
    );
}

/**
 * Validates that a calendar date actually exists.
 */
function isValidDate(year, month, day) {
    if (
        !Number.isInteger(year) ||
        !Number.isInteger(month) ||
        !Number.isInteger(day) ||
        year < 1000 ||
        year > 9999 ||
        month < 1 ||
        month > 12 ||
        day < 1
    ) {
        return false;
    }

    const date = new Date(Date.UTC(year, month - 1, day));

    return (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day
    );
}

/**
 * Normalizes one job card record.
 */
function normalizeJobCardRow(row) {
    const normalizedRow = {};

    for (const [key, value] of Object.entries(row ?? {})) {
        const normalizedKey = String(key)
            .trim()
            .replace(/\s+/g, ' ')
            .toUpperCase();

        const field = JOB_CARD_FIELD_MAP[normalizedKey] ?? key;

        if (field === 'jobCardDate') {
            normalizedRow[field] = normalizeJobCardDate(value);
        } else {
            normalizedRow[field] =
                typeof value === 'string' ? value.trim() : value;
        }
    }

    return normalizedRow;
}

export const jobCardService = {
    /**
     * Create job cards.
     * POST /api/v1/jobcard/create-jobcard
     */
    async createJobCards(jobCards) {
        if (!Array.isArray(jobCards) || jobCards.length === 0) {
            throw new Error(
                'Choose a job card file containing at least one data row.'
            );
        }

        const normalizedJobCards = jobCards.map((row, index) => {
            try {
                const normalizedRow = normalizeJobCardRow(row);

                if (
                    normalizedRow.orderId === undefined ||
                    normalizedRow.orderId === null ||
                    String(normalizedRow.orderId).trim() === ''
                ) {
                    throw new Error(
                        `orderId is required for job card at index ${index}.`
                    );
                }

                if (
                    normalizedRow.jobCardDate !== undefined &&
                    normalizedRow.jobCardDate !== ''
                ) {
                    normalizedRow.jobCardDate = normalizeJobCardDate(
                        normalizedRow.jobCardDate
                    );
                }

                return normalizedRow;
            } catch (error) {
                throw new Error(
                    `Job card at index ${index}: ${error.message}`
                );
            }
        });

        const { data } = await http.post(
            '/jobcard/create-jobcard',
            {
                jobCards: normalizedJobCards,
            }
        );

        if (data?.success === false) {
            throw new Error(
                data.message ?? 'Could not create job cards.'
            );
        }

        return {
            ...(data?.data && typeof data.data === 'object'
                ? data.data
                : {}),
            message: data?.message ?? 'Job cards uploaded successfully.',
            success: data?.success ?? true,
        };
    },

    /**
     * Fetch job cards.
     * GET /api/v1/jobcard/fetch-jobcard
     */
    async fetchJobCards(params = {}, signal) {
        const { data } = await http.get(
            '/jobcard/fetch-jobcard',
            {
                params: {
                    page: 1,
                    limit: 100,
                    ...params,
                },
                signal,
            }
        );

        return data?.data ?? data;
    },
};