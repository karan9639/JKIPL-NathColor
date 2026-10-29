import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Search } from 'lucide-react';
import { greigeStockService } from '@/services/greige-stock.service';
import { errorMessage } from '@/services/http/client';
import { formatDate, formatNumber, toNumber, rowField } from '@/utils/format';
import { exportRowsToXlsx } from '@/utils/spreadsheet';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/field';
import { PageHeader, Stat } from '@/components/ui/panel';

// Preserve the ERP U-1 ledger columns used for the physical Unit-3 stock.
const qtyColumn = (key, label) => ({
  key,
  label,
  align: 'right',
  render: (row) => formatNumber(rowField(row, key)),
  sortValue: (row) => toNumber(rowField(row, key)),
});

const u3Columns = [
  { key: 'itemName', label: 'Item Name', render: (row) => <span className="font-medium">{row.itemName}</span> },
  { key: 'uom', label: 'UOM' },
  qtyColumn('opening.qty', 'Opening Qty'),
  qtyColumn('opening.qtyKgs', 'Opening Qty Kgs'),
  qtyColumn('receipt.qty', 'Receipt Qty'),
  qtyColumn('receipt.qtyKgs', 'Receipt Qty Kgs'),
  qtyColumn('issue.qty', 'Issue Qty'),
  qtyColumn('issue.qtyKgs', 'Issue Qty Kgs'),
  qtyColumn('closing.qty', 'Closing Qty'),
  qtyColumn('closing.qtyKgs', 'Closing Qty Kgs'),
  { key: 'lastReceived.date', label: 'Last Received Date', render: (row) => row.lastReceived?.date ? formatDate(row.lastReceived.date, true) : '—' },
  qtyColumn('lastReceived.qtyKgs', 'Last Received Qty Kgs'),
  { key: 'lastIssue.date', label: 'Last Issue Date', render: (row) => row.lastIssue?.date ? formatDate(row.lastIssue.date, true) : '—' },
  qtyColumn('lastIssue.qtyKgs', 'Last Issue Qty Kgs'),
];

const u2Columns = [
  { key: 'fabricName', label: 'Fabric Name', render: (row) => <span className="font-medium">{row.fabricName}</span> },
  qtyColumn('currentStock', 'Current Stock'),
  { key: 'updatedAt', label: 'Imported At', render: (row) => row.updatedAt ? formatDate(row.updatedAt, true) : '—' },
];

const EMPTY_SUMMARY = { qualities: 0, totalStock: 0, outOfStock: 0, below500: 0 };

// Backward compatibility only: older Railway builds returned 404 on a valid
// empty report. Never swallow authentication, transport, or other 404 failures.
function isKnownEmptyError(error) {
  return Number(error?.status ?? error?.response?.status) === 404 &&
    /no (?:u[23]\s+)?greige stock records found for the selected search/i.test(
      String(error?.message ?? error?.response?.data?.message ?? '')
    );
}

async function fetchStockPage(unit, params, signal) {
  try {
    return await greigeStockService.fetchPage(unit, params, signal);
  } catch (error) {
    if (!isKnownEmptyError(error)) throw error;
    return {
      rows: [],
      summary: EMPTY_SUMMARY,
      pagination: {
        totalEntries: 0,
        totalPages: 1,
        currentPage: 1,
        limit: params.limit,
        hasNextPage: false,
        hasPrevPage: false,
      },
    };
  }
}

export default function GreigeStockPage() {
  const [unit, setUnit] = useState('u2');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [sort, setSort] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  // One request after the user stops typing, not one request per keystroke.
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const nextSearch = searchInput.trim();
      if (nextSearch !== search) {
        setPage(1);
        setSearch(nextSearch);
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchInput, search]);

  const params = { page, limit, search, sortBy: sort?.key, sortDir: sort?.dir };
  const query = useQuery({
    queryKey: ['greige-stock', unit, page, limit, search, sort?.key, sort?.dir],
    queryFn: ({ signal }) => fetchStockPage(unit, params, signal),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    retry: (attempt, error) => attempt < 1 && (!error?.status || Number(error.status) >= 500),
  });

  const rows = query.data?.rows ?? [];
  const summary = query.data?.summary;
  const pagination = query.data?.pagination;
  const unavailable = query.isPending || query.isError || !summary;
  const columns = unit === 'u3' ? u3Columns : u2Columns;

  // Retain complete ERP export, but only download every page when the user
  // explicitly presses "Export all". Normal page loads fetch exactly one page.
  async function exportAll() {
    if (exporting) return;
    setExportError('');
    setExporting(true);
    try {
      const allRows = unit === 'u3'
        ? await greigeStockService.fetchAllU3()
        : await greigeStockService.fetchAllU2();
      const matchingRows = search
        ? allRows.filter((row) => String(row[unit === 'u3' ? 'itemName' : 'fabricName'] ?? '').toLowerCase().includes(search.toLowerCase()))
        : allRows;
      await exportRowsToXlsx(
        matchingRows.map((row) => Object.fromEntries(columns.map((column) => [column.key, rowField(row, column.key) ?? '']))),
        columns.map((column) => column.key),
        `greige-stock-${unit}-all`,
      );
    } catch (error) {
      setExportError(errorMessage(error));
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <PageHeader
        title="Greige Stock"
        description={unit === 'u3'
          ? 'ERP U-1 stock ledger (shown in NathColor as U-3; confirm physical unit mapping). Original A–N ledger fields and precise KG values.'
          : 'Unit-2 greige stock report: Fabric Name and Current Stock. The source report does not explicitly specify the stock UOM.'}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label={unit === 'u3' ? 'Closing stock (KG)' : 'Total reported stock'} value={unavailable ? '—' : formatNumber(summary.totalStock, unit === 'u3' ? 2 : 0)} tone="primary" />
        <Stat label="Qualities" value={unavailable ? '—' : summary.qualities} />
        <Stat label="Out of Stock" value={unavailable ? '—' : summary.outOfStock} tone="accent" />
        <Stat label={unit === 'u3' ? 'Below 500 KG' : 'Below 500 (reported unit)'} value={unavailable ? '—' : summary.below500} />
      </div>

      {exportError && <p role="alert" className="text-sm text-red-600">Export failed: {exportError}</p>}
      <DataTable
        key={unit}
        title="Greige stock records"
        rows={rows}
        columns={columns}
        isLoading={query.isPending}
        isFetching={query.isFetching}
        error={query.isError ? errorMessage(query.error) : null}
        onRetry={() => query.refetch()}
        searchable={false}
        serverSort={sort}
        onServerSortChange={(newSort) => { setSort(newSort); setPage(1); }}
        serverPagination={{
          pagination,
          disabled: query.isFetching,
          onPageChange: setPage,
          onPageSizeChange: (nextLimit) => { setLimit(nextLimit); setPage(1); },
        }}
        exportName={`greige-stock-${unit}-page`}
        emptyTitle={search ? 'No matching greige stock records' : 'No stock data imported'}
        emptyDescription={search
          ? 'Try another item or fabric name.'
          : 'Upload the latest ERP stock report in ERP Imports, then refresh this page.'}
        toolbar={
          <>
            <label htmlFor="greige-unit" className="sr-only">Select stock unit</label>
            <Select
              id="greige-unit"
              value={unit}
              onChange={(event) => {
                setUnit(event.target.value);
                setPage(1);
                setSort(null);
                setSearch('');
                setSearchInput('');
              }}
              className="h-9 w-full sm:w-44"
            >
              <option value="u2">Unit-2 Greige</option>
              <option value="u3">U-3 (ERP U-1)</option>
            </Select>
            <div className="relative w-full sm:w-56">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <label htmlFor="greige-search" className="sr-only">Search all greige stock records</label>
              <Input
                id="greige-search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search all stock..."
                className="h-9 pl-9"
              />
            </div>
            <Button variant="outline" size="sm" className="h-9" disabled={exporting || !pagination?.totalEntries} onClick={exportAll}>
              <Download aria-hidden="true" />{exporting ? 'Exporting…' : 'Export all'}
            </Button>
          </>
        }
      />
    </div>
  );
}
