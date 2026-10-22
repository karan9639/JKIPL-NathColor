import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, RotateCcw, Search, X } from "lucide-react";

import { productionService } from "@/services/production.service";
import { errorMessage } from "@/services/http/client";

import {
  knittingStatus,
  plannedKgs,
  poDateValue,
  poNumber,
} from "@/utils/knitting";

import { formatDate, formatNumber, pickString } from "@/utils/format";

import { toIsoDate } from "@/utils/spreadsheet";

import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { PageHeader, Panel, Stat } from "@/components/ui/panel";

const STATUS_LABELS = {
  CLOSED: "Closed",
  OPEN: "Open",
  HOLD: "On Hold",
  REVIEW: "Review Remarks",
};

const STATUS_STYLES = {
  CLOSED: "bg-green-100 text-green-800",
  OPEN: "bg-slate-100 text-slate-700",
  HOLD: "bg-amber-100 text-amber-800",
  REVIEW: "bg-orange-100 text-orange-800",
};

const INITIAL_FILTERS = {
  basis: "PO_DATE",
  from: "",
  to: "",
  search: "",
  status: "ALL",
};

const PO_COLUMNS = [
  {
    key: "PO_NUMBER",
    label: "PO Number",
    render: (row) => (
      <span className="font-semibold text-primary">{poNumber(row) || "—"}</span>
    ),
  },
  {
    key: "PO_DATE",
    label: "PO Date",
    render: (row) => formatDate(poDateValue(row, "PO_DATE")),
  },
  {
    key: "FABRIC_NAME",
    label: "Fabric",
    render: (row) => (
      <span className="font-medium">
        {pickString(row, "FABRIC_NAME") || "—"}
      </span>
    ),
  },
  {
    key: "REQUIRED_QTY",
    label: "Required Qty",
    align: "right",
    render: (row) => {
      const qty = row.REQUIRED_QTY ?? row.REQUIRED_KGS;
      const uom = pickString(row, "REQUIRED_UOM") || "KGS";

      return qty == null || qty === "" ? "—" : `${formatNumber(qty)} ${uom}`;
    },
  },
  {
    key: "AVAILABLE_STOCK_KGS",
    label: "Stock in PO",
    align: "right",
    render: (row) =>
      row.AVAILABLE_STOCK_KGS == null
        ? "—"
        : formatNumber(row.AVAILABLE_STOCK_KGS),
  },
  {
    key: "PLANNED_KGS",
    label: "Planned KG",
    align: "right",
    render: (row) => {
      const value = plannedKgs(row);
      return value == null ? "—" : formatNumber(value);
    },
  },
  {
    key: "PLANNED_MACHINE",
    label: "Planned Machine",
    render: (row) => pickString(row, "PLANNED_MACHINE") || "—",
  },
  {
    key: "EXPECTED_DELIVERY_DATE",
    label: "EDD",
    render: (row) => formatDate(poDateValue(row, "EXPECTED_DELIVERY_DATE")),
  },
  {
    key: "PLANNER_STATUS",
    label: "Planner Status",
    render: (row) => {
      const status = knittingStatus(row);

      return (
        <span
          className={`inline-flex whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium ${
            STATUS_STYLES[status] || "bg-muted"
          }`}
        >
          {STATUS_LABELS[status] || status}
        </span>
      );
    },
  },
  {
    key: "PLANNING_REMARKS",
    label: "ERP Remarks",
    render: (row) => pickString(row, "PLANNING_REMARKS") || "—",
  },
];

function filterPOLines(lines, filters) {
  const query = filters.search.trim().toUpperCase();

  return lines.filter((row) => {
    if (filters.from || filters.to) {
      const date = toIsoDate(poDateValue(row, filters.basis));

      if (!date) return false;
      if (filters.from && date < filters.from) return false;
      if (filters.to && date > filters.to) return false;
    }

    if (filters.status !== "ALL" && knittingStatus(row) !== filters.status) {
      return false;
    }

    if (query) {
      const searchableText = [poNumber(row), pickString(row, "FABRIC_NAME")]
        .join(" ")
        .toUpperCase();

      if (!searchableText.includes(query)) return false;
    }

    return true;
  });
}

function calculateStats(lines) {
  return lines.reduce(
    (stats, row) => {
      const status = knittingStatus(row);

      if (Object.hasOwn(stats, status)) {
        stats[status] += 1;
      }

      const uom = pickString(row, "REQUIRED_UOM").toUpperCase();

      if (uom === "KG" || uom === "KGS") {
        const qty = Number(row.REQUIRED_KGS ?? row.REQUIRED_QTY);

        if (Number.isFinite(qty)) {
          stats.requiredKgs += qty;
        }
      }

      return stats;
    },
    {
      CLOSED: 0,
      OPEN: 0,
      HOLD: 0,
      REVIEW: 0,
      requiredKgs: 0,
    },
  );
}

export default function Unit3POPlannerPage() {
  const [filters, setFilters] = useState(INITIAL_FILTERS);

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["knitting-po-lines"],
    queryFn: productionService.knittingPOLines,
    retry: false,
  });

  const allLines = Array.isArray(data) ? data : [];

  const filteredLines = useMemo(
    () => filterPOLines(allLines, filters),
    [allLines, filters],
  );

  const stats = useMemo(() => calculateStats(filteredLines), [filteredLines]);

  const updateFilter = (key, value) => {
    setFilters((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({ ...INITIAL_FILTERS });
  };

  const hasActiveFilters = Boolean(
    filters.from ||
    filters.to ||
    filters.search.trim() ||
    filters.status !== "ALL",
  );

  return (
    <div className="min-w-0 w-full space-y-5 pb-6">
      <PageHeader title="Unit-3 PO Planner" />

      {/* Filters */}
      <Panel className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold">PO Planning Overview</h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Track Unit-3 Knitting Planner.
            </p>
          </div>

          <Button
            size="sm"
            variant="outline"
            disabled={isFetching}
            onClick={() => void refetch()}
          >
            <RotateCcw
              className={`mr-2 size-4 ${isFetching ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <Field label="Date Basis" htmlFor="date-basis">
            <Select
              id="date-basis"
              value={filters.basis}
              onChange={(event) => updateFilter("basis", event.target.value)}
            >
              <option value="PO_DATE">PO Date</option>
              <option value="EXPECTED_DELIVERY_DATE">Expected Delivery</option>
            </Select>
          </Field>

          <Field label="From Date" htmlFor="date-from">
            <Input
              id="date-from"
              type="date"
              value={filters.from}
              max={filters.to || undefined}
              onChange={(event) => updateFilter("from", event.target.value)}
            />
          </Field>

          <Field label="To Date" htmlFor="date-to">
            <Input
              id="date-to"
              type="date"
              value={filters.to}
              min={filters.from || undefined}
              onChange={(event) => updateFilter("to", event.target.value)}
            />
          </Field>

          <Field label="PO / Fabric" htmlFor="po-search">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                id="po-search"
                value={filters.search}
                placeholder="Search PO or fabric"
                className="pl-9"
                onChange={(event) => updateFilter("search", event.target.value)}
              />
            </div>
          </Field>

          <Field label="Planner Status" htmlFor="po-status">
            <Select
              id="po-status"
              value={filters.status}
              onChange={(event) => updateFilter("status", event.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="CLOSED">Closed</option>
              <option value="OPEN">Open</option>
              <option value="HOLD">On Hold</option>
              <option value="REVIEW">Review Remarks</option>
            </Select>
          </Field>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-4" />
              {filteredLines.length.toLocaleString("en-IN")} PO Lines
            </span>

            <span>
              Required:{" "}
              <strong className="text-foreground">
                {formatNumber(stats.requiredKgs)} KG
              </strong>{" "}
              (KG lines only)
            </span>
          </div>

          {hasActiveFilters && (
            <Button size="sm" variant="ghost" onClick={clearFilters}>
              <X className="mr-1 size-4" />
              Clear Filters
            </Button>
          )}
        </div>
      </Panel>

      {/* Planner status cards */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat
          label="Closed in ERP Planner"
          value={stats.CLOSED.toLocaleString("en-IN")}
          tone="primary"
        />

        <Stat label="Open" value={stats.OPEN.toLocaleString("en-IN")} />

        <Stat label="On Hold" value={stats.HOLD.toLocaleString("en-IN")} />

        <Stat
          label="Review Remarks"
          value={stats.REVIEW.toLocaleString("en-IN")}
        />
      </div>

      {/* PO Planner Table */}
      <div className="min-w-0 overflow-hidden">
        <DataTable
          rows={filteredLines}
          columns={PO_COLUMNS}
          title="Unit-3 PO Planner Lines"
          description="Read-only status from the latest Planner data"
          isLoading={isLoading}
          error={error ? errorMessage(error) : null}
          onRetry={() => void refetch()}
          searchable={false}
          exportName="unit3-po-planner"
          emptyDescription="No PO lines found. Import the PO worksheet or clear your filters."
        />
      </div>
    </div>
  );
}
