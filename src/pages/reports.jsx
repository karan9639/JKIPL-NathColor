import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router';
import { reportsService } from '@/services/reports.service';
import { errorMessage } from '@/services/http/client';
import { formatDate, formatNumber, toNumber } from '@/utils/format';
import { DataTable } from '@/components/ui/data-table';
import { EmptyState, PageHeader, Stat } from '@/components/ui/panel';
const REPORTS = {
    'greige-requisition': {
        title: 'Dyeing Schedule Summary',
        description: 'Imported dyeing schedule lines and planned tonnage by date; not a separate issue transaction.',
        queryFn: reportsService.greigeRequisitionSummary,
        columns: [
            { key: 'REQ_DATE', label: 'Date', render: (r) => <span className="font-medium">{formatDate(r.REQ_DATE)}</span> },
            { key: 'NOS', label: 'Requisitions', align: 'right' },
            { key: 'TONS', label: 'Tons', align: 'right', render: (r) => formatNumber(r.TONS) },
        ],
        totals: [
            ['NOS', 'Requisitions'],
            ['TONS', 'Tons'],
        ],
    },
    'greige-issued': {
        title: 'Job Cards Issued Summary',
        description: 'Distinct job cards and imported job-card quantities per day.',
        queryFn: reportsService.greigeIssuedSummary,
        columns: [
            { key: 'JOBCARDDATE', label: 'Date', render: (r) => <span className="font-medium">{formatDate(r.JOBCARDDATE)}</span> },
            { key: 'LOTS', label: 'Lots', align: 'right' },
            { key: 'TONS', label: 'Tons', align: 'right', render: (r) => formatNumber(r.TONS) },
            // { key: 'ISSUEDBY', label: 'Issued by' },
        ],
        totals: [
            ['LOTS', 'Lots'],
            ['TONS', 'Tons'],
        ],
    },
    lud: {
        title: 'Last Update (LUD)',
        description: 'When each data source was last refreshed and by whom.',
        queryFn: reportsService.lud,
        columns: [
            { key: 'Report', label: 'Source', render: (r) => <span className="font-medium">{String(r.Report ?? '')}</span> },
            { key: 'LUD', label: 'Last updated', render: (r) => formatDate(r.LUD, true) },
            { key: 'USERNAME', label: 'By' },
            { key: 'REMARKS', label: 'Remarks' },
        ],
    },
};
export default function ReportPages() {
    const { report = '' } = useParams();
    const def = REPORTS[report];
    const query = useQuery({ queryKey: ['report', report], queryFn: def?.queryFn ?? (async () => []), enabled: !!def });
    if (!def)
        return <EmptyState title="Report not found"/>;
    const rows = query.data ?? [];
    return (<>
      <PageHeader title={def.title} description={def.description}/>
      {def.totals && (<div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {def.totals.map(([key, label], i) => (<Stat key={key} label={`Total ${label.toLowerCase()}`} value={query.isError || query.isLoading ? '—' : formatNumber(rows.reduce((s, r) => s + toNumber(r[key]), 0))} tone={i === 0 ? 'primary' : 'default'}/>))}
          <Stat label="Days" value={query.isError || query.isLoading ? '—' : rows.length}/>
        </div>)}
      <DataTable title={`${def.title} records`} rows={rows} columns={def.columns} isLoading={query.isLoading} error={query.error ? errorMessage(query.error) : null} onRetry={() => query.refetch()} exportName={report}/>
    </>);
}
