import { Dialog } from '@/components/ui/dialog';
import { formatCell, formatNumber, humanizeKey, pickString } from '@/utils/format';
const SUMMARY_KEYS = [
    ['Customer', 'CUSTOMERNAME'],
    ['Brand', 'BRANDNAME'],
    ['PO', 'REFPO'],
    ['Order date', 'ORD_DATE'],
    ['Fabric', 'UPPERFABRICNAME'],
    ['Color', 'UPPERCOLOR'],
    ['Width', 'WIDTH'],
    ['Status', 'STATUS'],
];
const QTY_KEYS = [
    ['Ordered', 'ORD_QTY'],
    ['Requisitioned', 'REQ_KGS'],
    ['Greige issued', 'GREIGE_ISSUED_KGS'],
    ['Closed', 'CLOSED_KGS'],
    ['Dispatched', 'Total_Dispatched'],
    ['Balance', 'BALKGS'],
];
function SubTable({ title, rows }) {
    if (!rows.length)
        return null;
    const keys = Object.keys(rows[0]);
    return (<div className="mt-5">
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              {keys.map((k) => (<th key={k} scope="col" className="px-3 py-1.5 text-left text-xs font-semibold whitespace-nowrap text-muted-foreground">
                  {humanizeKey(k)}
                </th>))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (<tr key={i} className="border-t border-border">
                {keys.map((k) => (<td key={k} className="tabular px-3 py-1.5 whitespace-nowrap">
                    {formatCell(r[k])}
                  </td>))}
              </tr>))}
          </tbody>
        </table>
      </div>
    </div>);
}
export function OrderDetailDialog({ order, onClose }) {
    const issues = Array.isArray(order?.ISSUES) ? order.ISSUES : [];
    const dispatch = Array.isArray(order?.Dispatch) ? order.Dispatch : [];
    return (<Dialog open={!!order} onOpenChange={(o) => !o && onClose()} title={`Order ${pickString(order, 'ORDERNUMBER', 'ORDERID')}`} description={pickString(order, 'CUSTOMERNAME')} className="max-w-2xl">
      {order && (<>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
            {SUMMARY_KEYS.map(([label, key]) => (<div key={key} className="min-w-0">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="truncate font-medium">{formatCell(order[key])}</dd>
              </div>))}
          </dl>
          <dl className="mt-5 grid grid-cols-3 gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-6">
            {QTY_KEYS.map(([label, key]) => (<div key={key} className="bg-surface px-3 py-2">
                <dt className="text-[11px] text-muted-foreground">{label}</dt>
                <dd className="tabular text-sm font-semibold">{formatNumber(order[key])}</dd>
              </div>))}
          </dl>
          {pickString(order, 'GREMARKS') && (<p className="mt-4 rounded-md bg-accent-soft px-3 py-2 text-sm text-accent">Remarks: {pickString(order, 'GREMARKS')}</p>)}
          <SubTable title="Lots issued" rows={issues}/>
          <SubTable title="Dispatches" rows={dispatch}/>
        </>)}
    </Dialog>);
}
