import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router'
import { api } from '@/lib/services'
import { errorMessage } from '@/lib/api'
import { formatDate, formatNumber, toNumber, type Row } from '@/lib/utils'
import { DataTable, type Column } from '@/components/ui/data-table'
import { EmptyState, PageHeader, Stat } from '@/components/ui/panel'

interface ReportDef {
  title: string
  description: string
  queryFn: () => Promise<Row[]>
  columns: Column[]
  totals?: [string, string][]
}

const REPORTS: Record<string, ReportDef> = {
  'greige-requisition': {
    title: 'Greige Requisition Summary',
    description: 'Number of requisitions and tonnage requested per day.',
    queryFn: api.greigeRequisitionSummary,
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
    title: 'Greige Issued Summary',
    description: 'Lots and tonnage issued to dyeing per day.',
    queryFn: api.greigeIssuedSummary,
    columns: [
      { key: 'JOBCARDDATE', label: 'Date', render: (r) => <span className="font-medium">{formatDate(r.JOBCARDDATE)}</span> },
      { key: 'LOTS', label: 'Lots', align: 'right' },
      { key: 'TONS', label: 'Tons', align: 'right', render: (r) => formatNumber(r.TONS) },
      { key: 'ISSUEDBY', label: 'Issued by' },
    ],
    totals: [
      ['LOTS', 'Lots'],
      ['TONS', 'Tons'],
    ],
  },
  lud: {
    title: 'Last Update (LUD)',
    description: 'When each data source was last refreshed and by whom.',
    queryFn: api.lud,
    columns: [
      { key: 'Report', label: 'Source', render: (r) => <span className="font-medium">{String(r.Report ?? '')}</span> },
      { key: 'LUD', label: 'Last updated', render: (r) => formatDate(r.LUD, true) },
      { key: 'USERNAME', label: 'By' },
      { key: 'REMARKS', label: 'Remarks' },
    ],
  },
}

export default function ReportPages() {
  const { report = '' } = useParams()
  const def = REPORTS[report]
  const query = useQuery({ queryKey: ['report', report], queryFn: def?.queryFn ?? (async () => []), enabled: !!def })
  if (!def) return <EmptyState title="Report not found" />
  const rows = query.data ?? []
  return (
    <>
      <PageHeader title={def.title} description={def.description} />
      {def.totals && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {def.totals.map(([key, label], i) => (
            <Stat key={key} label={`Total ${label.toLowerCase()}`} value={formatNumber(rows.reduce((s, r) => s + toNumber(r[key]), 0))} tone={i === 0 ? 'primary' : 'default'} />
          ))}
          <Stat label="Days" value={rows.length} />
        </div>
      )}
      <DataTable rows={rows} columns={def.columns} isLoading={query.isLoading} error={query.error ? errorMessage(query.error) : null} onRetry={() => query.refetch()} exportName={report} />
    </>
  )
}
