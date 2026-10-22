import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { productionService } from '@/services/production.service';
import { errorMessage } from '@/services/http/client';
import { cn, formatDate, formatNumber, pickString, toNumber } from '@/utils/format';
import { DataTable } from '@/components/ui/data-table';
import { Badge, PageHeader } from '@/components/ui/panel';
const STAGE_ORDER = ['Awaiting dyes', 'Dyes issued', 'In jet', 'Heat set', 'Finished'];
function currentStage(r) {
    if (pickString(r, 'FINISHING_DATE', 'FINISHINGDATE'))
        return 'Finished';
    if (pickString(r, 'HEATSETTING_DATE', 'HEATSETTINGDATE'))
        return 'Heat set';
    if (pickString(r, 'JETLOADING_DATE', 'JETLOADINGDATE'))
        return 'In jet';
    if (pickString(r, 'DYESCHEMISSUEDATE'))
        return 'Dyes issued';
    return 'Awaiting dyes';
}
const tones = {
    'Awaiting dyes': 'neutral',
    'Dyes issued': 'warning',
    'In jet': 'primary',
    'Heat set': 'primary',
    Finished: 'success',
};
const columns = [
    { key: 'JOBCARDNO', label: 'Job card', render: (r) => <span className="tabular font-medium text-primary">{pickString(r, 'JOBCARDNO')}</span> },
    { key: 'STAGE', label: 'Stage', sortValue: (r) => STAGE_ORDER.indexOf(currentStage(r)), render: (r) => <Badge tone={tones[currentStage(r)]}>{currentStage(r)}</Badge> },
    { key: 'JOBCARDDATE', label: 'Opened', render: (r) => formatDate(r.JOBCARDDATE) },
    { key: 'CUSTOMERNAME', label: 'Customer', className: 'max-w-48 truncate' },
    { key: 'ITEMNAME', label: 'Fabric', className: 'max-w-56 truncate' },
    { key: 'COLOR', label: 'Color' },
    { key: 'KGS', label: 'Kg', align: 'right', render: (r) => formatNumber(r.KGS) },
    { key: 'JETLOADING_MACHINE', label: 'Jet' },
    { key: 'HEATSETTING_MACHINE', label: 'HS stenter' },
    { key: 'FINISHING_MACHINE', label: 'Fin. stenter' },
];
export default function InProgressPage() {
    const query = useQuery({ queryKey: ['production-stages'], queryFn: productionService.productionStages, refetchInterval: 120_000 });
    const [active, setActive] = useState(null);
    const all = query.data ?? [];
    const counts = useMemo(() => {
        const out = Object.fromEntries(STAGE_ORDER.map((s) => [s, { n: 0, kg: 0 }]));
        for (const r of all) {
            const s = currentStage(r);
            out[s].n++;
            out[s].kg += toNumber(r.KGS);
        }
        return out;
    }, [all]);
    const rows = active ? all.filter((r) => currentStage(r) === active) : all;
    return (<>
      <PageHeader title="Dyeing In Progress" description="Open job cards by their latest recorded stage. Refreshes every 2 minutes."/>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" role="group" aria-label="Filter by stage">
        {STAGE_ORDER.map((s) => (<button key={s} type="button" aria-pressed={active === s} onClick={() => setActive((a) => (a === s ? null : s))} className={cn('rounded-lg border px-4 py-3 text-left transition-colors', active === s ? 'border-primary bg-primary-soft' : 'border-border bg-surface hover:bg-muted')}>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{s}</p>
            <p className={cn('tabular mt-1 text-xl font-semibold', active === s && 'text-primary')}>{query.isLoading || query.isError ? '—' : counts[s].n}</p>
            <p className="tabular text-xs text-muted-foreground">{query.isLoading || query.isError ? '—' : formatNumber(counts[s].kg, 0)} KG</p>
          </button>))}
      </div>
      <DataTable rows={rows} columns={columns} description={active ? `Showing ${active}` : undefined} isLoading={query.isLoading} error={query.error ? errorMessage(query.error) : null} onRetry={() => query.refetch()} exportName="dyeing-in-progress"/>
    </>);
}
