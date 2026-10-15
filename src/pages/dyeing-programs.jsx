import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dyeingService } from '@/services/dyeing.service';
import { errorMessage } from '@/services/http/client';
import { formatDate, formatNumber, toNumber } from '@/utils/format';
import { DataTable } from '@/components/ui/data-table';
import { Badge, PageHeader, Stat } from '@/components/ui/panel';
import { ImportReportFilters, ImportReportPagination } from '@/components/reports/import-report-filters';

// Verified fields from Nathcolor-Backend/src/models/dyeing.model.js.
const columns = [
    { key: 'dyeingScheduleDate', label: 'Schedule date', render: (r) => formatDate(r.dyeingScheduleDate) },
    { key: 'dyeingScheduleNo', label: 'Schedule no.', render: (r) => <span className="font-medium text-primary">{r.dyeingScheduleNo ?? '—'}</span> },
    { key: 'orderId', label: 'Order ID' },
    { key: 'orderDate', label: 'Order date', render: (r) => formatDate(r.orderDate) },
    { key: 'deliveryDate', label: 'Delivery date', render: (r) => formatDate(r.deliveryDate) },
    { key: 'customerName', label: 'Customer' },
    { key: 'itemName', label: 'Fabric / Item' },
    { key: 'color', label: 'Colour' },
    { key: 'gsm', label: 'GSM', align: 'right', render: (r) => formatNumber(r.gsm, 1) },
    { key: 'width', label: 'Width', align: 'right', render: (r) => formatNumber(r.width, 1) },
    { key: 'jetNo', label: 'Jet no.' },
    { key: 'quantityKgs', label: 'Quantity (kg)', align: 'right', render: (r) => formatNumber(r.quantityKgs) },
    { key: 'quantityMtr', label: 'Quantity (m)', align: 'right', render: (r) => formatNumber(r.quantityMtr) },
    { key: 'jobCardNo', label: 'Job card', render: (r) => r.jobCardNo || <Badge tone="warning">Not assigned</Badge> },
    { key: 'balanceQtyKgs', label: 'Balance (kg)', align: 'right', render: (r) => formatNumber(r.balanceQtyKgs) },
    { key: 'pendingDays', label: 'Pending days', align: 'right', render: (r) => formatNumber(r.pendingDays, 0) },
    { key: 'remark', label: 'Remark' },
];

export default function DyeingProgramsPage() {
    const [params, setParams] = useState({ page: 1, limit: 100 });
    const query = useQuery({
        queryKey: ['dyeing-programs', params],
        queryFn: () => dyeingService.dyeingPrograms(params),
        staleTime: 30_000,
        retry: 1,
    });
    const rows = query.data?.rows ?? [];
    const pagination = query.data?.pagination;
    const totalKgs = rows.reduce((sum, r) => sum + toNumber(r.quantityKgs), 0);
    const balanceKgs = rows.reduce((sum, r) => sum + toNumber(r.balanceQtyKgs), 0);
    const updatePage = (page) => setParams((previous) => ({ ...previous, page }));

    return <div className="flex min-w-0 flex-col gap-4">
      <PageHeader title="Dyeing Programs" description="View uploaded dyeing schedules, search customer and orders, or filter by schedule date." />
      <ImportReportFilters kind="dyeing" loading={query.isFetching} onApply={setParams} onRefresh={() => query.refetch()}/>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Total matching schedules" value={formatNumber(pagination?.totalEntries ?? 0, 0)}/>
        <Stat label="Records on page" value={formatNumber(rows.length, 0)}/>
        <Stat label="Quantity on page (kg)" value={formatNumber(totalKgs)} tone="primary"/>
        <Stat label="Balance on page (kg)" value={formatNumber(balanceKgs)} tone="accent"/>
      </div>
      <DataTable
        rows={rows}
        columns={columns}
        isLoading={query.isPending}
        error={query.error ? errorMessage(query.error) : null}
        onRetry={() => query.refetch()}
        searchable={false}
        exportName="dyeing-schedules-page"
        emptyTitle="No dyeing programs found"
        emptyDescription="No records are available for this report or date selection. You can import dyeing programs from the Imports menu."
      />
      <ImportReportPagination pagination={pagination} disabled={query.isFetching} onPageChange={updatePage}/>
    </div>;
}
