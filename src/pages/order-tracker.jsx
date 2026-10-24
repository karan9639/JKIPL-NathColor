import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ChevronRight, RefreshCcw } from "lucide-react";
import { http, errorMessage } from "@/services/http/client";
import {
  PageHeader,
  Panel,
  PanelHeader,
  ErrorState,
  EmptyState,
} from "@/components/ui/panel";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/utils/format";
import { formatErpOpening } from "@/utils/lot-timeline";
import {
  ORDER_TRACKER_STAGES,
  getOrderLotEvents,
  orderLotStatus,
  orderTrackingState,
  readTrackerOrderId,
} from "@/utils/order-tracker";

const statusStyle = {
  Closed: "border-green-300 bg-green-50 text-green-800",
  "In production": "border-primary/30 bg-primary-soft text-primary",
  Open: "border-border bg-muted text-foreground",
};

function LotDetails({ lot }) {
  const events = useMemo(() => getOrderLotEvents(lot), [lot]);
  const recorded = new Set((lot.events || []).map((event) => event.stage));
  const fields = [
    ["ERP Order ID", lot.orderId],
    ["Job card", lot.jobCardNo],
    ["Manual lot", lot.manualLotNo],
    ["Fabric", lot.itemName],
    ["Customer", lot.customerName],
    ["Colour", lot.color],
    [
      "Allocated KG",
      lot.kgs == null ? "Not imported" : `${formatNumber(lot.kgs, 3)} KG`,
    ],
    ["ERP job-card status", lot.erpStatus],
  ];
  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-1 gap-3 rounded-md bg-muted/50 p-3 sm:grid-cols-2">
        {fields.map(([label, value]) => (
          <div className="min-w-0" key={label}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="break-words text-sm font-medium">
              {value === "" || value == null ? "—" : value}
            </dd>
          </div>
        ))}
      </dl>
      <section aria-label="Recorded timeline">
        <h3 className="mb-3 text-sm font-semibold">
          Recorded ERP / production timeline
        </h3>
        {events.length ? (
          <ol className="ml-2 border-l-2 border-border pl-5">
            {events.map((event) => (
              <li key={event.id} className="relative pb-5 last:pb-0">
                <span
                  aria-hidden="true"
                  className="absolute -left-[27px] top-1.5 size-3 rounded-full border-2 border-primary bg-surface"
                />
                <p className="text-sm font-medium">{event.label}</p>
                <p className="text-xs text-muted-foreground">{event.display}</p>
                {event.machine && (
                  <p className="text-xs text-muted-foreground">
                    Machine: {event.machine}
                  </p>
                )}
                {event.remarks && (
                  <p className="text-xs text-muted-foreground">
                    {event.remarks}
                  </p>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">
            No dated production activity has been imported for this lot.
          </p>
        )}
      </section>
      <div className="border-t border-border pt-3">
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          No production record available for
        </p>
        <div className="flex flex-wrap gap-2">
          {ORDER_TRACKER_STAGES.filter((stage) => !recorded.has(stage.key)).map(
            (stage) => (
              <span
                key={stage.key}
                className="rounded-md border px-2 py-1 text-xs text-muted-foreground"
              >
                {stage.label}
              </span>
            ),
          )}
        </div>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Stage events are stored against the job-card number and may also appear
        under other ERP orders sharing the same job card. No missing step is
        assumed complete.
      </p>
    </div>
  );
}

export default function OrderTrackerPage() {
  const [params, setParams] = useSearchParams();
  const orderId = readTrackerOrderId(params);
  const [draft, setDraft] = useState(orderId);
  const [selectedKey, setSelectedKey] = useState(null);

  useEffect(() => {
    setDraft(orderId);
    setSelectedKey(null);
  }, [orderId]);

  const query = useQuery({
    queryKey: ["order-tracker", orderId],
    enabled: Boolean(orderId),
    queryFn: async () => {
      const response = await http.get(
        `/orders/${encodeURIComponent(orderId)}/tracker`,
      );
      return response.data?.data ?? response.data;
    },
    retry: 1,
    staleTime: 30_000,
  });

  const info = query.data;
  const lots = info?.lots ?? [];
  const selected =
    lots.find(
      (lot, index) =>
        (lot.recordKey || `${lot.jobCardNo}:${lot.manualLotNo}:${index}`) ===
        selectedKey,
    ) ?? null;
  const submit = (event) => {
    event.preventDefault();
    const id = draft.trim();
    if (id) setParams({ orderId: id });
  };

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <PageHeader
        title="Order-wise Production Tracker"
        description="Search a specific ERP Order ID to see its own dyeing schedules, job-card allocations and recorded lot activities."
        actions={
          <Button
            variant="outline"
            size="sm"
            disabled={!orderId}
            loading={query.isFetching}
            onClick={() => void query.refetch()}
          >
            <RefreshCcw /> Refresh
          </Button>
        }
      />
      <Panel>
        <form
          className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end"
          onSubmit={submit}
        >
          <Field
            label="ERP Order ID"
            htmlFor="track-order"
            className="min-w-0 flex-1"
          >
            <Input
              id="track-order"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="e.g. 189904"
              autoComplete="off"
            />
          </Field>
          <Button type="submit" disabled={!draft.trim()}>
            Track order
          </Button>
        </form>
      </Panel>
      {!orderId && (
        <EmptyState
          title="Enter an ERP Order ID"
          description="Or open an order in All Orders and choose View this order / lot tracker."
        />
      )}
      {orderId && query.isPending && (
        <Panel>
          <p className="p-4 text-sm text-muted-foreground" role="status">
            Loading imported order, schedules and lot events…
          </p>
        </Panel>
      )}
      {query.isError && (
        <ErrorState
          message={errorMessage(query.error)}
          onRetry={() => void query.refetch()}
        />
      )}
      {info && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              ["ERP order lines", info.orders?.length ?? 0],
              [
                "Scheduled KG",
                info.schedules?.length
                  ? `${formatNumber(info.summary?.scheduledKgs, 3)} KG`
                  : "—",
              ],
              [
                "Job-carded KG",
                lots.length
                  ? `${formatNumber(info.summary?.jobCardedKgs, 3)} KG`
                  : "—",
              ],
              [
                "Schedule balance KG",
                info.schedules?.length
                  ? `${formatNumber(info.summary?.balanceKgs, 3)} KG`
                  : "—",
              ],
            ].map(([label, value]) => (
              <Panel key={label}>
                <div className="p-4">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-1 break-words text-lg font-semibold tabular-nums">
                    {value}
                  </p>
                </div>
              </Panel>
            ))}
          </div>
          <Panel>
            <div className="flex flex-wrap items-center justify-between gap-2 p-4">
              <div>
                <h2 className="font-semibold">ERP Order {info.orderId}</h2>
                <p className="text-sm text-muted-foreground">
                  {orderTrackingState(info)}
                </p>
              </div>
              <Link
                className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
                to="/orders/all"
              >
                <ArrowLeft className="size-4" /> All Orders
              </Link>
            </div>
          </Panel>
          {(info.summary?.overAllocatedKgs > 0 ||
            info.summary?.balanceKgs < 0) && (
            <div
              role="alert"
              className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"
            >
              ERP reconciliation required: imported job-card allocations exceed
              the unique scheduled quantity by{" "}
              {formatNumber(
                info.summary?.overAllocatedKgs || -info.summary?.balanceKgs,
                3,
              )}{" "}
              KG. Check the ERP schedule revision/allocation.
            </div>
          )}
          {info.orders?.some(
            (order) =>
              !["KGS", "KG"].includes(String(order.uom ?? "").toUpperCase()),
          ) && (
            <p className="rounded-md border border-border bg-surface p-3 text-sm text-muted-foreground">
              Order-book UOM:{" "}
              {[
                ...new Set(
                  info.orders.map((order) => order.uom || "UNSPECIFIED"),
                ),
              ].join(", ")}
              . Dyeing schedules and job-card allocations are expressed in KG.
              No automatic unit conversion has been applied.
            </p>
          )}
          <Panel>
            <PanelHeader
              title={`Order ${info.orderId} — job cards and lots`}
              description={`${lots.length} imported job-card allocation line(s) for this order. Select a lot to view its recorded timeline.`}
            />
            {!lots.length ? (
              <div className="p-5 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">
                  No Open Job Card imported for ERP Order {info.orderId}.
                </p>
                <p className="mt-1">
                  {info.schedules?.length
                    ? "A dyeing schedule is present, but no job-card allocation was imported."
                    : "No dyeing schedule or job-card allocation is imported yet."}{" "}
                  This does not prove stock shortage or production inactivity.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {lots.map((lot, index) => {
                  const key =
                    lot.recordKey ||
                    `${lot.jobCardNo}:${lot.manualLotNo}:${index}`;
                  const stages = new Set(
                    (lot.events ?? []).map((event) => event.stage),
                  );
                  const status = orderLotStatus(lot);
                  const opened = formatErpOpening({
                    JOBCARDDATE: lot.jobCardDate,
                    JOBCARDTIME: lot.jobCardTime,
                  });
                  return (
                    <button
                      type="button"
                      key={key}
                      onClick={() => setSelectedKey(key)}
                      className="block w-full p-4 text-left transition-colors hover:bg-muted/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                      aria-label={`View recorded timeline for Job Card ${lot.jobCardNo}, Lot ${lot.manualLotNo || "not supplied"}`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-primary">
                            Job Card {lot.jobCardNo}
                          </p>
                          <p className="text-sm">
                            Lot {lot.manualLotNo || "Not supplied"} ·{" "}
                            {lot.kgs == null
                              ? "KG not imported"
                              : `${formatNumber(lot.kgs, 3)} KG`}
                          </p>
                          {lot.itemName && (
                            <p className="mt-1 text-sm text-muted-foreground">
                              {lot.itemName}
                            </p>
                          )}
                          {opened !== "—" && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              Opened: {opened}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-md border px-2 py-1 text-xs font-medium ${statusStyle[status] || statusStyle.Open}`}
                          >
                            {status}
                          </span>
                          <ChevronRight className="size-4 text-muted-foreground" />
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {ORDER_TRACKER_STAGES.map((stage) => (
                          <span
                            key={stage.key}
                            className={`rounded border px-2 py-1 text-xs ${stages.has(stage.key) ? "border-green-300 bg-green-50 text-green-900" : "border-border text-muted-foreground"}`}
                            title={
                              stages.has(stage.key)
                                ? `${stage.label}: recorded`
                                : `${stage.label}: no record`
                            }
                          >
                            {stage.short} {stages.has(stage.key) ? "✓" : "—"}
                          </span>
                        ))}
                      </div>
                      <p className="mt-2 text-xs font-medium text-primary">
                        View recorded lot timeline →
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </Panel>
          <Panel>
            <PanelHeader title="ERP data notes" />
            <p className="p-4 text-sm text-muted-foreground">
              Greige stock readiness: {info.stockReadiness || "not verified"}.
              Job-card events are recorded against their job-card number and can
              appear on more than one ERP order allocation line. Dispatch import
              entries for this order: {info.dispatches?.length ?? 0}. No
              unverified production quantities or automatic KG/MTR conversions
              are assumed.
            </p>
          </Panel>
        </>
      )}
      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelectedKey(null);
        }}
        title={`Job Card ${selected?.jobCardNo || "—"}`}
        description={`Lot ${selected?.manualLotNo || "—"} · ERP Order ${orderId}`}
        className="max-w-2xl"
      >
        {selected && <LotDetails lot={selected} />}
      </Dialog>
    </div>
  );
}
