import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/services'
import { errorMessage } from '@/lib/api'
import { formatDate, formatNumber, toNumber } from '@/lib/utils'
import { DataTable, type Column } from '@/components/ui/data-table'
import { Select } from '@/components/ui/field'
import { PageHeader, Stat } from '@/components/ui/panel'

const columns: Column[] = [
  { key: 'FABRICNAME', label: 'Fabric', render: (r) => <span className="font-medium">{String(r.FABRICNAME ?? r.FabricName ?? '')}</span> },
  { key: 'STOCK', label: 'Stock (kg)', align: 'right', render: (r) => <span className="font-semibold">{formatNumber(r.STOCK)}</span> },
  { key: 'LRD', label: 'Last receipt' },
  { key: 'LRQ', label: 'Receipt qty', align: 'right', render: (r) => formatNumber(r.LRQ) },
  { key: 'LID', label: 'Last issue' },
  { key: 'LIQ', label: 'Issue qty', align: 'right', render: (r) => formatNumber(r.LIQ) },
  { key: 'LUD', label: 'Updated', render: (r) => formatDate(r.LUD, true) },
]

export default function GreigeStockPage() {
  const query = useQuery({ queryKey: ['greige-stock'], queryFn: api.greigeStock })
  const [unit, setUnit] = useState<'all' | 'u2' | 'u3'>('all')
  const all = query.data ?? []
  const rows = useMemo(() => {
    if (unit === 'all') return all
    return all.filter((r) => {
      const isU3 = /U-?3/i.test(String(r.FABRICNAME ?? '')) || String(r.UNIT ?? '').toUpperCase() === 'U-3'
      return unit === 'u3' ? isU3 : !isU3
    })
  }, [all, unit])
  const total = rows.reduce((s, r) => s + toNumber(r.STOCK), 0)

  return (
    <>
      <PageHeader title="Greige Stock" description="Current greige fabric stock across units with last receipt and issue." />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Total stock (kg)" value={formatNumber(total, 0)} tone="primary" />
        <Stat label="Qualities" value={rows.length} />
        <Stat label="Out of stock" value={rows.filter((r) => toNumber(r.STOCK) <= 0).length} tone="accent" />
        <Stat label="Below 500 kg" value={rows.filter((r) => toNumber(r.STOCK) > 0 && toNumber(r.STOCK) < 500).length} />
      </div>
      <DataTable
        rows={rows}
        columns={columns}
        isLoading={query.isLoading}
        error={query.error ? errorMessage(query.error) : null}
        onRetry={() => query.refetch()}
        exportName="greige-stock"
        toolbar={
          <>
            <label htmlFor="unit" className="sr-only">
              Unit
            </label>
            <Select id="unit" value={unit} onChange={(e) => setUnit(e.target.value as typeof unit)} className="h-9 w-32">
              <option value="all">All units</option>
              <option value="u2">Unit 2</option>
              <option value="u3">Unit 3</option>
            </Select>
          </>
        }
      />
    </>
  )
}
