import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ClipboardList, RefreshCcw } from 'lucide-react';

import { ordersService } from '@/services/orders.service';
import { http, errorMessage } from '@/services/http/client';
import { PageHeader, Panel, PanelHeader, ErrorState, EmptyState, Stat, Badge } from '@/components/ui/panel';
import { Field, Input } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { formatCell, formatDate, formatNumber, pickString } from '@/utils/format';
import {
  normalizedLotRows,
  orderTrackerStatus,
  trackerSummaryValue,
  uniqueOrderUnits,
} from '@/utils/order-tracker-presentation';

const STAGES = [
  { key: 'dyes', name: 'Dyes & Chemicals' },
  { key: 'jet', name: 'Jet Loading' },
  { key: 'rope', name: 'Rope Opener' },
  { key: 'heat', name: 'Heat Setting' },
  { key: 'finish', name: 'Finishing' },
];

function OrderFacts({ orders }) {
  if (!orders.length) return null;

  const first = orders[0];
  const facts = [
    ['Customer', pickString(first, 'customerName', 'CUSTOMERNAME')],
    ['Fabric / Item', pickString(first, 'itemName', 'upperFabricName')],
    ['Colour', pickString(first, 'upperColor', 'color')],
    ['Customer PO', pickString(first, 'refPO')],
  ];

  return (
    <Panel>
      <PanelHeader title="Customer order" description="Imported ERP Order Book data (independent of job-card availability)" />
      <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
        {facts.map(([label, value]) => (
          <div className="min-w-0" key={label}>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 break-words text-sm font-medium">{value || '—'}</p>
          </div>
        ))}
      </div>
      <div className="min-w-0 overflow-x-auto border-t border-border">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-muted text-xs text-muted-foreground">
            <tr><th className="px-4 py-2">Order ID</th><th className="px-4 py-2">Item</th><th className="px-4 py-2 text-right">Ordered quantity</th><th className="px-4 py-2">Delivery</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {orders.map((row, index) => (
              <tr key={row._id || `${row.orderId}-${index}`}>
                <td className="px-4 py-2 font-medium">{formatCell(row.orderId)}</td>
                <td className="px-4 py-2">{formatCell(row.itemName || row.upperFabricName)}</td>
                <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums">{formatNumber(row.quantity)} {formatCell(row.uom)}</td>
                <td className="whitespace-nowrap px-4 py-2">{row.deliveryDate ? formatDate(row.deliveryDate) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function LotRecords({ lots, trackingUnavailable }) {
  return (
    <Panel>
      <PanelHeader
        title="ERP Job Cards / Lots"
        description={`${lots.length} imported allocation line(s). One job card may cover multiple order IDs.`}
      />
      {lots.length === 0 ? (
        <div className="p-4 sm:p-5">
          <p className="font-medium">No open job card imported for this order yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Order tracking remains available. This does not confirm that greige stock is insufficient
            or that no work has happened outside the imported ERP records.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {lots.map((lot, index) => (
            <div key={`${lot.jobCardNo}-${lot.manualLotNo}-${index}`} className="space-y-3 p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">Job Card {lot.jobCardNo || '—'}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Manual Lot: {lot.manualLotNo || 'Not supplied'}
                    {' · '}{formatNumber(lot.kgs)} KG allocated
                  </p>
                </div>
                <Badge tone={lot.status === 'closed' ? 'success' : 'neutral'}>
                  {lot.status === 'closed' ? 'Closed' : lot.status === 'in-production' ? 'In production' : lot.status === 'open' ? 'Open' : 'Status unavailable'}
                </Badge>
              </div>
              {trackingUnavailable || lot.stageUnavailable ? (
                <p className="text-xs text-muted-foreground">Production-stage details currently unavailable.</p>
              ) : (
                <ol className="flex flex-wrap gap-2" aria-label="Recorded production stages">
                  {STAGES.map(({ key, name }) => {
                    const event = lot.events?.find((entry) => entry.stage === key);
                    return (
                      <li key={key} title={event?.eventDate ? formatDate(event.eventDate, true) : 'No event imported'}
                        className={`rounded-md border px-2.5 py-1.5 text-xs ${event ? 'border-green-300 bg-green-50 text-green-900' : 'border-border text-muted-foreground'}`}>
                        {name}: {event ? 'Recorded' : 'Not recorded'}
                      </li>
                    );
                  })}
                </ol>
              )}
              {lot.closedAt && <p className="text-xs text-muted-foreground">Closed: {formatDate(lot.closedAt, true)}</p>}
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

export default function OrderTrackerPage() {
  const [params, setParams] = useSearchParams();
  const orderId = String(params.get('orderId') || '').trim();
  const [draft, setDraft] = useState(orderId);

  useEffect(() => { setDraft(orderId); }, [orderId]);

  // Read the order summary independently: it still exists when no job card exists.
  const summaryQuery = useQuery({
    queryKey: ['order-summary', orderId],
    enabled: Boolean(orderId),
    queryFn: () => ordersService.fetchOrderSummary(orderId),
    staleTime: 30_000,
    retry: 1,
  });

  // Stage events can be missing; the order summary must still be displayed.
  const trackerQuery = useQuery({
    queryKey: ['order-tracker', orderId],
    enabled: Boolean(orderId),
    queryFn: async () => {
      const response = await http.get(`/orders/${encodeURIComponent(orderId)}/tracker`);
      return response.data?.data ?? response.data;
    },
    staleTime: 30_000,
    retry: 1,
  });

  const summary = summaryQuery.data;
  const tracking = trackerQuery.data;
  const orders = summary?.orders ?? tracking?.orders ?? [];
  const schedules = summary?.schedules ?? tracking?.schedules ?? [];
  const lots = normalizedLotRows(tracking, summary, trackerQuery.isError);
  const status = orderTrackerStatus({ orders, schedules, lots });
  const hasData = Boolean(summary || tracking);
  const loading = Boolean(orderId) && !hasData && (summaryQuery.isPending || trackerQuery.isPending);
  const notFound = Boolean(orderId) && !loading && !hasData && summaryQuery.isError && trackerQuery.isError;
  const requiredKg = trackerSummaryValue(tracking?.summary?.scheduledKgs, summary?.summary?.scheduledKg);
  const allocatedKg = trackerSummaryValue(tracking?.summary?.jobCardedKgs, summary?.summary?.jobCardAllocatedKg);
  const remainingKg = trackerSummaryValue(tracking?.summary?.balanceKgs, summary?.summary?.scheduleRemainderKg);
  const units = uniqueOrderUnits(orders);

  const submit = (event) => {
    event.preventDefault();
    const nextId = draft.trim();
    if (!nextId) return;
    if (nextId === orderId) {
      void summaryQuery.refetch();
      void trackerQuery.refetch();
    } else {
      setParams({ orderId: nextId });
    }
  };

  return (
    <div className="min-w-0 space-y-4 pb-6">
      <PageHeader title="Order-wise Production Tracker" description="Track any ERP Order ID, with or without a dyeing job card." />

      <Panel>
        <form onSubmit={submit} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
          <Field label="ERP Order ID" htmlFor="track-order" className="min-w-0 flex-1">
            <Input id="track-order" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="e.g. 193044" />
          </Field>
          <Button type="submit" disabled={!draft.trim()} className="sm:shrink-0">
            Track order <ArrowRight className="ml-2 size-4" aria-hidden="true" />
          </Button>
          {orderId && (
            <Button type="button" variant="outline" onClick={() => {
              void summaryQuery.refetch(); void trackerQuery.refetch();
            }} aria-label="Refresh order tracker">
              <RefreshCcw className="mr-2 size-4" aria-hidden="true" /> Refresh
            </Button>
          )}
        </form>
      </Panel>

      {!orderId && <EmptyState title="Enter an ERP Order ID" description="Orders can be tracked before dyeing schedules or job cards are imported." />}
      {loading && <Panel><div className="p-5 text-sm text-muted-foreground" role="status">Loading ERP order records…</div></Panel>}
      {notFound && <ErrorState message={errorMessage(summaryQuery.error || trackerQuery.error)} onRetry={() => {
        void summaryQuery.refetch(); void trackerQuery.refetch();
      }} />}

      {hasData && (
        <>
          <Panel className="p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <ClipboardList className="size-5 text-primary" aria-hidden="true" />
                <div>
                  <h2 className="font-semibold">ERP Order {orderId}</h2>
                  <p className="text-sm text-muted-foreground">{status}</p>
                </div>
              </div>
              <Badge tone="primary">{lots.length} job-card allocation(s)</Badge>
            </div>
          </Panel>

          {(summaryQuery.isError || trackerQuery.isError) && (
            <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950" role="status">
              Some linked ERP details are temporarily unavailable. Available imported information is displayed below; missing records are not treated as zero or completed.
            </p>
          )}

          <OrderFacts orders={orders} />

          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <Stat label="Order book lines" value={String(orders.length)} tone="primary" />
            <Stat label="Scheduled KG" value={formatNumber(requiredKg)} />
            <Stat label="Job-carded KG" value={formatNumber(allocatedKg)} />
            <Stat label="Schedule remainder KG" value={formatNumber(remainingKg)} />
          </div>

          {units.length > 0 && (
            <p className="rounded-md border border-border bg-surface p-3 text-sm text-muted-foreground">
              Order-book UOM: {units.join(', ')}. Dyeing schedule and job-card allocation quantities are in KG. No automatic unit conversion is applied.
            </p>
          )}

          {requiredKg != null && allocatedKg != null && allocatedKg > requiredKg && (
            <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950" role="alert">
              ERP reconciliation required: job-card allocation exceeds scheduled KG by {formatNumber(allocatedKg - requiredKg, 3)} KG.
            </p>
          )}

          <Panel>
            <PanelHeader title="Dyeing Schedules" description={`${schedules.length} imported schedule row(s)`} />
            {!schedules.length ? (
              <p className="p-4 text-sm text-muted-foreground">No dyeing schedule imported for this order yet. The customer order remains trackable.</p>
            ) : (
              <div className="min-w-0 overflow-x-auto">
                <table className="w-full min-w-[500px] text-left text-sm">
                  <thead className="bg-muted text-xs"><tr><th className="px-4 py-2">Schedule</th><th className="px-4 py-2">Fabric</th><th className="px-4 py-2 text-right">Scheduled KG</th><th className="px-4 py-2">Job Card</th></tr></thead>
                  <tbody className="divide-y divide-border">{schedules.map((row, index) => (
                    <tr key={row._id || index}><td className="px-4 py-2">{formatCell(row.dyeingScheduleNo)}</td><td className="px-4 py-2">{formatCell(row.itemName)}</td><td className="px-4 py-2 text-right">{formatNumber(row.quantityKgs)}</td><td className="px-4 py-2">{formatCell(row.jobCardNo)}</td></tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </Panel>

          <LotRecords lots={lots} trackingUnavailable={trackerQuery.isError} />

          <Panel>
            <PanelHeader title="ERP Data Notes" />
            <p className="p-4 text-sm text-muted-foreground">
              Greige stock readiness and dispatch balance are not automatically verified.
              An imported Job Card is not proof of completed production. Unit-3 stock may use an ERP Unit-1 header; no unverified KG/MTR/PRS conversions are applied.
            </p>
          </Panel>
        </>
      )}
    </div>
  );
}
