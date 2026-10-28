import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, Search, X } from 'lucide-react';
import { recipesService } from '@/services/recipes.service';
import { errorMessage } from '@/services/http/client';
import { retryReadOnce } from '@/services/http/retry';
import { formatCell, formatDate, formatNumber } from '@/utils/format';
import { recipeDisplay } from '@/utils/recipe-records';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';
import { DataTable } from '@/components/ui/data-table';
import { Dialog } from '@/components/ui/dialog';
import { PageHeader, Panel, Stat } from '@/components/ui/panel';

const show = (value) => value === '' || value == null ? '—' : String(value);
const formatKg = (value) => value === '' || value == null ? '—' : formatNumber(value, 3);
const columns = [
  { key:'recordType', label:'Report Type' },
  { key:'jobCard', label:'Job Card / Register', render:r=><span className="font-semibold">{show(r.jobCard)}</span> },
  { key:'lot', label:'Manual Lot No.' },
  { key:'customer', label:'Customer / Party', className:'max-w-64 truncate' },
  { key:'fabric', label:'Fabric / Quality', className:'max-w-72 truncate' },
  { key:'colour', label:'Colour / Shade', className:'max-w-52 truncate' },
  { key:'date', label:'Request Date', render:r=>r.date ? formatDate(r.date) : '—' },
  { key:'kgs', label:'Job Card KG', align:'right', render:r=>formatKg(r.kgs) },
  { key:'cost', label:'Cost / KG', align:'right', render:r=>formatKg(r.cost) },
  { key:'register', label:'Register No.' },
  { key:'page', label:'Page No.' },
];

export default function RecipesPage() {
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [selected, setSelected] = useState(null);

  const query = useQuery({
    queryKey:['recipe-records',search,page,limit],
    queryFn:({signal})=>recipesService.searchRecipe(search,{page,limit,signal}),
    staleTime:30_000,
    retry:retryReadOnce,
  });
  const rows = query.data?.rows ?? [];
  const tableRows = useMemo(() => rows.map((raw) => ({
    ...recipeDisplay(raw), recordKey:raw.recordKey, raw,
  })), [rows]);
  const apply = (event) => {
    event.preventDefault();
    setPage(1);
    setSearch(draft.trim().slice(0,160));
  };
  const clear = () => { setDraft(''); setSearch(''); setPage(1); };
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <PageHeader title="Recipes & Dyeing Details"
        description="Browse imported ERP dyed/chemical records and legacy MIX recipe entries. Job-card detail reports are not verified dye formulas." />
      <form role="search" onSubmit={apply} className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-3 sm:flex-row sm:items-end sm:p-4">
        <div className="min-w-0 flex-1">
          <label className="mb-1 block text-sm font-medium" htmlFor="recipes-search">Search records</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input id="recipes-search" className="h-11 pl-9" value={draft}
              onChange={e=>{const next=e.target.value;setDraft(next);if(!next.trim()){setSearch('');setPage(1);}}} maxLength={160}
              placeholder="Job card, lot, customer, fabric, shade or dye" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" loading={query.isFetching && Boolean(search)}><Search className="size-4" /> Search</Button>
          {(draft||search) && <Button type="button" variant="outline" onClick={clear}><X className="size-4" /> Clear</Button>}
          <Button type="button" variant="outline" aria-label="Refresh recipes" disabled={query.isFetching} onClick={()=>void query.refetch()}><RefreshCw className={query.isFetching ? 'size-4 animate-spin':'size-4'} /> Refresh</Button>
        </div>
      </form>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Stat label={search ? 'Matching ERP records' : 'Imported ERP records'}
          value={query.isLoading || query.error ? '—' : (query.data?.pagination?.totalEntries ?? 0).toLocaleString('en-IN')} tone="primary" />
        <Stat label="Rows in selected page" value={query.isLoading || query.error ? '—' : rows.length.toLocaleString('en-IN')} />
      </div>
      <Panel className="px-4 py-3 text-sm text-muted-foreground">
        The uploaded <strong>Dyed and Chemical Details Report</strong> contains job-card, fabric, shade, KG and cost information; it is not a verified colour-formula master.
        {' '}Use <Link to="/imports/recipes" className="font-medium text-primary underline underline-offset-2">ERP Imports → Recipes</Link> to import or update records.
      </Panel>
      <DataTable rows={tableRows} columns={columns} title="ERP Recipe & Chemical Records"
        description={search ? `Search: ${search}` : 'Latest imported records'}
        isLoading={query.isLoading} isFetching={query.isFetching}
        error={query.error ? errorMessage(query.error) : null}
        onRetry={()=>void query.refetch()} searchable={false} exportName="erp-recipe-details"
        emptyDescription={search ? 'No records match this search. Try a different job-card number, lot, customer or fabric.' : 'No ERP recipe/chemical records are imported yet. Import an ERP report to populate this register.'}
        onRowClick={setSelected}
        serverPagination={{pagination:query.data?.pagination,onPageChange:setPage,onPageSizeChange:(value)=>{setLimit(value);setPage(1);}}} />
      <Dialog open={Boolean(selected)} onOpenChange={open=>{if(!open)setSelected(null);}}
        title="ERP Record Details" description={selected?.recordType} className="max-w-3xl">
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {selected && Object.entries(selected.raw).filter(([key])=>key!=='recordKey').map(([key,value])=>(
            <div key={key} className="min-w-0 border-b border-border/70 pb-2">
              <dt className="text-xs text-muted-foreground">{key}</dt>
              <dd className="break-words text-sm font-medium">{formatCell(value)}</dd>
            </div>
          ))}
        </dl>
      </Dialog>
    </div>
  );
}
