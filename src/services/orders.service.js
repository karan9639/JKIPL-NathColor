import { http, legacyHttp } from '@/services/http/client';
import { session } from '@/services/auth/session';
import { asRows } from '@/utils/format';

export function normalizeSearch(query) {
    return String(query ?? '').trim().replace(/\s+/g, ' ');
}

function extractOrderRows(response) {
    const payload = response?.data ?? response;
    const nested = payload?.data ?? payload;

    const rows = Array.isArray(nested)
        ? nested
        : nested?.orderBooks
            ?? nested?.orders
            ?? nested?.orderBook
            ?? nested?.records
            ?? nested?.rows
            ?? nested?.results
            ?? nested?.items;

    return Array.isArray(rows)
        ? rows.filter((row) => row && typeof row === 'object')
        : asRows(nested);
}

export const ordersService = {
    /** Fetch the order book saved by POST /order/create-order. */
    async fetchOrderBook(page = 1, search = '') {
    const params = {
        page,
        limit: 100,
    };

    if (search.trim()) {
        params.search = normalizeSearch(search);
    }

    const { data: response } = await http.get(
        '/orderbook/fetch-order',
        { params }
    );

    const payload = response?.data ?? response;

    const rows = extractOrderRows(response);

    const pagination =
        payload?.pagination ??
        response?.pagination ??
        {};

    return {
        rows,

        totalPending: Number(
            payload?.totalPending ??
            response?.totalPending ??
            rows.reduce(
                (sum, row) => sum + Number(row.BALKGS ?? 0),
                0
            )
        ),

        totalMtr: Number(
            payload?.totalMtr ??
            response?.totalMtr ??
            rows.reduce(
                (sum, row) => sum + Number(row.BALMTR ?? 0),
                0
            )
        ),

        pagination: {
            totalEntries: Number(pagination.totalEntries ?? rows.length),
            totalPages: Number(pagination.totalPages ?? 1),
            currentPage: Number(pagination.currentPage ?? page),
            limit: Number(pagination.limit ?? 100),

            hasNextPage: Boolean(
                pagination.hasNextPage ??
                (page < Number(pagination.totalPages ?? 1))
            ),

            hasPrevPage: Boolean(
                pagination.hasPrevPage ??
                (page > 1)
            ),
        },

        hasMore: Boolean(
            pagination.hasNextPage ??
            (page < Number(pagination.totalPages ?? 1))
        ),
    };
},

    /** Preserve legacy search endpoints for Domestic and Brand pending pages. */
    async searchOrders(menuKey, page, search) {
        if (menuKey === 'SearchOrdersPageKey') {
            return this.fetchOrderBook(page, search);
        }

        const params = { page, menuKey, username: session.getUsername() };
        if (search.trim()) params.search = normalizeSearch(search);
        const { data } = await legacyHttp.get('/searchorders', { params });
        const rows = asRows(data);
        return { rows, totalPending: Number(data?.totalPending ?? 0), totalMtr: Number(data?.totalMtr ?? 0), hasMore: rows.length > 0 };
    },

    async fetchOrderSummary(orderId) {
      const {data} = await http.get(`/orderbook/${encodeURIComponent(orderId)}/summary`);
      return data?.data ?? data;
    },
    /** Upload normalized records parsed from the Order Book file. */
    async createOrderBook(orders) {
  if (!Array.isArray(orders) || orders.length === 0) {
    throw new Error(
      'Choose an Order Book file containing at least one valid data row.'
    );
  }

  const numericFields = [
  'rate',
  'quantity',
  'upperGsm',
  'foamThickness',
  'evaThickness',
  'backerGsm',
  'shortClosedQty',
  'width',
  'amount',
];

const normalizedOrders = orders.map((row) => {
  const normalizedRow = {};

  const fieldMap = {
    'ORDER ID': 'orderId',
    LOCATION: 'location',
    'CUSTOMER GROUP CODE': 'customerGroupCode',
    'CUSTOMER NAME': 'customerName',
    'REF PO': 'refPO',
    'ORDER NUMBER': 'orderNumber',
    'ITEM ID': 'itemId',
    'ITEM NAME': 'itemName',
    'CUST. ITEM CODE': 'customerItemCode',
    PRODUCT: 'product',
    'RECEIVED DATE': 'receivedDate',
    'DELIVERY DATE': 'deliveryDate',
    RATE: 'rate',
    'QTY.': 'quantity',
    'UPPER GSM': 'upperGsm',
    'FOAM THICKNESS': 'foamThickness',
    'EVA THICKNESS': 'evaThickness',
    'BACKER GSM': 'backerGsm',
    'SHORT CLOSED QTY.': 'shortClosedQty',
    WIDTH: 'width',
    AMOUNT: 'amount',
    REMARK: 'remark',
    'STORE TYPE': 'storeType',
    'UPPER FABRIC NAME': 'upperFabricName',
    'LAMINATION UPPER': 'laminationUpper',
    'UPPER COLOR': 'upperColor',
    'FOAM DENSITY': 'foamDensity',
    'FOAM COLOR': 'foamColor',
    'EVA TYPE': 'evaType',
    'EVA COLOR': 'evaColor',
    'BACKER NAME': 'backerName',
    'LAMINATION BACKER': 'laminationBacker',
    'BACKER COLOR': 'backerColor',
    UOM: 'uom',
    'BRAND NAME': 'brandName',
    'LAMINATION DETAIL': 'laminationDetail',
    'PRODUCTION MONTH': 'productionMonth',
  };

  for (const [key, value] of Object.entries(row)) {
    const normalizedKey = key
      .trim()
      .replace(/\s+/g, ' ')
      .toUpperCase();

    const field = fieldMap[normalizedKey] || key;

    normalizedRow[field] =
      typeof value === 'string' ? value.trim() : value;
  }

  for (const field of numericFields) {
    const value = normalizedRow[field];

    // Preserve missing optional values.
    if (value === undefined || value === null || value === '') {
      continue;
    }

    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
      throw new Error(
        `Invalid numeric value "${value}" for ${field} in Order ID ${normalizedRow.orderId ?? 'unknown'}.`
      );
    }

    normalizedRow[field] = numericValue;
  }

  return normalizedRow;
});

  const { data: response } = await http.post('/orderbook/create-order', {
    orderBooks: normalizedOrders,
  });

  if (response?.success === false) {
    throw new Error(
      response.message ?? 'Could not create Order Book records.'
    );
  }

  return {
    ...(response?.data && typeof response.data === 'object'
      ? response.data
      : {}),
    message: response?.message ?? 'Order Book imported successfully.',
    success: response?.success ?? true,
  };
},
};
