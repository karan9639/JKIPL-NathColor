import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { yarnService } from '@/services/yarn.service';
import { errorMessage } from '@/services/http/client';
import { formatDate, formatNumber, toNumber } from '@/utils/format';
import { DataTable } from '@/components/ui/data-table';
import { PageHeader, Stat } from '@/components/ui/panel';
import { ImportReportFilters, ImportReportPagination } from '@/components/reports/import-report-filters';

// Verified fields from Nathcolor-Backend/src/models/yarnstock.model.js.
const columns = [
    { key: 'itemCode', label: 'Item code' },
    { key: 'itemName', label: 'Yarn / Item', render: (r) => <span className="font-medium">{r.itemName ?? '—'}</span> },
    { key: 'mainGroup', label: 'Main group' },
    { key: 'mainProduct', label: 'Product' },
    { key: 'subGroup', label: 'Subgroup' },
    { key: 'color', label: 'Colour' },
    { key: 'uom', label: 'UOM' },
    { key: 'opening.qty', label: 'Opening', align: 'right', sortValue: (r) => toNumber(r.opening?.qty), render: (r) => formatNumber(r.opening?.qty) },
    { key: 'receipt.qty', label: 'Receipt', align: 'right', sortValue: (r) => toNumber(r.receipt?.qty), render: (r) => formatNumber(r.receipt?.qty) },
    { key: 'issue.qty', label: 'Issue', align: 'right', sortValue: (r) => toNumber(r.issue?.qty), render: (r) => formatNumber(r.issue?.qty) },
    { key: 'closing.qty', label: 'Closing', align: 'right', sortValue: (r) => toNumber(r.closing?.qty), render: (r) => <span className="font-semibold">{formatNumber(r.closing?.qty)}</span> },
    { key: 'closing.value', label: 'Closing value', align: 'right', sortValue: (r) => toNumber(r.closing?.value), render: (r) => formatNumber(r.closing?.value) },
    { key: 'closing.rate', label: 'Rate', align: 'right', sortValue: (r) => toNumber(r.closing?.rate), render: (r) => formatNumber(r.closing?.rate) },
    { key: 'lastIssueDate', label: 'Last issue', render: (r) => r.lastIssueDate ? formatDate(r.lastIssueDate) : '—' },
    { key: 'reportPeriod.toDate', label: 'Report to date', render: (r) => r.reportPeriod?.toDate ? formatDate(r.reportPeriod.toDate) : '—' },
];

export default function YarnStockPage() {
    const [params, setParams] = useState({ page: 1, limit: 100 });
    const query = useQuery({
        queryKey: ['yarn-stock', params],
        queryFn: () => yarnService.yarnStock(params),
        staleTime: 30_000,
        retry: 1,
    });
    const rows = query.data?.rows ?? [];
    const pagination = query.data?.pagination;
    const closing = rows.reduce((totals, row) => {
        const unit = String(row.uom || 'Unspecified').trim().toUpperCase();
        if (row.closing?.qty != null && row.closing.qty !== '') totals[unit] = (totals[unit] ?? 0) + toNumber(row.closing.qty);
        return totals;
    }, {});
    const unavailable = query.isPending || query.isError;
    const stockValue = rows.reduce((sum, row) => sum + toNumber(row.closing?.value), 0);
    const updatePage = (page) => setParams((previous) => ({ ...previous, page }));

    return <div className="flex min-w-0 flex-col gap-4">
      <PageHeader title="Yarn Stock" description="Item-wise opening, receipts, issues and closing stock from the uploaded Yarn Stock report."/>
      <ImportReportFilters kind="yarn" loading={query.isFetching} onApply={setParams} onRefresh={() => query.refetch()}/>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Total matching items" value={unavailable ? '—' : formatNumber(pagination?.totalEntries, 0)}/>
        <Stat label="Items on page" value={unavailable ? '—' : formatNumber(rows.length, 0)}/>
        <Stat label="Page closing quantity" value={unavailable ? '—' : Object.entries(closing).map(([unit, value]) => `${formatNumber(value)} ${unit}`).join(' · ') || '—'} tone="primary" hint="Reported quantities, grouped by UOM"/>
        <Stat label="Page closing value" value={unavailable ? '—' : formatNumber(stockValue)} />
      </div>
      <DataTable
        rows={rows}
        columns={columns}
        isLoading={query.isPending}
        error={query.error ? errorMessage(query.error) : null}
        onRetry={() => query.refetch()}
        exportName="yarn-stock-page"
        emptyTitle="No yarn stock records found"
        emptyDescription="No stock report is available for the selected date. Import Yarn Stock from the Imports menu to add records."
      />
      <ImportReportPagination pagination={pagination} disabled={query.isFetching} onPageChange={updatePage}/>
    </div>;
}
