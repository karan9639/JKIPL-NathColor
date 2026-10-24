import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { orderTrackerPath } from '@/utils/order-tracker';
import { Dialog } from '@/components/ui/dialog';
import { ordersService } from '@/services/orders.service';
import { errorMessage } from '@/services/http/client';
import { formatCell, formatDate, formatNumber, humanizeKey, pickString } from '@/utils/format';

function ItemsTable({ title, rows, fields }) {
  if (!rows?.length) return null;
  return <section className="mt-5"><h3 className="mb-2 text-sm font-semibold">{title} ({rows.length})</h3>
    <div className="max-h-60 overflow-auto rounded-md border border-border"><table className="w-full text-sm"><thead className="sticky top-0 bg-muted"><tr>
      {fields.map(([label]) => <th key={label} className="whitespace-nowrap px-3 py-2 text-left text-xs">{label}</th>)}
    </tr></thead><tbody>{rows.map((row, i) => <tr className="border-t border-border" key={row._id || i}>{fields.map(([label, render]) => <td key={label} className="whitespace-nowrap px-3 py-2">{render(row)}</td>)}</tr>)}</tbody></table></div>
  </section>;
}
const display = (v) => formatCell(v);
const qty = (v, uom) => v == null ? 'Not imported' : `${formatNumber(v, 3)} ${uom || ''}`.trim();
const orderFields = [
  ['Customer','customerName'],['Brand','brandName'],['Customer PO','refPO'],['Order date','receivedDate'],
  ['Fabric / item','itemName'],['Upper fabric','upperFabricName'],['Colour','upperColor'],['Width','width'],
  ['UOM','uom'],['Store category (not production status)','storeType'],
];

/** Read the same camelCase MongoDB records used by All Orders. No invented quantities. */
export function OrderDetailDialog({ order, onClose }) {
  const orderId = pickString(order,'orderId','ORDERID','ORDERNUMBER');
  const detail = useQuery({
    queryKey: ['order-summary', orderId], enabled: Boolean(orderId),
    queryFn: () => ordersService.fetchOrderSummary(orderId), staleTime: 30_000, retry: 1,
  });
  const info = detail.data;
  const orders = info?.orders?.length ? info.orders : order ? [order] : [];
  const first = orders[0] || {};
  const orderedByUom = info?.summary?.orderedByUom || orders.reduce((map, o) => {
    const unit = String(o.uom || 'UNSPECIFIED').trim().toUpperCase();
    if (o.quantity != null && o.quantity !== '') map[unit] = (map[unit] || 0) + (Number(o.quantity) || 0); return map;
  }, {});
  return <Dialog open={!!order} onOpenChange={open => !open && onClose()} title={`ERP Order ${orderId || '—'}`} description="Imported order facts and linked ERP records" className="max-w-4xl">
    {!!order && <div className="min-w-0 pb-3">
      <dl className="grid grid-cols-1 gap-x-4 gap-y-3 text-sm min-[400px]:grid-cols-2 lg:grid-cols-4">
        {orderFields.map(([label,key]) => <div key={key} className="min-w-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="break-words font-medium">{key==='receivedDate'&&first[key] ? formatDate(first[key]) : display(first[key])}</dd></div>)}
      </dl>
      <div className="mt-4 rounded-md border border-border p-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ordered quantity by actual ERP UOM</h3>
        <div className="mt-2 flex flex-wrap gap-4">{!Object.keys(orderedByUom).length && <span className="text-sm text-muted-foreground">Quantity not imported</span>}{Object.entries(orderedByUom).map(([unit,value]) => <div key={unit}><strong className="text-lg tabular-nums">{qty(value,unit)}</strong></div>)}</div>
        <p className="mt-1 text-xs text-muted-foreground">No KG/MTR/LB conversion or dispatch balance is assumed.</p>
      </div>
      {detail.isPending && <p className="mt-4 text-sm text-muted-foreground">Loading linked dyeing/job-card records…</p>}
      {detail.isError && <p role="alert" className="mt-4 text-sm text-red-700">Order detail unavailable: {errorMessage(detail.error)}. Showing the imported order row only.</p>}
      {!!info && <>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ['Scheduled', qty(info.summary?.scheduledKg,'KG')],
            ['Job-carded', qty(info.summary?.jobCardAllocatedKg,'KG')],
            ['Schedule remainder', qty(info.summary?.scheduleRemainderKg,'KG')],
            ['Greige issued', 'Not verified'],
          ].map(([label,value]) => <div key={label} className="rounded-md border border-border p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div>)}
        </div>
        <ItemsTable title="Order book lines" rows={orders} fields={[
          ['Item',r=>display(r.itemName)],['Quantity',r=>qty(r.quantity,r.uom)],['PO',r=>display(r.refPO)],['Delivery',r=>r.deliveryDate?formatDate(r.deliveryDate):'—']
        ]}/>
        <ItemsTable title="Dyeing schedules" rows={info.schedules} fields={[
          ['Schedule',r=>display(r.dyeingScheduleNo)],['Fabric',r=>display(r.itemName)],['Colour',r=>display(r.color)],['Quantity',r=>qty(r.quantityKgs,'KG')],['Job card',r=>display(r.jobCardNo)]
        ]}/>
        <ItemsTable title="Open job-card allocations" rows={info.jobCards} fields={[
          ['Job card',r=>display(r.jobCardNo)],['Lot',r=>display(r.manualLotNo)],['Quantity',r=>qty(r.kgs,'KG')],['Opened',r=>r.jobCardDate?formatDate(r.jobCardDate):'—']
        ]}/>
        <ItemsTable title="Dispatch import entries" rows={info.dispatches} fields={[
          ['Job card',r=>display(r.jobCardNo)],['Quantity',r=>qty(r.quantity,r.uom)],['Invoice date',r=>r.invoiceDate?formatDate(r.invoiceDate):'—']
        ]}/>
        <p className="mt-3 text-xs text-muted-foreground">Closing, finished output and dispatched balance remain unverified until correctly mapped ERP exports exist. Job-carded KG is not produced KG.</p>
      </>}
      <Link onClick={onClose} to={orderTrackerPath(orderId)} className="mt-4 inline-flex rounded-md bg-primary px-3 py-2 text-sm font-medium text-white">View this order / lot tracker →</Link>
    </div>}
  </Dialog>;
}
