import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/services'
import { errorMessage } from '@/lib/api'
import { formatDate, parseLooseDate, pickString, type Row } from '@/lib/utils'
import { DataTable, type Column } from '@/components/ui/data-table'
import { PageHeader } from '@/components/ui/panel'

function opened(r: Row) {
  return parseLooseDate(`${pickString(r, 'JOBCARDDATE')} ${pickString(r, 'JOBCARDTIME')}`.trim())
}

function elapsed(r: Row, key: string) {
  const start = opened(r)
  const end = parseLooseDate(r[key])
  if (!start || !end) return null
  const hours = (end.getTime() - start.getTime()) / 36e5
  return hours < 0 ? null : hours
}

function stamp(key: string, label: string): Column {
  return {
    key,
    label,
    sortValue: (r) => parseLooseDate(r[key])?.getTime() ?? 0,
    render: (r) => {
      if (!pickString(r, key)) return <span className="text-muted-foreground">—</span>
      const h = elapsed(r, key)
      return (
        <span className="flex flex-col leading-tight">
          <span>{formatDate(r[key], true)}</span>
          {h !== null && <span className="tabular text-xs text-muted-foreground">+{h < 48 ? `${h.toFixed(1)}h` : `${(h / 24).toFixed(1)}d`}</span>}
        </span>
      )
    },
  }
}

const columns: Column[] = [
  { key: 'JOBCARDNO', label: 'Job card', render: (r) => <span className="tabular font-medium text-primary">{pickString(r, 'JOBCARDNO')}</span> },
  { key: 'MANUALLOTNO', label: 'Lot' },
  { key: 'JETNO', label: 'Jet', align: 'right' },
  { key: 'JOBCARDDATE', label: 'Opened', render: (r) => formatDate(`${pickString(r, 'JOBCARDDATE')} ${pickString(r, 'JOBCARDTIME')}`, true) },
  stamp('RECIPEDATE', 'Recipe'),
  stamp('DYESCHEMISSUEDATE', 'Dyes issue'),
  stamp('JETLOADINGDATE', 'Jet loading'),
  stamp('HEATSETTINGDATE', 'Heat set'),
  stamp('FINISHINGDATE', 'Finishing'),
  stamp('JOBCARDCLOSEDDATE', 'Closed'),
  stamp('INVOICE_DATE', 'Invoiced'),
]

export default function TrackerPage() {
  const query = useQuery({ queryKey: ['tracker'], queryFn: api.tracker })
  return (
    <>
      <PageHeader title="Order Tracker" description="Timestamp of every stage per job card, with elapsed time since opening." />
      <DataTable rows={query.data ?? []} columns={columns} isLoading={query.isLoading} error={query.error ? errorMessage(query.error) : null} onRetry={() => query.refetch()} exportName="job-card-tracker" />
    </>
  )
}
