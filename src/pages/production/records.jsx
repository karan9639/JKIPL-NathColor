import { useQuery } from '@tanstack/react-query';
import { productionService } from '@/services/production.service';
import { errorMessage } from '@/services/http/client';
import { formatDate, toNumber } from '@/utils/format';
import { DataTable } from '@/components/ui/data-table';
import { PageHeader, Stat } from '@/components/ui/panel';
const KEYS = [
    ['GREQ', 'Greige req.'],
    ['JobCards', 'Job cards'],
    ['Recipe', 'Recipes'],
    ['Dyes', 'Dyes issue'],
    ['Jet', 'Jet loading'],
    ['HeatS', 'Heat set'],
    ['Finish', 'Finishing'],
];
const columns = [
    { key: 'Date', label: 'Date', render: (r) => <span className="font-medium">{formatDate(r.Date)}</span> },
    ...KEYS.map(([key, label]) => ({ key, label, align: 'right' })),
];
export default function RecordsPage() {
    const query = useQuery({ queryKey: ['records'], queryFn: ({ signal }) => productionService.records({ signal }), staleTime: 30_000 });
    const rows = query.data ?? [];
    return (<>
      <PageHeader title="Daily Records" description="Number of entries recorded per production stage each day."/>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        {KEYS.map(([key, label]) => (<Stat key={key} label={`${label} (period)`} value={query.isLoading || query.isError ? '—' : rows.reduce((s, r) => s + toNumber(r[key]), 0).toLocaleString('en-IN')}/>))}
      </div>
      <DataTable title="Daily production records" rows={rows} columns={columns} isLoading={query.isLoading} error={query.error ? errorMessage(query.error) : null} onRetry={() => query.refetch()} exportName="daily-records" searchable={false}/>
    </>);
}
