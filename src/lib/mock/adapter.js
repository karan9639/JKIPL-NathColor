import * as data from './data.js';
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
function parseBody(cfg) {
    if (!cfg.data || cfg.data instanceof FormData)
        return {};
    if (typeof cfg.data === 'string') {
        try {
            return JSON.parse(cfg.data);
        }
        catch {
            return {};
        }
    }
    return cfg.data;
}
function respond(cfg, body, status = 200) {
    if (status >= 400) {
        const err = Object.assign(new Error(`Request failed with status code ${status}`), {
            isAxiosError: true,
            config: cfg,
            response: { data: body, status, statusText: 'Error', headers: {}, config: cfg },
        });
        throw err;
    }
    return { data: body, status, statusText: 'OK', headers: {}, config: cfg };
}
// Basic email shape check used by the demo login (mirrors the login form).
function isEmailAddress(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
function qrSvg(value) {
    let seed = 0;
    for (const ch of value)
        seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
    const size = 25;
    const cells = [];
    const finder = (x, y) => (x < 7 && y < 7) || (x >= size - 7 && y < 7) || (x < 7 && y >= size - 7);
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            let on;
            if (finder(x, y)) {
                const lx = x >= size - 7 ? x - (size - 7) : x;
                const ly = y >= size - 7 ? y - (size - 7) : y;
                on = lx === 0 || lx === 6 || ly === 0 || ly === 6 || (lx >= 2 && lx <= 4 && ly >= 2 && ly <= 4);
            }
            else {
                seed = (seed * 1103515245 + 12345) >>> 0;
                on = (seed >> 16) % 2 === 0;
            }
            if (on)
                cells.push(`<rect x="${x + 2}" y="${y + 2}" width="1" height="1"/>`);
        }
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size + 4} ${size + 4}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><g fill="#000">${cells.join('')}</g></svg>`;
    return new Blob([svg], { type: 'image/svg+xml' });
}
export const mockAdapter = async (cfg) => {
    await delay(250 + Math.random() * 250);
    const url = (cfg.url ?? '').replace(/^\/mock-api/, '');
    const method = (cfg.method ?? 'get').toLowerCase();
    const params = (cfg.params ?? {});
    const body = parseBody(cfg);
    switch (`${method} ${url}`) {
        // Email + password only. The legacy username-based login has been removed.
        case 'post /user/login': {
            const email = String(body.email ?? '').trim().toLowerCase();
            const password = String(body.password ?? '');
            if (!isEmailAddress(email) || password.length < 2)
                return respond(cfg, { success: false, message: 'Enter a valid demo email and password.' }, 401);
            const shortName = email.split('@')[0];
            return respond(cfg, {
                success: true,
                token: `mock.${email}.${Date.now()}`,
                data: {
                    foundUser: {
                        email,
                        fullname: shortName,
                        role: ['admin', 'ap'].includes(shortName) ? 'admin' : 'user',
                    },
                    menuoptionslist: '',
                },
                message: 'Demo login successful',
            });
        }
        case 'post /user/logout':
            return respond(cfg, { success: true, message: 'Demo logout successful' });
        case 'get /searchorders': {
            if (params.menuKey === 'DyeingProgramsPageKey')
                return respond(cfg, { data: data.dyeingPrograms });
            return respond(cfg, data.searchOrders(params.menuKey, Number(params.page ?? 1), params.search ?? ''));
        }
        case 'post /updatedyeingprg':
            return respond(cfg, { message: 'Dyeing program updated', status: 'success' });
        case 'get /gstock':
            return respond(cfg, data.greigeStock);
        case 'get /getYarnStock':
            return respond(cfg, { data: data.yarnStock });
        case 'get /search-recipe':
            return respond(cfg, { data: data.searchRecipes(params.search ?? '') });
        case 'get /griegereqsummary':
            return respond(cfg, data.greqSummary);
        case 'get /griegeissuedsummary':
            return respond(cfg, data.greigeIssuedSummary);
        case 'get /searchjobcard': {
            const card = data.findJobCard(params.jobcard_number);
            return card ? respond(cfg, card) : respond(cfg, { message: `Job card ${params.jobcard_number} not found` }, 404);
        }
        case 'post /update_dyes_chem':
        case 'post /jet_loading':
        case 'post /rope_opener':
        case 'post /heatsetting':
        case 'post /finishing':
            return respond(cfg, { message: `Job card ${body.jobcardno} updated successfully`, status: 'success' });
        case 'get /production_stages':
            return respond(cfg, data.productionStages);
        case 'get /knitting/po-lines':
            return respond(cfg, data.knittingPOLines);
        case 'post /knitting/po/import': {
            const rows = Array.isArray(body.rows) ? body.rows : [];
            let inserted = 0;
            let updated = 0;
            const error_rows = [];
            for (const row of rows) {
                const key = `${row.SOURCE_FILE}|${row.SOURCE_SHEET}|${row.SOURCE_ROW_NUMBER}`;
                const index = data.knittingPOLines.findIndex((line) => `${line.SOURCE_FILE}|${line.SOURCE_SHEET}|${line.SOURCE_ROW_NUMBER}` === key);
                if (index >= 0) {
                    const old = data.knittingPOLines[index];
                    if (old.PO_NUMBER !== row.PO_NUMBER || old.FABRIC_NAME !== row.FABRIC_NAME) {
                        error_rows.push({ SOURCE_ROW_NUMBER: row.SOURCE_ROW_NUMBER, error: 'PO number or fabric changed for this source row; reconcile before updating.' });
                        continue;
                    }
                    data.knittingPOLines[index] = { ...old, ...row };
                    updated++;
                }
                else {
                    data.knittingPOLines.push({ ...row, PO_LINE_ID: `KL-IMPORT-${data.knittingPOLines.length + 1}`, PRODUCED_KGS: 0, KNITTING_STATUS: 'PLANNED', KNITTING_COMPLETED_AT: '', LINKED_JOB_CARDS: [] });
                    inserted++;
                }
            }
            return respond(cfg, { message: 'Demo PO import completed', inserted, updated, error_rows });
        }
        case 'post /knitting/entries': {
            const items = Array.isArray(body.rows) ? body.rows : [body];
            let inserted = 0;
            let updated = 0;
            const error_rows = [];
            for (const item of items) {
                const id = String(item.PO_LINE_ID ?? item.po_line_id ?? '');
                const eventId = String(item.PRODUCTION_EVENT_ID ?? item.production_event_id ?? '');
                const status = String(item.STATUS ?? item.status ?? '').toUpperCase();
                const completedAt = String(item.COMPLETED_AT ?? item.completed_at ?? '');
                const kg = Number(item.PRODUCED_KGS ?? item.produced_kgs ?? 0);
                const line = data.knittingPOLines.find((p) => p.PO_LINE_ID === id);
                if (!line || !eventId || !Number.isFinite(kg) || kg < 0 || (status === 'COMPLETED' && !completedAt)) {
                    error_rows.push({ PO_LINE_ID: id, PRODUCTION_EVENT_ID: eventId, error: 'Invalid production event, unknown line, or missing completion time' });
                    continue;
                }
                const existing = data.knittingEvents.findIndex((event) => event.PRODUCTION_EVENT_ID === eventId);
                if (existing >= 0) {
                    if (data.knittingEvents[existing].PO_LINE_ID !== id) {
                        error_rows.push({ PO_LINE_ID: id, PRODUCTION_EVENT_ID: eventId, error: 'Event ID belongs to another PO line' });
                        continue;
                    }
                    data.knittingEvents[existing] = { ...item, PO_LINE_ID: id, PRODUCTION_EVENT_ID: eventId, PRODUCED_KGS: kg, STATUS: status, COMPLETED_AT: completedAt };
                    updated++;
                }
                else {
                    data.knittingEvents.push({ ...item, PO_LINE_ID: id, PRODUCTION_EVENT_ID: eventId, PRODUCED_KGS: kg, STATUS: status, COMPLETED_AT: completedAt });
                    inserted++;
                }
                // Recalculate from the event collection plus the pre-seeded demo balance.
                const baseQty = id === 'KL-DEMO-001' ? 250 : id === 'KL-DEMO-003' ? 108 : 0;
                line.PRODUCED_KGS = baseQty + data.knittingEvents.filter((event) => event.PO_LINE_ID === id).reduce((sum, event) => sum + Number(event.PRODUCED_KGS ?? 0), 0);
                line.KNITTING_STATUS = status;
                line.KNITTING_COMPLETED_AT = status === 'COMPLETED' ? completedAt : '';
            }
            if (!Array.isArray(body.rows) && error_rows.length)
                return respond(cfg, { message: String(error_rows[0].error) }, 400);
            return respond(cfg, { message: 'Knitting event saved (demo only)', inserted, updated, error_rows });
        }
        case 'post /knitting/jobcards/link': {
            const line = data.knittingPOLines.find((p) => p.PO_LINE_ID === body.po_line_id);
            const card = data.tracker.find((r) => String(r.JOBCARDNO) === String(body.jobcardno) && String(r.ORDERID) === String(body.order_id));
            if (!line || !card)
                return respond(cfg, { message: 'PO line or ERP OrderID/Job Card does not match' }, 400);
            const links = line.LINKED_JOB_CARDS ?? [];
            if (!links.some((r) => String(r.JOBCARDNO) === String(body.jobcardno))) {
                line.LINKED_JOB_CARDS = [...links, { JOBCARDNO: String(body.jobcardno), ORDERID: String(body.order_id), MANUALLOTNO: String(body.manual_lot_no ?? '') }];
            }
            return respond(cfg, { message: 'Job card linked (demo only)' });
        }
        case 'get /vtracker':
            return respond(cfg, data.tracker);
        case 'get /vrecords':
            return respond(cfg, data.records);
        case 'get /lud':
            return respond(cfg, data.lud);
        case 'post /generate_qr':
            return respond(cfg, qrSvg(String(body.data ?? '')));
        case 'post /flush_cache':
            return respond(cfg, { message: 'Cache cleared' });
        case 'get /greigestock':
            return respond(cfg, data.fabricMappings);
        case 'get /greigeslist':
            return respond(cfg, data.erpNames);
        case 'post /greigestock':
            return respond(cfg, { message: 'Mapping saved' });
        case 'post /uploadgreq': {
            const rows = body.rows ?? [];
            return respond(cfg, { status: 'success', success_rows: rows.length, error_rows: [] });
        }
        case 'post /uploadgreigestock': {
            const rows = body.rows ?? [];
            return respond(cfg, { status: 'success', message: 'Greige stock uploaded', success_rows: rows.length, success_count: rows.length, error_rows: [] });
        }
        case 'post /insertJobCards':
        case 'post /insertDispatch': {
            const rows = body.rows ?? [];
            const over = Math.floor(rows.length * 0.2);
            return respond(cfg, { fresh_inserted: rows.length - over, over_written: over, ignored_rows: 0 });
        }
        case 'post /insertYarnStock': {
            const rows = body.rows ?? [];
            return respond(cfg, { rows_inserted: rows.length });
        }
        case 'post /upload-recipe':
            return respond(cfg, { message: 'Recipes uploaded' });
        case 'post /upload_orders':
        case 'post /upload_closed_djc':
            return respond(cfg, { message: 'Upload successful', Overwritten: 42, 'Fresh Written': 118 });
        default:
            return respond(cfg, { message: `Mock endpoint not implemented: ${method.toUpperCase()} ${url}` }, 404);
    }
};
