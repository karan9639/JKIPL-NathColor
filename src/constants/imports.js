// Routes verified against Nathcolor-Backend(1).zip use backend: dyeing | yarn.
// All other URLs are the original frontend's legacy integration contract;
// matching routes are NOT included in that backend ZIP and must be supplied
// by the existing legacy API before those imports can succeed.
export const IMPORTS = {
    'dyeing-programs': { title: 'Import Dyeing Programs', description: 'Upload the Dyeing Schedules Status Report (.xlsx) or paste the Excel table, including headers.', source: 'xlsx', allowPaste: true, backend: 'dyeing', accept: '.xlsx,.xls', chunkSize: 100 },
    'job-cards-opening': { title: 'Import Job Cards Opening', description: 'Upload the job card HTML export from the ERP.', source: 'html', endpoint: '/insertJobCards', accept: '.html,.htm,.xls', chunkSize: 500 },
    'job-cards-closing': { title: 'Import Job Cards Closing', description: 'Upload the closed job cards export. The file is compressed before upload.', source: 'zip', endpoint: '/upload_closed_djc', accept: '.html,.htm,.xls,.xlsx' },
    'greige-stock-u2': { title: 'Import Greige Stock U-2', description: 'Paste Unit-2 stock data or upload an Excel workbook (Fabric Name, Current Stock).', source: 'paste', allowFile: true, backend: 'greige-u2', accept: '.xlsx,.xls', extra: { unit: 'U-2' } },
    'greige-stock-u3': { title: 'Import Greige Stock U-3', description: 'Upload the Unit-3 greige stock workbook.', source: 'xlsx', backend: 'greige-u3', accept: '.xlsx,.xls', extra: { unit: 'U-3' } },
    'yarn-stock': { title: 'Import Yarn Stock', description: 'Upload the Item Wise Stock HTML report. The report period is required by the backend.', source: 'html', backend: 'yarn', accept: '.html,.htm', chunkSize: 100 },
    dispatch: { title: 'Import Dispatch / Billing', description: 'Upload the dispatch register HTML export from the ERP.', source: 'html', endpoint: '/insertDispatch', accept: '.html,.htm,.xls', chunkSize: 500 },
    'orders-book': { title: 'Import Orders Book', description: 'Upload the Order Book export (.html, .htm, .xls or .xlsx). The file is previewed and its rows are sent to the Order Book API.', source: 'orderbook', backend: 'orderbook', accept: '.html,.htm,.xls,.xlsx', chunkSize: 100 },
    recipes: { title: 'Import Recipes', description: 'Upload the recipe workbook. Rows are read from the MIX sheet.', source: 'xlsx', endpoint: '/upload-recipe', accept: '.xlsx,.xls', sheet: 'MIX' },
    'knitting-po-planning': { title: 'Import Knitting PO Planner', description: 'Upload UNIT-3 PLANNER 2026 or another workbook with the consolidated PO sheet. This is planning data, not proof of knitting completion.', source: 'xlsx', endpoint: '/knitting/po/import', accept: '.xlsx,.xls', sheet: 'PO', requiredSheet: true, knittingFormat: 'planning', chunkSize: 200 },
    'knitting-completion': { title: 'Import Knitting Completion', description: 'Upload actual production events using PO_LINE_ID and unique PRODUCTION_EVENT_ID. Reimporting the same event ID must not double-count KG.', source: 'xlsx', endpoint: '/knitting/entries', accept: '.xlsx,.xls', sheet: 'KNITTING_COMPLETION', requiredSheet: true, knittingFormat: 'completion', chunkSize: 200 },
};
