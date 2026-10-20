import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { greigeStockService } from '@/services/greige-stock.service';
import { errorMessage } from '@/services/http/client';
import { formatDate, formatNumber, toNumber } from '@/utils/format';
import { DataTable } from '@/components/ui/data-table';
import { Select } from '@/components/ui/field';
import { PageHeader, Stat } from '@/components/ui/panel';

const columns = [
    { key: 'FABRICNAME', label: 'Fabric / Item', render: (r) => <span className="font-medium">{String(r.FABRICNAME ?? r.FabricName ?? r.fabricName ?? r.fabric ?? r.itemName ?? '')}</span> },
    { key: 'STOCK', label: 'Stock (kg)', align: 'right', render: (r) => <span className="font-semibold">{formatNumber(r.STOCK ?? r.stock ?? r.currentStock ?? r.closing?.qtyKgs ?? r.closing?.qty)}</span> },
    { key: 'LRD', label: 'Last receipt', render: (r) => formatDate(r.LRD ?? r.lastReceiptDate ?? r.lastReceived?.date, true) },
    { key: 'LRQ', label: 'Receipt qty', align: 'right', render: (r) => formatNumber(r.LRQ ?? r.receiptQty ?? r.lastReceived?.qtyKgs ?? r.receipt?.qtyKgs ?? r.receipt?.qty) },
    { key: 'LID', label: 'Last issue', render: (r) => formatDate(r.LID ?? r.lastIssueDate ?? r.lastIssue?.date, true) },
    { key: 'LIQ', label: 'Issue qty', align: 'right', render: (r) => formatNumber(r.LIQ ?? r.issueQty ?? r.lastIssue?.qtyKgs ?? r.issue?.qtyKgs ?? r.issue?.qty) },
    { key: 'LUD', label: 'Updated', render: (r) => formatDate(r.LUD ?? r.updatedAt ?? r.updatedAt, true) },
];

export default function GreigeStockPage() {
    const [unit, setUnit] = useState('u2');
    const query = useQuery({
        queryKey: ['greige-stock', unit],
        queryFn: () => unit === 'u3'
            ? greigeStockService.fetchU3({ page: 1, limit: 100 })
            : greigeStockService.fetchU2({ page: 1, limit: 100 }),
        keepPreviousData: true,
    });

    const rows = useMemo(() => query.data ?? [], [query.data]);
    const stockValue = (row) => row.STOCK ?? row.stock ?? row.currentStock ?? row.closing?.qtyKgs ?? row.closing?.qty;
    const total = rows.reduce((sum, row) => sum + toNumber(stockValue(row)), 0);

    return (<>
        <PageHeader title="Greige Stock" description={`Current greige fabric stock for Unit ${unit === 'u2' ? '2' : '3'} with last receipt and issue.`} />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Total stock (kg)" value={formatNumber(total, 0)} tone="primary" />
            <Stat label="Qualities" value={rows.length} />
            <Stat label="Out of stock" value={rows.filter((r) => toNumber(stockValue(r)) <= 0).length} tone="accent" />
            <Stat label="Below 500 kg" value={rows.filter((r) => { const stock = toNumber(stockValue(r)); return stock > 0 && stock < 500; }).length} />
        </div>
        <DataTable
            rows={rows}
            columns={columns}
            isLoading={query.isLoading}
            error={query.error ? errorMessage(query.error) : null}
            onRetry={() => void query.refetch()}
            exportName={`greige-stock-${unit}`}
            toolbar={<>
                <label htmlFor="greige-unit" className="sr-only">Unit</label>
                <Select id="greige-unit" value={unit} onChange={(event) => setUnit(event.target.value)} className="h-9 w-32">
                    <option value="u2">Unit 2</option>
                    <option value="u3">Unit 3</option>
                </Select>
            </>}
        />
    </>);
}
