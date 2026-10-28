import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { greigeStockService } from '@/services/greige-stock.service';
import { errorMessage } from '@/services/http/client';
import { formatDate, formatNumber, toNumber } from '@/utils/format';
import { DataTable } from '@/components/ui/data-table';
import { Select } from '@/components/ui/field';
import { PageHeader, Stat } from '@/components/ui/panel';

// Columns preserve the original U-1 ERP stock ledger, not a made-up flat table.
const qtyColumn = (key, label) => ({key,label,align:'right',render:(r)=>formatNumber(key.split('.').reduce((v,k)=>v?.[k],r)),sortValue:(r)=>toNumber(key.split('.').reduce((v,k)=>v?.[k],r))});
const u3Columns = [
  {key:'itemName',label:'Item Name',render:r=><span className="font-medium">{r.itemName}</span>},
  {key:'uom',label:'UOM'},
  qtyColumn('opening.qty','Opening Qty'),qtyColumn('opening.qtyKgs','Opening Qty Kgs'),
  qtyColumn('receipt.qty','Receipt Qty'),qtyColumn('receipt.qtyKgs','Receipt Qty Kgs'),
  qtyColumn('issue.qty','Issue Qty'),qtyColumn('issue.qtyKgs','Issue Qty Kgs'),
  qtyColumn('closing.qty','Closing Qty'),qtyColumn('closing.qtyKgs','Closing Qty Kgs'),
  {key:'lastReceived.date',label:'Last Received Date',render:r=>r.lastReceived?.date?formatDate(r.lastReceived.date,true):'—'},
  qtyColumn('lastReceived.qtyKgs','Last Received Qty Kgs'),
  {key:'lastIssue.date',label:'Last Issue Date',render:r=>r.lastIssue?.date?formatDate(r.lastIssue.date,true):'—'},
  qtyColumn('lastIssue.qtyKgs','Last Issue Qty Kgs'),
];
const u2Columns = [
  {key:'fabricName',label:'Fabric Name',render:r=><span className="font-medium">{r.fabricName}</span>},
  qtyColumn('currentStock','Current Stock'),
  {key:'updatedAt',label:'Imported At',render:r=>r.updatedAt?formatDate(r.updatedAt,true):'—'},
];
export default function GreigeStockPage() {
  const [unit,setUnit]=useState('u2');
  const query=useQuery({queryKey:['greige-stock',unit],queryFn:()=>unit==='u3'?greigeStockService.fetchAllU3():greigeStockService.fetchAllU2(),staleTime:30000,retry:1});
  const rows=query.data??[];
  const values=rows.map(r=>unit==='u3'?r.closing?.qtyKgs:r.currentStock).filter(value=>value!=null && value!=='').map(toNumber);
  const total=values.reduce((a,b)=>a+b,0);
  const label=unit==='u3'?'Closing stock (KG)':'Total reported stock';
  return <div className="flex min-w-0 flex-col gap-4">
    <PageHeader title="Greige Stock" description={unit==='u3'?'ERP U-1 stock ledger (shown in NathColor as U-3; confirm physical unit mapping). Original A–N ledger fields and precise KG values.':'Unit-2 greige stock report: Fabric Name and Current Stock. The source report does not explicitly specify the stock UOM.'}/>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Stat label={label} value={query.isPending||query.isError?'—':formatNumber(total,unit==='u3'?2:0)} tone="primary"/>
      <Stat label="Qualities" value={query.isPending||query.isError?'—':rows.length}/>
      <Stat label="Out of Stock" value={query.isPending||query.isError?'—':values.filter(v=>v<=0).length} tone="accent"/>
      <Stat label={unit==='u3'?'Below 500 KG':'Below 500 (reported unit)'} value={query.isPending||query.isError?'—':values.filter(v=>v>0&&v<500).length}/>
    </div>
    <DataTable title="Greige stock records" key={unit} rows={rows} columns={unit==='u3'?u3Columns:u2Columns} isLoading={query.isPending} error={query.isError?errorMessage(query.error):null} onRetry={()=>query.refetch()} exportName={`greige-stock-${unit}`} emptyTitle="No stock data imported" emptyDescription="Upload the latest ERP stock report in ERP Imports, then refresh this page." toolbar={<>
      <label htmlFor="greige-unit" className="sr-only">Select stock unit</label>
      <Select id="greige-unit" value={unit} onChange={e=>setUnit(e.target.value)} className="h-9 w-full sm:w-44">
        <option value="u2">Unit-2 Greige</option><option value="u3">U-3 (ERP U-1)</option>
      </Select>
    </>}/>
  </div>;
}
