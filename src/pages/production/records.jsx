import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/services';
import { errorMessage } from '@/lib/api';
import { formatDate, toNumber } from '@/lib/utils';
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
    const query = useQuery({ queryKey: ['records'], queryFn: api.records });
    const rows = query.data ?? [];
    return (<>
      <PageHeader title="Daily Records" description="Number of entries recorded per production stage each day."/>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        {KEYS.map(([key, label]) => (<Stat key={key} label={`${label} (period)`} value={rows.reduce((s, r) => s + toNumber(r[key]), 0).toLocaleString('en-IN')}/>))}
      </div>
      <DataTable rows={rows} columns={columns} isLoading={query.isLoading} error={query.error ? errorMessage(query.error) : null} onRetry={() => query.refetch()} exportName="daily-records" searchable={false}/>
    </>);
}
