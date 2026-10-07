import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/services'
import { errorMessage } from '@/lib/api'
import { formatDate, formatNumber, toNumber } from '@/lib/utils'
import { DataTable, type Column } from '@/components/ui/data-table'
import { PageHeader, Stat } from '@/components/ui/panel'

const columns: Column[] = [
  { key: 'ItenName', label: 'Yarn', render: (r) => <span className="font-medium">{String(r.ItenName ?? r.ItemName ?? '')}</span> },
  { key: 'ClosingStock', label: 'Closing (kg)', align: 'right', render: (r) => <span className="font-semibold">{formatNumber(r.ClosingStock)}</span> },
  { key: 'LRD', label: 'Last receipt' },
  { key: 'LRQ', label: 'Receipt qty', align: 'right', render: (r) => formatNumber(r.LRQ) },
  { key: 'LID', label: 'Last issue' },
  { key: 'LIQ', label: 'Issue qty', align: 'right', render: (r) => formatNumber(r.LIQ) },
  { key: 'LUD', label: 'Updated', render: (r) => formatDate(r.LUD, true) },
]

export default function YarnStockPage() {
  const query = useQuery({ queryKey: ['yarn-stock'], queryFn: api.yarnStock })
  const rows = query.data ?? []
  return (
    <>
      <PageHeader title="Yarn Stock" description="Yarn closing stock with latest receipt and issue movement." />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Stat label="Total stock (kg)" value={formatNumber(rows.reduce((s, r) => s + toNumber(r.ClosingStock), 0), 0)} tone="primary" />
        <Stat label="Yarn counts" value={rows.length} />
        <Stat label="Last updated" value={rows[0] ? formatDate(rows[0].LUD, true) : '—'} />
      </div>
      <DataTable rows={rows} columns={columns} isLoading={query.isLoading} error={query.error ? errorMessage(query.error) : null} onRetry={() => query.refetch()} exportName="yarn-stock" />
    </>
  )
}
