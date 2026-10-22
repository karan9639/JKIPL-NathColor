import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, Clock3 } from 'lucide-react';
import { productionService } from '@/services/production.service';
import { errorMessage } from '@/services/http/client';
import { formatNumber, pickString } from '@/utils/format';
import {
  PRODUCTION_STAGES, formatErpOpening,
  formatTimelineRow, getTimelineEvents, openingSortKey,
} from '@/utils/lot-timeline';
import { DataTable } from '@/components/ui/data-table';
import { Badge, PageHeader, Panel, Stat } from '@/components/ui/panel';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const statusTone = { Closed: 'success', 'In production': 'primary', Open: 'neutral' };

const columns = [
  { key: 'ORDERID', label: 'ERP Order ID', render: (r) => <span className="font-semibold tabular">{r.ORDERID || '—'}</span> },
  { key: 'JOBCARDNO', label: 'Job Card', render: (r) => <span className="font-medium text-primary tabular">{r.JOBCARDNO || '—'}</span> },
  { key: 'MANUALLOTNO', label: 'Manual Lot No.' },
  { key: 'ITEMNAME', label: 'Item / Fabric', className: 'max-w-64 truncate' },
  { key: 'KGS', label: 'Allocated KG', align: 'right', render: (r) => r.KGS == null ? '—' : formatNumber(r.KGS, 3) },
  { key: 'OPENED_DISPLAY', label: 'Opened (ERP)', sortValue: openingSortKey,
    render: (r) => {const [date, time] = r.OPENED_DISPLAY.split(' · '); return <span className="flex flex-col whitespace-nowrap tabular"><span>{date}</span>{time && <span className="text-xs text-muted-foreground">{time}</span>}</span>;} },
  { key: 'RECORDED_STAGES', label: 'Stage records', render: (r) => {
      const recorded = new Set(getTimelineEvents(r).map(e => e.key));
      return <div className="flex gap-1" aria-label="Recorded dyeing stages">
        {PRODUCTION_STAGES.map((stage, i) => <span key={stage.key} title={`${stage.short}: ${recorded.has(stage.key) ? 'recorded' : 'no record'}`}
          className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${recorded.has(stage.key) ? 'border-primary/30 bg-primary-soft text-primary' : 'border-border text-muted-foreground'}`}>
          {['Dy','Jet','Rop','HS','Fin'][i]}
        </span>)}
      </div>;} },
  { key: 'LATEST_STAGE', label: 'Last recorded activity', render: (r) => <span className="flex flex-col gap-0.5">
      <span className="font-medium">{r.LATEST_STAGE}</span>
      {r.LATEST_STAGE_DATE && <span className="text-xs text-muted-foreground tabular">{r.LATEST_STAGE_DATE}</span>}
    </span> },
  { key: 'STAGE_STATUS', label: 'Status', render: (r) => <Badge tone={statusTone[r.STAGE_STATUS]}>{r.STAGE_STATUS}</Badge> },
];

function Detail({ row }) {
  const events = getTimelineEvents(row);
  const missing = PRODUCTION_STAGES.filter(stage => !events.some(e => e.key === stage.key));
  const details = [
    ['ERP Order ID', row.ORDERID],
    ['Manual Lot No.', row.MANUALLOTNO],
    ['Item / Fabric', row.ITEMNAME || row.FABRICNAME],
    ['Customer', row.CUSTOMERNAME],
    ['Colour', row.COLOR],
    ['Allocated KG', row.KGS == null ? '—' : formatNumber(row.KGS, 3)],
    ['ERP job card status', row.STATUS],
    ['Jet (ERP / production)', row.JETLOADING_MACHINE || row.JETNO],
  ];
  return <div className="space-y-5">
    <div className="grid grid-cols-2 gap-x-5 gap-y-3 rounded-lg bg-muted/50 p-3">
      {details.map(([label, value]) => <div key={label} className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="break-words text-sm font-medium">{value || '—'}</p>
      </div>)}
    </div>

    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Recorded timeline</h3>
      <div className="relative ml-2 border-l-2 border-border pl-5">
        <div className="relative pb-5">
          <span className="absolute -left-[27px] top-1.5 size-3 rounded-full border-2 border-primary bg-surface" />
          <p className="font-medium text-sm">Job card opened (ERP)</p>
          <p className="text-xs text-muted-foreground tabular">{formatErpOpening(row)}</p>
        </div>
        {events.map((event) => <div key={event.key} className="relative pb-5 last:pb-0">
          <span className="absolute -left-[27px] top-1.5 size-3 rounded-full border-2 border-primary bg-primary-soft" />
          <p className="text-sm font-medium">{event.label}</p>
          <p className="text-xs text-muted-foreground tabular">{event.display}</p>
        </div>)}
      </div>
      {!events.length && <p className="rounded-lg bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
        No production-stage, closing or invoice event is recorded for this job card yet.
      </p>}
    </div>
    {missing.length > 0 && <div className="border-t border-border pt-3">
      <p className="mb-2 text-xs font-medium text-muted-foreground">No record imported/entered for</p>
      <div className="flex flex-wrap gap-1.5">
        {missing.map(e => <span key={e.key} className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">{e.short}</span>)}
      </div>
    </div>}
    <p className="border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
      These are recorded job-card events, not guaranteed sequential process steps. A job card may cover multiple ERP order lines; shared job-card events can appear on each linked order line. Missing activity is not proof a machine step was skipped.
    </p>
  </div>;
}

export default function TrackerPage() {
  const query = useQuery({queryKey: ['tracker'], queryFn: productionService.tracker, retry: 1, staleTime: 30000});
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState('All');
  const all = useMemo(() => (query.data ?? []).map(formatTimelineRow), [query.data]);
  const rows = status === 'All' ? all : all.filter(row => row.STAGE_STATUS === status);
  const counts = useMemo(() => ({
    All: all.length,
    Open: all.filter(r => r.STAGE_STATUS === 'Open').length,
    'In production': all.filter(r => r.STAGE_STATUS === 'In production').length,
    Closed: all.filter(r => r.STAGE_STATUS === 'Closed').length,
    distinctCards: new Set(all.map(r => r.JOBCARDNO).filter(Boolean)).size,
  }), [all]);

  return <div className="flex min-w-0 flex-col gap-4">
    <PageHeader title="Order Tracker" description="ERP Order → Job Card → Manual Lot → recorded dyeing events. Select a row to view the full timeline." actions={
      <Button variant="outline" size="sm" loading={query.isFetching} onClick={() => query.refetch()}>
        <RefreshCw aria-hidden="true"/> Refresh
      </Button>
    }/>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat label="ERP order lines" value={query.isError || query.isPending ? '—' : formatNumber(counts.All, 0)} hint={`${counts.distinctCards} distinct job cards`} tone="primary"/>
      <Stat label="Open (no stage recorded)" value={query.isError || query.isPending ? '—' : formatNumber(counts.Open, 0)}/>
      <Stat label="In production" value={query.isError || query.isPending ? '—' : formatNumber(counts['In production'], 0)}/>
      <Stat label="Closed in ERP records" value={query.isError || query.isPending ? '—' : formatNumber(counts.Closed, 0)}/>
    </div>
    <Panel className="p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter lot status">
          {['All','Open','In production','Closed'].map(s => <button type="button" key={s}
            aria-pressed={status === s} onClick={() => setStatus(s)}
            className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${status===s ? 'border-primary bg-primary-soft text-primary' : 'border-border bg-surface text-muted-foreground hover:bg-muted'}`}>
            {s} ({counts[s] ?? 0})
          </button>)}
        </div>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Clock3 className="size-4"/>Production timestamps: IST</p>
      </div>
    </Panel>
    <DataTable
      rows={rows} columns={columns} title="Job card / lot records"
      description="Click any row for a chronological event timeline. Dates no longer show raw ISO strings."
      isLoading={query.isPending} error={query.isError ? errorMessage(query.error) : null}
      onRetry={() => query.refetch()} onRowClick={setSelected}
      exportName="dyeing-lot-timeline" maxHeight="65vh"
      emptyTitle="No matching job-card lines"
      emptyDescription="Try All statuses, or upload ERP Open Job Cards to populate the timeline."
    />
    <p className="text-xs text-muted-foreground">
      Status comes only from recorded job-card stage/closure data; it does not certify quantity completion. The same job-card event may appear for several order allocation lines.
    </p>
    <Dialog open={!!selected} onOpenChange={open => {if(!open) setSelected(null)}}
      title={`Job Card ${pickString(selected, 'JOBCARDNO') || '—'}`}
      description={`Lot ${pickString(selected, 'MANUALLOTNO') || '—'} · ERP Order ${pickString(selected, 'ORDERID') || '—'}`}
      className="max-w-2xl">
      {selected && <Detail row={selected}/>} 
    </Dialog>
  </div>;
}
