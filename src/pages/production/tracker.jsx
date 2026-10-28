import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, Clock3, Search } from "lucide-react";
import { productionService } from "@/services/production.service";
import { errorMessage } from "@/services/http/client";
import { formatNumber, pickString } from "@/utils/format";
import {
  PRODUCTION_STAGES,
  formatErpOpening,
  formatTimelineRow,
  getTimelineEvents,
  openingSortKey,
  formatRecordedEvent,
} from "@/utils/lot-timeline";
import { DataTable } from "@/components/ui/data-table";
import { Badge, PageHeader, Panel, Stat } from "@/components/ui/panel";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

const statusTone = {
  Closed: "success",
  "In production": "primary",
  Open: "neutral",
};

const columns = [
  {
    key: "ORDERID",
    label: "ERP Order ID",
    render: (r) => (
      <span className="font-semibold tabular">{r.ORDERID || "—"}</span>
    ),
  },
  {
    key: "JOBCARDNO",
    label: "Job Card",
    render: (r) => (
      <span className="font-medium text-primary tabular">
        {r.JOBCARDNO || "—"}
      </span>
    ),
  },
  { key: "MANUALLOTNO", label: "Manual Lot No." },
  { key: "ITEMNAME", label: "Item / Fabric", className: "max-w-64 truncate" },
  {
    key: "KGS",
    label: "Allocated KG",
    align: "right",
    render: (r) => (r.KGS == null ? "—" : formatNumber(r.KGS, 3)),
  },
  {
    key: "OPENED_DISPLAY",
    label: "Opened (ERP)",
    sortValue: openingSortKey,
    render: (r) => {
      const [date, time] = r.OPENED_DISPLAY.split(" · ");
      return (
        <span className="flex flex-col whitespace-nowrap tabular">
          <span>{date}</span>
          {time && (
            <span className="text-xs text-muted-foreground">{time}</span>
          )}
        </span>
      );
    },
  },
  {
    key: "RECORDED_STAGES",
    label: "Stage records",
    render: (r) => {
      const recorded = new Set(getTimelineEvents(r).map((e) => e.key));
      return (
        <div className="flex gap-1" aria-label="Recorded dyeing stages">
          {PRODUCTION_STAGES.map((stage, i) => (
            <span
              key={stage.key}
              title={`${stage.short}: ${recorded.has(stage.key) ? "recorded" : "no record"}`}
              className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${recorded.has(stage.key) ? "border-primary/30 bg-primary-soft text-primary" : "border-border text-muted-foreground"}`}
            >
              {["Dy", "Jet", "Rop", "HS", "Fin"][i]}
            </span>
          ))}
        </div>
      );
    },
  },
  {
    key: "LATEST_STAGE",
    label: "Last recorded activity",
    render: (r) => (
      <span className="flex flex-col gap-0.5">
        <span className="font-medium">{r.LATEST_STAGE}</span>
        {r.LATEST_STAGE_DATE && (
          <span className="text-xs text-muted-foreground tabular">
            {r.LATEST_STAGE_DATE}
          </span>
        )}
      </span>
    ),
  },
  {
    key: "STAGE_STATUS",
    label: "Status",
    render: (r) => (
      <Badge tone={statusTone[r.STAGE_STATUS]}>{r.STAGE_STATUS}</Badge>
    ),
  },
];

function Detail({ row }) {
  const events = getTimelineEvents(row);
  const missing = PRODUCTION_STAGES.filter(
    (stage) => !events.some((e) => e.key === stage.key),
  );
  const details = [
    ["ERP Order ID", row.ORDERID],
    ["Manual Lot No.", row.MANUALLOTNO],
    ["Item / Fabric", row.ITEMNAME || row.FABRICNAME],
    ["Customer", row.CUSTOMERNAME],
    ["Colour", row.COLOR],
    ["Allocated KG", row.KGS == null ? "—" : formatNumber(row.KGS, 3)],
    ["ERP job card status", row.STATUS],
    ["Jet (ERP / production)", row.JETLOADING_MACHINE || row.JETNO],
  ];
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-x-5 gap-y-3 rounded-lg min-[400px]:grid-cols-2 bg-muted/50 p-3">
        {details.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="break-words text-sm font-medium">{value || "—"}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Recorded timeline</h3>
        <div className="relative ml-2 border-l-2 border-border pl-5">
          <div className="relative pb-5">
            <span className="absolute -left-[27px] top-1.5 size-3 rounded-full border-2 border-primary bg-surface" />
            <p className="font-medium text-sm">Job card opened (ERP)</p>
            <p className="text-xs text-muted-foreground tabular">
              {formatErpOpening(row)}
            </p>
          </div>
          {events.map((event) => (
            <div key={event.key} className="relative pb-5 last:pb-0">
              <span className="absolute -left-[27px] top-1.5 size-3 rounded-full border-2 border-primary bg-primary-soft" />
              <p className="text-sm font-medium">{event.label}</p>
              <p className="text-xs text-muted-foreground tabular">
                {event.display}
              </p>
            </div>
          ))}
        </div>
        {!events.length && (
          <p className="rounded-lg bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
            No production-stage, closing or invoice event is recorded for this
            job card yet.
          </p>
        )}
      </div>
      {Array.isArray(row.EVENT_HISTORY) && row.EVENT_HISTORY.length > 0 && (
        <div className="space-y-2 border-t border-border pt-3">
          <h3 className="text-sm font-semibold">Production stage audit history</h3>
          <p className="text-xs text-muted-foreground">Includes repeat entries saved after the audit-history upgrade. Legacy stage history needs a one-time backfill.</p>
          {row.EVENT_HISTORY.map((entry, index) => (
            <div key={`${entry.stage}-${entry.recordedAt || entry.eventDate}-${index}`} className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm">
              <span className="font-medium">{entry.stage || 'Stage'}</span>
              <span className="tabular text-muted-foreground">{formatRecordedEvent(entry.eventDate)}</span>
              {entry.machine && <span className="text-muted-foreground">Machine {entry.machine}</span>}
              {entry.remarks && <span className="w-full break-words text-xs">{entry.remarks}</span>}
            </div>
          ))}
        </div>
      )}
      {missing.length > 0 && (
        <div className="border-t border-border pt-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            No record imported/entered for
          </p>
          <div className="flex flex-wrap gap-1.5">
            {missing.map((e) => (
              <span
                key={e.key}
                className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground"
              >
                {e.short}
              </span>
            ))}
          </div>
        </div>
      )}
      <p className="border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
        These are recorded job-card events, not guaranteed sequential process
        steps. A job card may cover multiple ERP order lines; shared job-card
        events can appear on each linked order line. Missing activity is not
        proof a machine step was skipped.
      </p>
    </div>
  );
}

export default function TrackerPage() {
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState('All');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const query = useQuery({
    queryKey: ['tracker', {page,limit,status,search}],
    queryFn: ({signal}) => productionService.tracker({page,limit,status,search,signal}),
    retry: 1,
    staleTime: 30000,
    placeholderData: (previous) => previous,
  });
  const rows = useMemo(() => (query.data?.rows ?? []).map(formatTimelineRow), [query.data?.rows]);
  const counts = query.data?.summary ?? {};
  const pagination = query.data?.pagination ?? {currentPage:page,limit,totalEntries:0,totalPages:1};
  const isWaiting = query.isPending || query.isError;
  const chooseStatus = (next) => {setStatus(next);setPage(1);setSelected(null);};
  const submitSearch = (event) => {event.preventDefault();setSearch(searchDraft.trim());setPage(1);};

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <PageHeader
        title="Order Tracker"
        description="ERP Order → Job Card → Manual Lot → recorded dyeing events. Select a row to view the full timeline."
        actions={
          <Button
            variant="outline"
            size="sm"
            loading={query.isFetching}
            onClick={() => query.refetch()}
          >
            <RefreshCw aria-hidden="true" /> Refresh
          </Button>
        }
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="ERP order lines"
          value={
            isWaiting ? "—" : formatNumber(counts.All, 0)
          }
          hint={isWaiting ? '—' : `${formatNumber(counts.distinctCards,0)} distinct job cards`}
          tone="primary"
        />
        <Stat
          label="Open (no stage recorded)"
          value={
            isWaiting
              ? "—"
              : formatNumber(counts.Open, 0)
          }
        />
        <Stat
          label="In production"
          value={
            isWaiting
              ? "—"
              : formatNumber(counts["In production"], 0)
          }
        />
        <Stat
          label="Closed in ERP records"
          value={
            isWaiting
              ? "—"
              : formatNumber(counts.Closed, 0)
          }
        />
      </div>
      <Panel className="p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Filter lot status"
          >
            {["All", "Open", "In production", "Closed"].map((s) => (
              <button
                type="button"
                key={s}
                aria-pressed={status === s}
                onClick={() => chooseStatus(s)}
                className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${status === s ? "border-primary bg-primary-soft text-primary" : "border-border bg-surface text-muted-foreground hover:bg-muted"}`}
              >
                {s} ({isWaiting ? '—' : formatNumber(counts[s] ?? 0, 0)})
              </button>
            ))}
          </div>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock3 className="size-4" />
            Production timestamps: IST
          </p>
        </div>
      </Panel>
      <form onSubmit={submitSearch} className="flex min-w-0 flex-col gap-2 sm:flex-row" role="search">
        <div className="relative min-w-0 flex-1">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label="Search all job-card records" placeholder="Search order, job card, lot, fabric or customer" className="pl-9" value={searchDraft} onChange={(event)=>{const next=event.target.value;setSearchDraft(next);if(!next.trim()){setSearch('');setPage(1);setSelected(null);}}} />
        </div>
        <Button type="submit" size="sm">Search all records</Button>
        {(search || searchDraft) && <Button type="button" variant="outline" size="sm" onClick={()=>{setSearchDraft('');setSearch('');setPage(1);setSelected(null);}}>Clear</Button>}
      </form>
      <DataTable
        rows={rows}
        columns={columns}
        title="Job card / lot records"
        mobileRow={(row) => (
          <button
            type="button"
            onClick={() => setSelected(row)}
            className="block w-full p-4 text-left hover:bg-muted focus-visible:outline-offset-[-2px]"
            aria-label={`View timeline for job card ${row.JOBCARDNO}, lot ${row.MANUALLOTNO}`}
          >
            <span className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold text-primary">
                Job card {row.JOBCARDNO || "—"}
              </span>
              <Badge tone={statusTone[row.STAGE_STATUS]}>
                {row.STAGE_STATUS}
              </Badge>
            </span>
            <span className="mt-2 block text-sm">
              {row.ITEMNAME || "Item not supplied"}
            </span>
            <span className="mt-2 block text-xs text-muted-foreground">
              Order {row.ORDERID || "—"} · Lot {row.MANUALLOTNO || "—"}
            </span>
            <span className="mt-1 block text-xs text-muted-foreground">
              {formatNumber(row.KGS, 3)} KG · {row.OPENED_DISPLAY}
            </span>
            <span className="mt-3 block text-xs font-medium">
              {row.LATEST_STAGE} · View recorded timeline
            </span>
          </button>
        )}
        description="Click a row for its chronological events. Search and status counts span all matching database rows."
        isLoading={query.isPending}
        isFetching={query.isFetching}
        searchable={false}
        serverPagination={{
          pagination,
          disabled:query.isFetching,
          onPageChange:setPage,
          onPageSizeChange:(next)=>{setLimit(next);setPage(1);},
        }}
        error={query.isError ? errorMessage(query.error) : null}
        onRetry={() => query.refetch()}
        onRowClick={setSelected}
        exportName="dyeing-lot-timeline"
        emptyTitle="No job-card lines"
        emptyDescription="Try All statuses, or upload ERP Open Job Cards to populate the timeline."
      />
      <p className="text-xs text-muted-foreground">
        Status comes only from recorded job-card stage/closure data; it does not
        certify quantity completion. The same job-card event may appear for
        several order allocation lines.
      </p>
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        title={`Job Card ${pickString(selected, "JOBCARDNO") || "—"}`}
        description={`Lot ${pickString(selected, "MANUALLOTNO") || "—"} · ERP Order ${pickString(selected, "ORDERID") || "—"}`}
        className="max-w-2xl"
      >
        {selected && <Detail row={selected} />}
      </Dialog>
    </div>
  );
}
