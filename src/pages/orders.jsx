import { useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import { ordersService } from '@/services/orders.service';
import { errorMessage } from '@/services/http/client';
import { formatCell, formatDate, formatNumber, pickString, toNumber } from '@/utils/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';
import { DataTable } from '@/components/ui/data-table';
import { PageHeader, Stat } from '@/components/ui/panel';
import { OrderDetailDialog } from '@/components/orders/order-detail-dialog';
import { ImportReportPagination } from '@/components/reports/import-report-filters';
const TITLES = {
    SearchOrdersPageKey: { title: 'All Orders', description: 'Search the full order book by order number, customer, fabric, color or PO.' },
    DomesticPendingOrdersPageKey: { title: 'Domestic Pending Orders', description: 'Domestic orders with balance quantity yet to dispatch.' },
    BrandsPendingOrdersPageKey: { title: 'Brands Pending Orders', description: 'Brand orders with balance quantity yet to dispatch.' },
};
const legacyColumns = [
    { key: 'ORDERNUMBER', label: 'Order', render: (r) => <span className="font-medium text-primary">{pickString(r, 'ORDERNUMBER', 'ORDERID')}</span> },
    { key: 'ORD_DATE', label: 'Date', render: (r) => r.ORD_DATE ? formatDate(r.ORD_DATE) : '—' },
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
const orderBookColumns = [
    { key: 'orderId', label: 'Order', render: (r) => <span className="font-medium text-primary">{r.orderId ?? '—'}</span> },
    { key: 'receivedDate', label: 'Date', render: (r) => r.receivedDate ? formatDate(r.receivedDate) : '—' },
    { key: 'customerName', label: 'Customer', className: 'max-w-56 truncate' },
    { key: 'brandName', label: 'Brand' },
    { key: 'upperFabricName', label: 'Fabric', className: 'max-w-64 truncate' },
    { key: 'upperColor', label: 'Color' },
    { key: 'quantity', label: 'Ord qty', align: 'right', render: (r) => formatNumber(r.quantity) },
    { key: 'uom', label: 'UOM' },
    { key: 'refPO', label: 'Customer PO' },
    { key: 'storeType', label: 'Store type', render: (r) => formatCell(r.storeType) },
];
export default function OrdersPage({ menuKey }) {
    const meta = TITLES[menuKey];
    const [draft, setDraft] = useState('');
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState(null);
    const [orderBookPage, setOrderBookPage] = useState(1);
    const isOrderBook = menuKey === 'SearchOrdersPageKey';

    const legacyQuery = useInfiniteQuery({
        queryKey: ['orders-legacy', menuKey, search],
        queryFn: ({ pageParam }) => ordersService.searchOrders(menuKey, pageParam, search),
        initialPageParam: 1,
        getNextPageParam: (last, pages) => (last.hasMore ? pages.length + 1 : undefined),
        enabled: !isOrderBook,
    });
    const orderBookQuery = useQuery({
        queryKey: ['order-book', orderBookPage, search],
        queryFn: () => ordersService.fetchOrderBook(orderBookPage, search),
        enabled: isOrderBook,
        staleTime: 30_000,
        retry: 1,
    });
    const query = isOrderBook ? orderBookQuery : legacyQuery;
    const rows = isOrderBook
        ? (orderBookQuery.data?.rows ?? [])
        : (legacyQuery.data?.pages.flatMap((page) => page.rows) ?? []);
    const first = isOrderBook ? orderBookQuery.data : legacyQuery.data?.pages[0];
    const pagination = orderBookQuery.data?.pagination;
    const quantitiesByUnit = rows.reduce((map,row) => {
      const unit = String(row.uom || 'UNSPECIFIED').toUpperCase().trim();
      map[unit] = (map[unit] || 0) + toNumber(row.quantity);
      return map;
    }, {});
    const loadedBalance = rows.reduce((sum,row) => sum + toNumber(row.BALKGS), 0);
    const columns = isOrderBook ? orderBookColumns : legacyColumns;

    return (<>
      <PageHeader title={meta.title} description={meta.description}/>

      <form role="search" className="flex flex-col gap-2 sm:flex-row" onSubmit={(e) => {
            e.preventDefault();
            setSearch(draft.trim());
            setOrderBookPage(1);
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
                setOrderBookPage(1);
            }}>
              <X aria-hidden="true"/>
              Clear
            </Button>)}
        </div>
      </form>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {query.isLoading || query.isError ? ['Order lines', 'Ordered MTR', 'Ordered KG', 'Other UOM lines'].map(label => <Stat key={label} label={label} value="—" />) : isOrderBook ? <>
          <Stat label="Order lines on this page" value={rows.length.toLocaleString('en-IN')} tone="primary"/>
          <Stat label="Ordered MTR (page)" value={formatNumber((quantitiesByUnit.MTR||0)+(quantitiesByUnit.METERS||0),2)}/>
          <Stat label="Ordered KG (page)" value={formatNumber((quantitiesByUnit.KG||0)+(quantitiesByUnit.KGS||0),2)}/>
          <Stat label="Other UOM lines" value={rows.filter(r=>!['MTR','METERS','KG','KGS'].includes(String(r.uom||'').toUpperCase())).length}/>
        </> : <>
          <Stat label="Total pending KG" value={formatNumber(first?.totalPending,0)} tone="primary"/>
          <Stat label="Total pending M" value={formatNumber(first?.totalMtr,0)}/>
          <Stat label="Orders loaded" value={rows.length.toLocaleString('en-IN')}/>
          <Stat label="Loaded balance KG" value={formatNumber(loadedBalance,0)}/>
        </>}
      </div>

      <DataTable rows={rows} columns={columns} isLoading={query.isLoading} error={query.error ? errorMessage(query.error) : null} onRetry={() => query.refetch()} exportName={meta.title.toLowerCase().replace(/\s+/g, '-')} description={search ? `Results for "${search}"` : 'Click an order to see imported order facts and linked schedule/job cards'} onRowClick={setSelected} emptyDescription={search ? 'Try fewer or different keywords.' : undefined} footer={!isOrderBook && (legacyQuery.hasNextPage || legacyQuery.isFetchingNextPage) ? (<div className="flex justify-center">
              <Button variant="outline" onClick={() => legacyQuery.fetchNextPage()} loading={legacyQuery.isFetchingNextPage}>
                Load more orders
              </Button>
            </div>) : !isOrderBook && rows.length ? (<p className="text-center text-xs text-muted-foreground">All matching orders loaded.</p>) : null}/>

      {isOrderBook && <ImportReportPagination pagination={pagination} disabled={orderBookQuery.isFetching} onPageChange={setOrderBookPage}/>}
      <OrderDetailDialog order={selected} onClose={() => setSelected(null)}/>
    </>);
}
