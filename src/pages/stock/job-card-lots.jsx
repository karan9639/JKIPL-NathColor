import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, Search, X } from 'lucide-react';
import { jobCardService } from '@/services/job-card.service';
import { errorMessage } from '@/services/http/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';
import { DataTable } from '@/components/ui/data-table';
import { PageHeader, Stat } from '@/components/ui/panel';
import { ImportReportPagination } from '@/components/reports/import-report-filters';
import { formatDate, formatNumber } from '@/utils/format';
import { readJobCardLotsPage } from '@/utils/job-card-lots';

const columns = [
  { key: 'manualLotNo', label: 'MANUAL LOT NO', render: (r) => <span className="font-medium">{r.manualLotNo || '—'}</span> },
  { key: 'orderId', label: 'ORDER ID' },
  { key: 'itemName', label: 'ITEM NAME', className: 'max-w-72' },
  { key: 'quantity', label: 'QUANTITY', align: 'right', render: (r) => formatNumber(r.quantity, 3) },
  { key: 'kgs', label: 'KGS', align: 'right', render: (r) => formatNumber(r.kgs, 3) },
  { key: 'jobCardNo', label: 'JOB CARD NO' },
  { key: 'jobCardDate', label: 'JOB CARD DATE', render: (r) => r.jobCardDate ? formatDate(r.jobCardDate) : '—' },
  { key: 'status', label: 'STATUS' },
];

export default function JobCardLotsPage() {
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ['job-card-lots', search, page],
    queryFn: async () => readJobCardLotsPage(await jobCardService.fetchJobCards({ page, limit: 100, ...(search ? { search } : {}) }), page),
    staleTime: 30_000,
    retry: 1,
  });
  const rows = query.data?.rows ?? [];
  const pagination = query.data?.pagination;
  const submit = (event) => {
    event.preventDefault();
    setPage(1);
    setSearch(draft.trim().slice(0, 120));
  };
  const clear = () => { setDraft(''); setSearch(''); setPage(1); };

  return <div className="flex min-w-0 flex-col gap-4">
    <PageHeader title="Job Card Lots" description="Lot-wise allocation lines from the uploaded ERP Open Job Cards report. These are job-card records, not physical greige stock or verified completed quantities." />
    <form onSubmit={submit} role="search" className="flex flex-wrap items-end gap-2 rounded-lg border border-border bg-surface p-4">
      <div className="min-w-52 flex-1">
        <label htmlFor="lots-search" className="mb-1 block text-sm font-medium">Search lot, order, job card or fabric</label>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input id="lots-search" className="pl-9" value={draft} maxLength={120} placeholder="e.g. 143021, 187127, 2321/1" onChange={e => setDraft(e.target.value)} />
        </div>
      </div>
      <Button type="submit" loading={query.isFetching}>Search</Button>
      {(search || draft) && <Button variant="outline" onClick={clear}><X aria-hidden="true"/> Clear</Button>}
      <Button variant="outline" onClick={() => query.refetch()} loading={query.isFetching}><RefreshCw aria-hidden="true"/> Refresh</Button>
    </form>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      <Stat label="Matching job-card lines" value={query.isError || query.isPending ? '—' : formatNumber(pagination?.totalEntries ?? 0, 0)} tone="primary" />
      <Stat label="Lines on current page" value={query.isError || query.isPending ? '—' : rows.length.toLocaleString('en-IN')} />
      <Stat label="Unique lot labels (page)" value={query.isError || query.isPending ? '—' : new Set(rows.map(r => r.manualLotNo).filter(Boolean)).size.toLocaleString('en-IN')} />
    </div>
    <DataTable
      rows={rows}
      columns={columns}
      searchable={false}
      isLoading={query.isPending}
      error={query.isError ? errorMessage(query.error) : null}
      onRetry={() => query.refetch()}
      exportName="job-card-lots-current-page"
      description="Imported Open Job Card rows (Excel export: current page only). Quantity UOM is not separately supplied by this model; KGS is shown independently."
      emptyTitle="No job-card lot lines found"
      emptyDescription={search ? 'Try another lot number, order ID, job card number, or item.' : 'Import the Open Job Cards ERP report first.'}
    />
    <ImportReportPagination pagination={pagination} disabled={query.isFetching} onPageChange={setPage}/>
  </div>;
}
