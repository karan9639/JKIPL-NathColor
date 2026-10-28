// Every route here targets the Express API in this package.
// Stock U-3 must be verified against the ERP U-1 label before combining physical locations.
export const IMPORTS = {
  "dyeing-programs": {
    title: "Import Dyeing Programs",
    description:
      "Upload the Dyeing Schedules Status Report (.xlsx) or paste the Excel table, including headers.",
    source: "xlsx",
    allowPaste: true,
    backend: "dyeing",
    accept: ".html,.htm,.xls,.xlsx",
    chunkSize: 100,
  },
  "job-cards-opening": {
    title: "Import Job Cards Opening",
    description: "Upload the ERP Open Job Cards report (.html, .htm, .xls or .xlsx).",
    source: "html",
    endpoint: "/insertJobCards",
    accept: ".html,.htm,.xls,.xlsx",
    chunkSize: 500,
  },
  "job-cards-closing": {
    title: "Import Job Cards Closing",
    description: "Upload the ERP Closed Job Cards report (.html, .htm, .xls or .xlsx).",
    source: "html",
    endpoint: "/insertClosedJobCards",
    accept: ".html,.htm,.xls,.xlsx",
    chunkSize: 300,
  },
  "greige-stock-u2": {
    title: "Import Greige Stock U-2",
    description:
      "Paste Unit-2 stock data or upload an Excel workbook (Fabric Name, Current Stock).",
    source: "paste",
    allowFile: true,
    backend: "greige-u2",
    accept: ".html,.htm,.xls,.xlsx",
    extra: { unit: "U-2" },
  },
  "greige-stock-u3": {
    title: "Import Greige Stock U-3 (ERP U-1)",
    description:
      "Upload the stock ledger. Supplied ERP report header says U-1; confirm physical unit mapping before operational use.",
    source: "xlsx",
    backend: "greige-u3",
    accept: ".html,.htm,.xls,.xlsx",
    extra: { unit: "U-3" },
  },
  "yarn-stock": {
    title: "Import Yarn Stock",
    description: "Upload the Item Wise Stock report (.html, .htm, .xls or .xlsx).",
    source: "html",
    backend: "yarn",
    accept: ".html,.htm,.xls,.xlsx",
    chunkSize: 2000,
  },
  dispatch: {
    title: "Import Dispatch / Billing",
    description: "Upload the ERP Dispatch Details report (.html, .htm, .xls or .xlsx). Multiple items per invoice are preserved.",
    source: "html",
    endpoint: "/insertDispatch",
    accept: ".html,.htm,.xls,.xlsx",
    chunkSize: 300,
  },
  "orders-book": {
    title: "Import Orders Book",
    description: "Upload the Order Book export (.html, .htm, .xls or .xlsx).",
    source: "orderbook",
    backend: "orderbook",
    accept: ".html,.htm,.xls,.xlsx",
    chunkSize: 100,
  },
  recipes: {
    title: "Import Recipes",
    description:
      "Upload ERP Dyed and Chemical Details or legacy MIX recipe report. The matching worksheet is detected by headers.",
    source: "xlsx",
    endpoint: "/upload-recipe",
    accept: ".html,.htm,.xls,.xlsx",
    sheet: "MIX",
    chunkSize: 250,
  },
  "knitting-po-planning": {
    title: "Import Knitting PO Planner",
    description:
      "Upload the Unit-3 consolidated PO sheet. CLOSED in its REMARKS column is the authoritative planner-closure status; no separate knitting-completion upload is required.",
    source: "xlsx",
    endpoint: "/knitting/po/import",
    accept: ".html,.htm,.xls,.xlsx",
    sheet: "PO",
    requiredSheet: true,
    knittingFormat: "planning",
    chunkSize: 200,
  },
};
