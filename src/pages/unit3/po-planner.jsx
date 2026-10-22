import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, FileUp, RotateCcw } from 'lucide-react';
import { productionService } from '@/services/production.service';
import { errorMessage } from '@/services/http/client';
import { knittingStatus, plannedKgs, poDateValue, poNumber } from '@/utils/knitting';
import { formatDate, formatNumber, pickString } from '@/utils/format';
import { toIsoDate } from '@/utils/spreadsheet';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/field';
import { PageHeader, Panel, Stat } from '@/components/ui/panel';
import { useAuth } from '@/hooks/useAuth';

const statusNames={CLOSED:'Closed',OPEN:'Open',HOLD:'On hold',REVIEW:'Review remarks'};
const poColumns=[
 {key:'PO_NUMBER',label:'PO Number',render:r=><span className="font-semibold text-primary">{poNumber(r)}</span>},
 {key:'PO_DATE',label:'PO Date',render:r=>formatDate(poDateValue(r,'PO_DATE'))},
 {key:'FABRIC_NAME',label:'Fabric'},
 {key:'REQUIRED_QTY',label:'Required Qty',align:'right',render:r=>`${formatNumber(r.REQUIRED_QTY??r.REQUIRED_KGS)} ${pickString(r,'REQUIRED_UOM')||'KGS'}`},
 {key:'AVAILABLE_STOCK_KGS',label:'Stock in PO',align:'right',render:r=>r.AVAILABLE_STOCK_KGS==null?'—':formatNumber(r.AVAILABLE_STOCK_KGS)},
 {key:'PLANNED_KGS',label:'Planned KG',align:'right',render:r=>plannedKgs(r)===null?'—':formatNumber(plannedKgs(r))},
 {key:'PLANNED_MACHINE',label:'Planned Machine'},
 {key:'EXPECTED_DELIVERY_DATE',label:'EDD',render:r=>formatDate(poDateValue(r,'EXPECTED_DELIVERY_DATE'))},
 {key:'PLANNER_STATUS',label:'PO Planner Status',render:r=>{
   const status=knittingStatus(r);
   return <span className={`rounded-md px-2 py-1 text-xs font-medium ${status==='CLOSED'?'bg-green-100 text-green-800':status==='HOLD'?'bg-amber-100 text-amber-900':'bg-muted'}`}>{statusNames[status]||status}</span>;
 }},
 {key:'PLANNING_REMARKS',label:'ERP Remarks',render:r=>pickString(r,'PLANNING_REMARKS')||'—'},
];
export default function Unit3POPlannerPage(){
 const { can } = useAuth();
 const canUpload = can({allowedRoles:['unit3','yarn']});
 const pos=useQuery({queryKey:['knitting-po-lines'],queryFn:productionService.knittingPOLines,retry:false});
 const [basis,setBasis]=useState('PO_DATE');
 const [from,setFrom]=useState(''); const [to,setTo]=useState('');
 const [search,setSearch]=useState(''); const [statusFilter,setStatusFilter]=useState('ALL');
 const allLines=pos.data??[];
 const filtered=useMemo(()=>allLines.filter(r=>{
    const date=toIsoDate(poDateValue(r,basis));
    if((from||to)&&(!date||(from&&date<from)||(to&&date>to)))return false;
    if(statusFilter!=='ALL'&&knittingStatus(r)!==statusFilter)return false;
    const q=search.trim().toUpperCase();
    return !q||poNumber(r).toUpperCase().includes(q)||pickString(r,'FABRIC_NAME').toUpperCase().includes(q);
 }),[allLines,basis,from,to,search,statusFilter]);
 const stats=useMemo(()=>filtered.reduce((a,r)=>{
   const state=knittingStatus(r);a[state]=(a[state]??0)+1;
   if(['KGS','KG'].includes(pickString(r,'REQUIRED_UOM').toUpperCase()))a.requiredKgs+=Number(r.REQUIRED_KGS)||0;
   return a;
 },{OPEN:0,CLOSED:0,HOLD:0,REVIEW:0,requiredKgs:0}),[filtered]);
 const clear=()=>{setFrom('');setTo('');setSearch('');setStatusFilter('ALL');};
 return <>
   <PageHeader title="Unit-3 PO Planner" description="PO-wise knitting planning and CLOSED status from the latest imported Unit-3 PO worksheet. Independent of dyeing job cards."/>
   <Panel className="my-4 p-4">
     <div className="flex flex-wrap justify-between gap-3">
       <div>
         <h2 className="font-semibold">Unit-3 Knitting — PO Planner Status</h2>
         <p className="mt-1 text-sm text-muted-foreground">Only the PO worksheet is uploaded. A REMARKS value of CLOSED marks the PO line closed in the planner. No separate completion file, manual production entry or job-card link is required.</p>
       </div>
       <div className="flex flex-wrap items-start gap-2">
         {canUpload && <Link className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium" to="/imports/knitting-po-planning"><FileUp className="size-4"/> Import / Update PO sheet</Link>}
         <Button size="sm" variant="ghost" onClick={()=>{void pos.refetch();}}><RotateCcw/> Refresh</Button>
       </div>
     </div>
     <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
       <Field label="Date basis" htmlFor="date-basis"><Select id="date-basis" value={basis} onChange={e=>setBasis(e.target.value)}><option value="PO_DATE">PO Date</option><option value="EXPECTED_DELIVERY_DATE">Expected Delivery</option></Select></Field>
       <Field label="From" htmlFor="date-from"><Input id="date-from" type="date" value={from} max={to||undefined} onChange={e=>setFrom(e.target.value)}/></Field>
       <Field label="To" htmlFor="date-to"><Input id="date-to" type="date" value={to} min={from||undefined} onChange={e=>setTo(e.target.value)}/></Field>
       <Field label="PO / fabric" htmlFor="po-search"><Input id="po-search" value={search} placeholder="Search PO or fabric" onChange={e=>setSearch(e.target.value)}/></Field>
       <Field label="Planner status" htmlFor="po-status"><Select id="po-status" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="ALL">All statuses</option><option value="CLOSED">Closed</option><option value="OPEN">Open</option><option value="HOLD">On hold</option><option value="REVIEW">Review remarks</option></Select></Field>
     </div>
     <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
       <span><CalendarDays className="mr-1 inline size-3.5"/>{filtered.length.toLocaleString('en-IN')} PO lines</span>
       <span>Required: {formatNumber(stats.requiredKgs)} KG (KG lines only)</span>
       {(from||to||search||statusFilter!=='ALL')&&<Button size="sm" variant="ghost" onClick={clear}>Clear filters</Button>}
     </div>
   </Panel>
   <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
     <Stat label="Closed in ERP Planner" value={stats.CLOSED.toLocaleString('en-IN')} tone="primary"/>
     <Stat label="Open" value={stats.OPEN.toLocaleString('en-IN')}/>
     <Stat label="On Hold" value={stats.HOLD.toLocaleString('en-IN')}/>
     <Stat label="Review Remarks" value={stats.REVIEW.toLocaleString('en-IN')}/>
   </div>
   <div className="mb-7"><DataTable rows={filtered} columns={poColumns} title="Unit-3 PO Planner Lines" description="Read-only status from latest imported PO sheet" isLoading={pos.isLoading} error={pos.error?errorMessage(pos.error):null} onRetry={()=>pos.refetch()} searchable={false} exportName="unit3-po-planner" emptyDescription="Import the consolidated PO worksheet or clear your filters."/></div>
 </>;
}
