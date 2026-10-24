import { useEffect, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { ordersService } from "@/services/orders.service";
import { errorMessage } from "@/services/http/client";
import { retryReadOnce } from "@/services/http/retry";
import {
  formatCell,
  formatDate,
  formatNumber,
  pickString,
} from "@/utils/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader, Stat } from "@/components/ui/panel";
import { OrderDetailDialog } from "@/components/orders/order-detail-dialog";
const TITLES = {
  SearchOrdersPageKey: {
    title: "All Orders",
    description:
      "Search the full order book by order number, customer, fabric, color or PO.",
  },
  DomesticPendingOrdersPageKey: {
    title: "Domestic Pending Orders",
    description: "Domestic orders with balance quantity yet to dispatch.",
  },
  BrandsPendingOrdersPageKey: {
    title: "Brands Pending Orders",
    description: "Brand orders with balance quantity yet to dispatch.",
  },
};
const legacyColumns = [
  {
    key: "ORDERNUMBER",
    label: "Order",
    render: (r) => (
      <span className="font-medium text-primary">
        {pickString(r, "ORDERNUMBER", "ORDERID")}
      </span>
    ),
  },
  {
    key: "ORD_DATE",
    label: "Date",
    render: (r) => (r.ORD_DATE ? formatDate(r.ORD_DATE) : "—"),
  },
  { key: "CUSTOMERNAME", label: "Customer", className: "max-w-56 truncate" },
  { key: "BRANDNAME", label: "Brand" },
  { key: "UPPERFABRICNAME", label: "Fabric", className: "max-w-64 truncate" },
  { key: "UPPERCOLOR", label: "Color" },
  {
    key: "ORD_QTY",
    label: "Ord qty",
    align: "right",
    render: (r) => formatNumber(r.ORD_QTY ?? r.KGS),
  },
  {
    key: "GREIGE_ISSUED_KGS",
    label: "Issued",
    align: "right",
    render: (r) => formatNumber(r.GREIGE_ISSUED_KGS),
  },
  {
    key: "Total_Dispatched",
    label: "Dispatched",
    align: "right",
    render: (r) => formatNumber(r.Total_Dispatched),
  },
  {
    key: "BALKGS",
    label: "Balance",
    align: "right",
    render: (r) => (
      <span className="font-semibold">{formatNumber(r.BALKGS)}</span>
    ),
  },
  { key: "STATUS", label: "Status", render: (r) => formatCell(r.STATUS) },
];
const orderBookColumns = [
  {
    key: "orderId",
    label: "Order",
    render: (r) => (
      <span className="font-medium text-primary">{r.orderId ?? "—"}</span>
    ),
  },
  {
    key: "receivedDate",
    label: "Date",
    render: (r) => (r.receivedDate ? formatDate(r.receivedDate) : "—"),
  },
  { key: "customerName", label: "Customer", className: "max-w-56 truncate" },
  { key: "brandName", label: "Brand" },
  { key: "upperFabricName", label: "Fabric", className: "max-w-64 truncate" },
  { key: "upperColor", label: "Color" },
  {
    key: "quantity",
    label: "Ord qty",
    align: "right",
    render: (r) => formatNumber(r.quantity),
  },
  { key: "uom", label: "UOM" },
  { key: "refPO", label: "Customer PO" },
  {
    key: "storeType",
    label: "Store type",
    render: (r) => formatCell(r.storeType),
  },
];
export default function OrdersPage({ menuKey }) {
  const meta = TITLES[menuKey];
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [orderBookPage, setOrderBookPage] = useState(1);
  const [orderBookLimit, setOrderBookLimit] = useState(50);
  const [orderBookSort, setOrderBookSort] = useState(null);
  const isOrderBook = menuKey === "SearchOrdersPageKey";

  const legacyQuery = useInfiniteQuery({
    queryKey: ["orders-legacy", menuKey, search],
    queryFn: ({ pageParam }) =>
      ordersService.searchOrders(menuKey, pageParam, search),
    initialPageParam: 1,
    getNextPageParam: (last, pages) =>
      last.hasMore ? pages.length + 1 : undefined,
    enabled: !isOrderBook,
  });
  const orderBookQuery = useQuery({
    queryKey: [
      "order-book",
      orderBookPage,
      orderBookLimit,
      search,
      orderBookSort,
    ],
    queryFn: ({ signal }) =>
      ordersService.fetchOrderBook(
        orderBookPage,
        search,
        orderBookLimit,
        orderBookSort,
        signal,
      ),
    enabled: isOrderBook,
    staleTime: 30_000,
    retry: retryReadOnce,
  });
  const query = isOrderBook ? orderBookQuery : legacyQuery;
  const rows = isOrderBook
    ? (orderBookQuery.data?.rows ?? [])
    : (legacyQuery.data?.pages.flatMap((page) => page.rows) ?? []);
  const first = isOrderBook ? orderBookQuery.data : legacyQuery.data?.pages[0];
  const pagination = orderBookQuery.data?.pagination;
  // If the dataset shrinks after a new ERP import, return to the last valid page.
  useEffect(() => {
    if (isOrderBook && pagination && pagination.currentPage !== orderBookPage) {
      setOrderBookPage(pagination.currentPage);
    }
  }, [isOrderBook, pagination?.currentPage, orderBookPage]);
  const changePageSize = (size) => {
    setSelected(null);
    setOrderBookPage(1);
    setOrderBookLimit(size);
  };
  const changeSorting = (sorting) => {
    setSelected(null);
    setOrderBookPage(1);
    setOrderBookSort(sorting);
  };
  const summary = orderBookQuery.data?.summary;
  const columns = isOrderBook ? orderBookColumns : legacyColumns;

  return (
    <>
      <PageHeader title={meta.title} description={meta.description} />

      <form
        role="search"
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(draft.trim());
          setOrderBookPage(1);
        }}
      >
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <label htmlFor="order-search" className="sr-only">
            Search orders
          </label>
          <Input
            id="order-search"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="e.g. RAYMOND NAVY PIQUE"
            className="h-11 pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button
            type="submit"
            size="lg"
            className="flex-1 sm:flex-none"
            loading={query.isFetching && !query.isFetchingNextPage}
          >
            Search
          </Button>
          {search && (
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                setDraft("");
                setSearch("");
                setOrderBookPage(1);
              }}
            >
              <X aria-hidden="true" />
              Clear
            </Button>
          )}
        </div>
      </form>

      {isOrderBook ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat
            label="order lines"
            value={
              query.isLoading || query.isError || !summary
                ? "—"
                : formatNumber(summary.totalLines, 0)
            }
            tone="primary"
            hint="All ERP Order Book lines"
          />
          <Stat
            label="Ordered MTR "
            value={
              query.isLoading || query.isError || !summary
                ? "—"
                : formatNumber(summary.orderedMtr, 2)
            }
            hint="Only MTR/METER/METERS records"
          />
          <Stat
            label="Ordered KG "
            value={
              query.isLoading || query.isError || !summary
                ? "—"
                : formatNumber(summary.orderedKg, 2)
            }
            hint="Only KG/KGS records"
          />
          <Stat
            label="Other UOM lines"
            value={
              query.isLoading || query.isError || !summary
                ? "—"
                : formatNumber(summary.otherUomLines, 0)
            }
            hint="PRS/PAIRS and other units are never converted into KG/MTR"
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat
            label="Pending KG · reported"
            value={
              query.isLoading || query.isError || first?.totalPending == null
                ? "—"
                : formatNumber(first.totalPending, 0)
            }
            tone="primary"
            hint="Legacy report total when provided"
          />
          <Stat
            label="Pending MTR · reported"
            value={
              query.isLoading || query.isError || first?.totalMtr == null
                ? "—"
                : formatNumber(first.totalMtr, 0)
            }
            hint="Legacy report total when provided"
          />
        </div>
      )}

      {isOrderBook && summary?.byUom?.length > 0 && !query.isError && (
        <div
          className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
          aria-label="ERP ordered quantities by unit"
        >
          <span className="font-medium">All quantities by UOM:</span>
          {summary.byUom.map(({ uom, lines, quantity }) => (
            <span
              key={uom}
              className="rounded-md border border-border bg-surface px-2.5 py-1"
            >
              <strong className="text-foreground">
                {formatNumber(quantity, 2)} {uom}
              </strong>{" "}
              · {formatNumber(lines, 0)} lines
            </span>
          ))}
        </div>
      )}

      <DataTable
        rows={rows}
        columns={columns}
        searchable={!isOrderBook}
        isFetching={query.isFetching}
        serverPagination={
          isOrderBook
            ? {
                pagination,
                disabled: query.isFetching,
                onPageChange: (page) => {
                  setSelected(null);
                  setOrderBookPage(page);
                },
                onPageSizeChange: changePageSize,
              }
            : undefined
        }
        serverSort={isOrderBook ? orderBookSort : undefined}
        onServerSortChange={isOrderBook ? changeSorting : undefined}
        isLoading={query.isLoading}
        error={query.error ? errorMessage(query.error) : null}
        onRetry={() => query.refetch()}
        exportName={meta.title.toLowerCase().replace(/\s+/g, "-")}
        description={
          search
            ? `Results for "${search}"`
            : "Click an order to see imported order facts and linked schedule/job cards"
        }
        onRowClick={setSelected}
        emptyDescription={
          search ? "Try fewer or different keywords." : undefined
        }
        loadMore={
          !isOrderBook && legacyQuery.hasNextPage
            ? {
                onClick: () => legacyQuery.fetchNextPage(),
                loading: legacyQuery.isFetchingNextPage,
              }
            : undefined
        }
      />

      <OrderDetailDialog order={selected} onClose={() => setSelected(null)} />
    </>
  );
}
