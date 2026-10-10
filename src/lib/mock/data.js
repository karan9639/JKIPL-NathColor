const customers = ['RAYMOND APPAREL', 'ARVIND FASHIONS', 'PAGE INDUSTRIES', 'SHAHI EXPORTS', 'TRENT LTD', 'ADITYA BIRLA FASHION', 'MONTE CARLO', 'KITEX GARMENTS'];
const brands = ['VAN HEUSEN', 'JOCKEY', 'US POLO', 'ALLEN SOLLY', 'PETER ENGLAND', 'WESTSIDE', '', ''];
const fabrics = ['COTTON SINGLE JERSEY 30S', 'COTTON PIQUE 24S', 'POLY COTTON INTERLOCK', 'LYCRA RIB 2X1', 'FLEECE 3 THREAD', 'MODAL JERSEY 40S', 'DRY FIT MESH', 'TERRY LOOPKNIT'];
const colors = ['NAVY BLUE', 'BLACK', 'WHITE', 'MAROON', 'BOTTLE GREEN', 'GREY MELANGE', 'ROYAL BLUE', 'OLIVE', 'SKY BLUE', 'RED'];
const statuses = ['PENDING', 'PARTIAL', 'ISSUED', 'COMPLETED'];
let seed = 42;
const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
};
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const int = (min, max) => Math.floor(min + rand() * (max - min + 1));
const today = new Date();
const dayOffset = (n) => {
    const d = new Date(today);
    d.setDate(d.getDate() - n);
    return d;
};
const iso = (d) => d.toISOString().slice(0, 10);
const dmy = (d) => `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
const stamp = (d, h = int(7, 20), m = int(0, 59)) => `${iso(d)} ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
const orders = Array.from({ length: 140 }, (_, i) => {
    const qty = int(200, 4000);
    const reqKgs = int(100, Math.floor(qty * 0.9));
    const issued = Math.max(0, reqKgs - int(0, reqKgs));
    const dispatched = Math.floor(issued * rand());
    const brand = pick(brands);
    return {
        ORDERID: 24000 + i,
        ORDERNUMBER: `JK/${today.getFullYear()}/${String(1100 + i)}`,
        ORD_DATE: dmy(dayOffset(int(5, 120))),
        CUSTOMERNAME: pick(customers),
        BRANDNAME: brand,
        REFPO: `PO-${int(10000, 99999)}`,
        UPPERFABRICNAME: pick(fabrics),
        UPPERCOLOR: pick(colors),
        WIDTH: pick([30, 34, 36, 40, 72]),
        ORD_QTY: qty,
        KGS: qty,
        BALKGS: qty - dispatched,
        BALMTR: Math.round((qty - dispatched) * 3.1),
        REQ_KGS: reqKgs,
        GREIGE_ISSUED_KGS: issued,
        CLOSED_KGS: Math.floor(issued * 0.7),
        Total_Dispatched: dispatched,
        GREQ_DATE: dmy(dayOffset(int(0, 40))),
        GPRIORITY: int(1, 5),
        GREMARKS: pick(['URGENT', '', 'HOLD FOR LAB DIP', '', 'SHIP BY MONTH END']),
        STATUS: pick(statuses),
        ISSUES: Array.from({ length: int(0, 3) }, (_, j) => ({
            LOT_NO: `L${int(1000, 9999)}`,
            KGS_Issued: int(50, 600),
            ISSUE_DATE: dmy(dayOffset(int(0, 30))),
            REMARKS: j === 0 ? 'FIRST LOT' : '',
        })),
        Dispatch: Array.from({ length: int(0, 2) }, () => ({
            Invoice_No: `INV-${int(5000, 9999)}`,
            Invoice_Date: dmy(dayOffset(int(0, 20))),
            Despatch_Qty: int(50, 500),
        })),
    };
});
export function searchOrders(menuKey, page, search) {
    let rows = orders;
    if (menuKey === 'DomesticPendingOrdersPageKey')
        rows = rows.filter((r) => !r.BRANDNAME && Number(r.BALKGS) > 0);
    if (menuKey === 'BrandsPendingOrdersPageKey')
        rows = rows.filter((r) => r.BRANDNAME && Number(r.BALKGS) > 0);
    if (search) {
        const words = search.toUpperCase().split(' ').filter(Boolean);
        rows = rows.filter((r) => {
            const hay = Object.values(r).filter((v) => typeof v !== 'object').join(' ').toUpperCase();
            return words.every((w) => hay.includes(w));
        });
    }
    const pageSize = 30;
    const slice = rows.slice((page - 1) * pageSize, page * pageSize);
    return {
        data: slice,
        totalPending: rows.reduce((s, r) => s + Number(r.BALKGS), 0),
        totalMtr: rows.reduce((s, r) => s + Number(r.BALMTR), 0),
    };
}
export const dyeingPrograms = orders.filter((r) => Number(r.REQ_KGS) > 0).slice(0, 60);
export const greigeStock = fabrics.flatMap((f, i) => ['', ' (U-3)'].map((suffix, j) => ({
    FABRICNAME: f + suffix,
    STOCK: int(0, 9000),
    LRD: dmy(dayOffset(int(0, 10))),
    LRQ: int(100, 1500),
    LID: dmy(dayOffset(int(0, 6))),
    LIQ: int(50, 900),
    LUD: stamp(dayOffset(i % 3 === 0 && j ? 3 : 0)),
})));
export const yarnStock = ['30S COMBED COTTON', '24S CARDED COTTON', '40S COMPACT', '150D POLYESTER', '40D SPANDEX', '20S MELANGE GREY', '30S MODAL', '2/40 VISCOSE'].map((name) => ({
    ItenName: name,
    ClosingStock: int(200, 15000),
    LRD: dmy(dayOffset(int(0, 15))),
    LRQ: int(500, 3000),
    LID: dmy(dayOffset(int(0, 7))),
    LIQ: int(100, 1200),
    LUD: stamp(dayOffset(0)),
}));
const recipes = Array.from({ length: 80 }, (_, i) => ({
    REGNO: 5000 + i,
    Year: pick([2023, 2024, 2025, 2026]),
    PAGENO: int(1, 400),
    PARTY: pick(customers),
    QUALITY: pick(fabrics),
    SHADE: pick(colors),
    COLOR1: pick(['REMAZOL RED RB', 'NOVACRON NAVY', 'LEVAFIX YELLOW', 'DRIMAREN BLACK']),
    C1PER: (rand() * 3).toFixed(3),
    C1REM: '',
    COLOR2: pick(['REMAZOL YELLOW', 'NOVACRON BLUE', '']),
    C2PER: (rand() * 1.5).toFixed(3),
    C2REM: '',
    COLOR3: pick(['TURQ BLUE G', '', '']),
    C3PER: (rand() * 0.5).toFixed(3),
    C3REM: '',
    COLOR4: '',
    C4PER: '',
    C4REM: '',
    STATUS: pick(['APPROVED', 'APPROVED', 'TRIAL']),
}));
export function searchRecipes(q) {
    const words = q.toUpperCase().split(/\s+/).filter(Boolean);
    return recipes.filter((r) => {
        const hay = Object.values(r).join(' ').toUpperCase();
        return words.every((w) => hay.includes(w));
    });
}
export const greqSummary = Array.from({ length: 21 }, (_, i) => ({
    REQ_DATE: dmy(dayOffset(i)),
    NOS: int(4, 40),
    TONS: (rand() * 18 + 2).toFixed(2),
}));
export const greigeIssuedSummary = Array.from({ length: 21 }, (_, i) => ({
    JOBCARDDATE: dmy(dayOffset(i)),
    LOTS: int(10, 70),
    TONS: (rand() * 22 + 3).toFixed(2),
    ISSUEDBY: pick(['ANKUSH', 'BHARAT', 'SUNIL', 'SHUBHAM']),
}));
const jobCards = Array.from({ length: 60 }, (_, i) => {
    const base = dayOffset(int(0, 12));
    const stage = int(0, 5);
    return {
        JOBCARDNO: 81000 + i,
        MANUALLOTNO: `ML-${int(100, 999)}`,
        JOBCARDDATE: iso(base),
        JOBCARDTIME: `${String(int(7, 20)).padStart(2, '0')}:${String(int(0, 59)).padStart(2, '0')}`,
        CUSTOMERNAME: pick(customers),
        ITEMNAME: pick(fabrics),
        COLOR: pick(colors),
        KGS: int(80, 650),
        JETNO: int(1, 30),
        RECIPEDATE: stage >= 1 ? stamp(base) : '',
        DYESCHEMISSUEDATE: stage >= 1 ? stamp(base) : '',
        JETLOADINGDATE: stage >= 2 ? stamp(dayOffset(Math.max(0, int(0, 3)))) : '',
        JETLOADING_MACHINE: stage >= 2 ? `JET-${int(1, 30)}` : '',
        HEATSETTINGDATE: stage >= 3 ? stamp(dayOffset(int(0, 2))) : '',
        HEATSETTING_MACHINE: stage >= 3 ? `ST-${int(1, 4)}` : '',
        FINISHINGDATE: stage >= 4 ? stamp(dayOffset(int(0, 1))) : '',
        FINISHING_MACHINE: stage >= 4 ? `ST-${int(1, 4)}` : '',
        JOBCARDCLOSEDDATE: stage >= 5 ? iso(dayOffset(0)) : '',
        JOBCARDCLOSEDTIME: stage >= 5 ? '18:20' : '',
        INVOICE_DATE: stage >= 5 && rand() > 0.5 ? iso(dayOffset(0)) : '',
    };
});
export function findJobCard(no) {
    return jobCards.find((j) => String(j.JOBCARDNO) === String(no).trim()) ?? null;
}
export const productionStages = jobCards
    .filter((j) => !j.JOBCARDCLOSEDDATE)
    .map((j) => ({
    JOBCARDNO: j.JOBCARDNO,
    JOBCARDDATE: j.JOBCARDDATE,
    JOBCARDTIME: j.JOBCARDTIME,
    CUSTOMERNAME: j.CUSTOMERNAME,
    ITEMNAME: j.ITEMNAME,
    COLOR: j.COLOR,
    KGS: j.KGS,
    DYESCHEMISSUEDATE: j.DYESCHEMISSUEDATE,
    JETLOADING_DATE: j.JETLOADINGDATE,
    JETLOADING_MACHINE: j.JETLOADING_MACHINE,
    HEATSETTING_DATE: j.HEATSETTINGDATE,
    HEATSETTING_MACHINE: j.HEATSETTING_MACHINE,
    FINISHING_DATE: j.FINISHINGDATE,
    FINISHING_MACHINE: j.FINISHING_MACHINE,
}));
export const tracker = jobCards.map((j) => ({
    ORDERID: j.ORDERID,
    JOBCARDNO: j.JOBCARDNO,
    MANUALLOTNO: j.MANUALLOTNO,
    JETNO: j.JETNO,
    JOBCARDDATE: j.JOBCARDDATE,
    JOBCARDTIME: j.JOBCARDTIME,
    RECIPEDATE: j.RECIPEDATE,
    DYESCHEMISSUEDATE: j.DYESCHEMISSUEDATE,
    JETLOADINGDATE: j.JETLOADINGDATE,
    HEATSETTINGDATE: j.HEATSETTINGDATE,
    FINISHINGDATE: j.FINISHINGDATE,
    JOBCARDCLOSEDDATE: j.JOBCARDCLOSEDDATE,
    JOBCARDCLOSEDTIME: j.JOBCARDCLOSEDTIME,
    INVOICE_DATE: j.INVOICE_DATE,
}));
// Mock-only sample PO lines; not real manufacturing or planner completion data.
export const knittingPOLines = [
  { PO_LINE_ID: 'KL-DEMO-001', PO_NUMBER: 'PO-DEMO-001', PO_DATE: iso(dayOffset(9)), FABRIC_NAME: 'DEMO SPACER FABRIC', REQUIRED_KGS: 520, PLANNED_KGS: 540, PRODUCED_KGS: 250, PLANNED_MACHINE: '4', EXPECTED_DELIVERY_DATE: iso(dayOffset(1)), KNITTING_STATUS: 'PARTIAL', KNITTING_COMPLETED_AT: '', LINKED_JOB_CARDS: [{ JOBCARDNO: String(tracker[0].JOBCARDNO), ORDERID: String(tracker[0].ORDERID) }] },
  { PO_LINE_ID: 'KL-DEMO-002', PO_NUMBER: 'PO-DEMO-002', PO_DATE: iso(dayOffset(6)), FABRIC_NAME: 'DEMO MESH FABRIC', REQUIRED_KGS: 300, PLANNED_KGS: 324, PRODUCED_KGS: 0, PLANNED_MACHINE: '17', EXPECTED_DELIVERY_DATE: iso(dayOffset(-1)), KNITTING_STATUS: 'PLANNED', KNITTING_COMPLETED_AT: '', LINKED_JOB_CARDS: [] },
  { PO_LINE_ID: 'KL-DEMO-003', PO_NUMBER: 'PO-DEMO-003', PO_DATE: iso(dayOffset(12)), FABRIC_NAME: 'DEMO TRICOT FABRIC', REQUIRED_KGS: 100, PLANNED_KGS: 108, PRODUCED_KGS: 108, PLANNED_MACHINE: '22', EXPECTED_DELIVERY_DATE: iso(dayOffset(2)), KNITTING_STATUS: 'COMPLETED', KNITTING_COMPLETED_AT: stamp(dayOffset(4)), LINKED_JOB_CARDS: [{ JOBCARDNO: String(tracker[1].JOBCARDNO), ORDERID: String(tracker[1].ORDERID) }] },
]

export const knittingEvents = []

export const records = Array.from({ length: 14 }, (_, i) => ({
    Date: iso(dayOffset(i)),
    GREQ: int(5, 40),
    JobCards: int(20, 70),
    Recipe: int(15, 60),
    Dyes: int(15, 60),
    Jet: int(15, 60),
    HeatS: int(10, 50),
    Finish: int(10, 55),
}));
export const lud = [
    { Report: 'ORDERS BOOK', LUD: stamp(dayOffset(0), 9, 12), USERNAME: 'PRASHANT', REMARKS: '' },
    { Report: 'DYEING JOB CARDS', LUD: stamp(dayOffset(0), 11, 40), USERNAME: 'SHUBHAM', REMARKS: '' },
    { Report: 'CLOSED JOB CARDS', LUD: stamp(dayOffset(1), 18, 5), USERNAME: 'PRABHAKAR', REMARKS: '' },
    { Report: 'GREIGE STOCK U-2', LUD: stamp(dayOffset(0), 10, 2), USERNAME: 'ANKUSH', REMARKS: '' },
    { Report: 'GREIGE STOCK U-3', LUD: stamp(dayOffset(3), 16, 30), USERNAME: 'GAGAN', REMARKS: 'WEEKLY' },
    { Report: 'YARN STOCK', LUD: stamp(dayOffset(0), 8, 55), USERNAME: 'RAJEEV', REMARKS: '' },
    { Report: 'DISPATCH', LUD: stamp(dayOffset(2), 19, 10), USERNAME: 'MUKESHK', REMARKS: '' },
    { Report: 'GREIGE REQUISITION', LUD: stamp(dayOffset(0), 12, 25), USERNAME: 'DILIP', REMARKS: '' },
];
export const erpNames = fabrics.map((f) => `${f} - ERP`);
export const fabricMappings = fabrics.slice(0, 5).map((f) => ({ FabricName: f, ERP_Name: `${f} - ERP` }));
