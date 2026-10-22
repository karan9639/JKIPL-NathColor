import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { http, errorMessage } from '@/services/http/client';
import { PageHeader, Panel, PanelHeader, ErrorState, EmptyState } from '@/components/ui/panel';
import { Field, Input } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { formatDate, formatNumber } from '@/utils/format';
const fields=['dyes','jet','rope','heat','finish'];
export default function OrderTrackerPage(){
 const [params] = useSearchParams();
 const [draft,setDraft]=useState(() => params.get('orderId') || ''),[orderId,setOrderId]=useState(() => params.get('orderId') || '');
 useEffect(() => { const requested = params.get('orderId') || ''; if(requested){ setDraft(requested);setOrderId(requested); } }, [params]);
 const query=useQuery({queryKey:['order-tracker',orderId],enabled:!!orderId,queryFn:async()=>{
  const res=await http.get(`/orders/${encodeURIComponent(orderId)}/tracker`);return res.data?.data;
 }});
 const info=query.data;
 return <>
  <PageHeader title="Order-wise Production Tracker" description="ERP order → dyeing schedule → individual job cards/lots → production stages → dispatch. No estimated completion percentages."/>
  <Panel><form className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end" onSubmit={e=>{e.preventDefault();setOrderId(draft.trim());}}>
   <Field label="ERP Order ID" htmlFor="track-order" className="flex-1"><Input id="track-order" value={draft} onChange={e=>setDraft(e.target.value)} placeholder="e.g. 191601"/></Field>
   <Button type="submit" disabled={!draft.trim()}>Track order</Button>
  </form></Panel>
  {query.isLoading&&<p className="text-sm text-muted-foreground">Loading order and job card events…</p>}
  {query.error&&<ErrorState message={errorMessage(query.error)} onRetry={()=>query.refetch()}/>}
  {!orderId&&<EmptyState title="Search an ERP Order ID" description="Import Orders Book, Dyeing Programs and Opening Job Cards first."/>}
  {info&&<>
   <div className="grid gap-3 sm:grid-cols-4">
    {[["Order lines",info.orders?.length||0],["Scheduled KG",formatNumber(info.summary?.scheduledKgs)],["Job-carded KG",formatNumber(info.summary?.jobCardedKgs)],["Schedule balance KG",formatNumber(info.summary?.balanceKgs)]].map(([name,v])=><Panel key={name}><div className="p-4"><p className="text-xs text-muted-foreground">{name}</p><p className="mt-1 text-xl font-semibold tabular-nums">{v}</p></div></Panel>)}
   </div>
   {(info.summary?.overAllocatedKgs > 0 || info.summary?.balanceKgs < 0) && <div role="alert" className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">ERP reconciliation required: imported job-card allocation is {formatNumber(info.summary?.overAllocatedKgs || -info.summary?.balanceKgs, 3)} KG above unique scheduled quantity. This may reflect a schedule revision, yield allowance or incorrect allocation; do not silently show zero balance without reviewing the ERP.</div>}
   {info.orders?.some(o => !['KGS','KG'].includes(String(o.uom||'').toUpperCase())) && <p className="rounded-md border border-border bg-surface p-3 text-sm text-muted-foreground">Order-book UOM: {[...new Set(info.orders.map(o=>o.uom||'UNSPECIFIED'))].join(', ')}. Scheduled and job-carded figures are KG. No automatic conversion has been applied.</p>}
   <Panel><PanelHeader title={`Order ${info.orderId}: schedule and lots`} description={`${info.lots?.length||0} job-card allocation lines. Some job cards can cover multiple orders.`}/>
    <div className="divide-y divide-border">
     {!info.lots?.length&&<p className="p-4 text-sm text-muted-foreground">No ERP Open Job Card imported for this order. Do not assume stock shortage.</p>}
     {info.lots?.map((lot,i)=><div className="p-4" key={`${lot.jobCardNo}-${lot.manualLotNo}-${i}`}>
      <div className="flex flex-wrap items-center justify-between gap-2"><div><strong>Job card {lot.jobCardNo}</strong><p className="text-sm text-muted-foreground">Lot {lot.manualLotNo||'Not supplied'} · {formatNumber(lot.kgs)} KG</p></div><span className="rounded border px-2 py-1 text-xs font-medium uppercase">{lot.status}</span></div>
      <ol className="mt-3 flex flex-wrap gap-2">{fields.map(name=>{const event=lot.events?.find(e=>e.stage===name);return <li key={name} className={`rounded border px-2 py-1 text-xs ${event?'border-green-400 bg-green-50 text-green-900':'border-border text-muted-foreground'}`} title={event?`${event.machine||''} ${formatDate(event.eventDate,true)}`:''}>{name} {event?'✓':'—'}</li>;})}</ol>
      {lot.closedAt&&<p className="mt-2 text-xs text-muted-foreground">Closed: {formatDate(lot.closedAt,true)}</p>}
     </div>)}
    </div>
   </Panel>
   <Panel><PanelHeader title="ERP Data Notes"/><p className="p-4 text-sm text-muted-foreground">Stock readiness: {info.stockReadiness||'not-verified'}. Only proven job-card/stage records are shown. Greige Unit-3 report has ERP Unit-1 header; inventory allocations and KG/MTR conversions need signed-off business rules. Dispatch import rows: {info.dispatches?.length||0}.</p></Panel>
  </>}
 </>;
}
