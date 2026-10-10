import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import { api } from '@/lib/services';
import { errorMessage } from '@/lib/api';
import { formatCell, formatNumber, pickString, toNumber } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';
import { DataTable } from '@/components/ui/data-table';
import { PageHeader, Stat } from '@/components/ui/panel';
import { OrderDetailDialog } from '@/components/orders/order-detail-dialog';
const TITLES = {
    SearchOrdersPageKey: { title: 'All Orders', description: 'Search the full order book by order number, customer, fabric, color or PO.' },
    DomesticPendingOrdersPageKey: { title: 'Domestic Pending Orders', description: 'Domestic orders with balance quantity yet to dispatch.' },
    BrandsPendingOrdersPageKey: { title: 'Brands Pending Orders', description: 'Brand orders with balance quantity yet to dispatch.' },
};
const columns = [
    { key: 'ORDERNUMBER', label: 'Order', render: (r) => <span className="font-medium text-primary">{pickString(r, 'ORDERNUMBER', 'ORDERID')}</span> },
    { key: 'ORD_DATE', label: 'Date' },
    { key: 'CUSTOMERNAME', label: 'Customer', className: 'max-w-56 truncate' },
    { key: 'BRANDNAME', label: 'Brand' },
    { key: 'UPPERFABRICNAME', label: 'Fabric', className: 'max-w-64 truncate' },
    { key: 'UPPERCOLOR', label: 'Color' },
    { key: 'ORD_QTY', label: 'Ord qty', align: 'right', render: (r) => formatNumber(r.ORD_QTY ?? r.KGS) },
    { key: 'GREIGE_ISSUED_KGS', label: 'Issued', align: 'right', render: (r) => formatNumber(r.GREIGE_ISSUED_KGS) },
    { key: 'Total_Dispatched', label: 'Dispatched', align: 'right', render: (r) => formatNumber(r.Total_Dispatched) },
    { key: 'BALKGS', label: 'Balance', align: 'right', render: (r) => <span className="font-semibold">{formatNumber(r.BALKGS)}</span> },
    { key: 'STATUS', label: 'Status', render: (r) => formatCell(r.STATUS) },
];
export default function OrdersPage({ menuKey }) {
    const meta = TITLES[menuKey];
    const [draft, setDraft] = useState('');
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState(null);
    const query = useInfiniteQuery({
        queryKey: ['orders', menuKey, search],
        queryFn: ({ pageParam }) => api.searchOrders(menuKey, pageParam, search),
        initialPageParam: 1,
        getNextPageParam: (last, pages) => (last.hasMore ? pages.length + 1 : undefined),
    });
    const rows = query.data?.pages.flatMap((p) => p.rows) ?? [];
    const first = query.data?.pages[0];
    const loadedBalance = rows.reduce((s, r) => s + toNumber(r.BALKGS), 0);
    return (<>
      <PageHeader title={meta.title} description={meta.description}/>

      <form role="search" className="flex flex-col gap-2 sm:flex-row" onSubmit={(e) => {
            e.preventDefault();
            setSearch(draft.trim());
        }}>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true"/>
          <label htmlFor="order-search" className="sr-only">
            Search orders
          </label>
          <Input id="order-search" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="e.g. RAYMOND NAVY PIQUE" className="h-11 pl-9"/>
        </div>
        <div className="flex gap-2">
          <Button type="submit" size="lg" className="flex-1 sm:flex-none" loading={query.isFetching && !query.isFetchingNextPage}>
            Search
          </Button>
          {search && (<Button variant="outline" size="lg" onClick={() => {
                setDraft('');
                setSearch('');
            }}>
              <X aria-hidden="true"/>
              Clear
            </Button>)}
        </div>
      </form>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Total pending (kg)" value={formatNumber(first?.totalPending ?? 0, 0)} tone="primary"/>
        <Stat label="Total pending (m)" value={formatNumber(first?.totalMtr ?? 0, 0)}/>
        <Stat label="Orders loaded" value={rows.length.toLocaleString('en-IN')}/>
        <Stat label="Loaded balance (kg)" value={formatNumber(loadedBalance, 0)}/>
      </div>

      <DataTable rows={rows} columns={columns} isLoading={query.isLoading} error={query.error ? errorMessage(query.error) : null} onRetry={() => query.refetch()} exportName={meta.title.toLowerCase().replace(/\s+/g, '-')} description={search ? `Results for "${search}"` : 'Click an order for lots and dispatch details'} onRowClick={setSelected} emptyDescription={search ? 'Try fewer or different keywords.' : undefined} footer={query.hasNextPage || query.isFetchingNextPage ? (<div className="flex justify-center">
              <Button variant="outline" onClick={() => query.fetchNextPage()} loading={query.isFetchingNextPage}>
                Load more orders
              </Button>
            </div>) : rows.length ? (<p className="text-center text-xs text-muted-foreground">All matching orders loaded.</p>) : null}/>

      <OrderDetailDialog order={selected} onClose={() => setSelected(null)}/>
    </>);
}
