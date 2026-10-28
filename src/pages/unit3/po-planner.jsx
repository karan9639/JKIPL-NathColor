import { useDeferredValue, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from 'react-router';
import { useAuth } from '@/hooks/useAuth';
import { findNavItem } from '@/constants/navigation';
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
  CLOSED: "bg-success-soft text-success",
  OPEN: "bg-muted text-muted-foreground",
  HOLD: "bg-accent-soft text-accent",
  REVIEW: "bg-danger-soft text-danger",
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
    className: "min-w-64 max-w-96 whitespace-normal break-words",
    render: (row) => pickString(row, "PLANNING_REMARKS") || "—",
  },
];

export default function Unit3POPlannerPage() {
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const { can } = useAuth();
  const importItem = findNavItem('/imports/knitting-po-planning');

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const deferredFilters = useDeferredValue(filters);
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['knitting-po-lines', page, limit, deferredFilters],
    queryFn: ({signal}) => productionService.knittingPOLines({page,limit,filters:deferredFilters,signal}),
    retry: false,
    placeholderData: (previous) => previous,
  });
  const filteredLines = Array.isArray(data?.rows) ? data.rows : [];
  const rawStats = data?.summary ?? {};
  const stats = {
    OPEN: Number(rawStats.OPEN) || 0,
    CLOSED: Number(rawStats.CLOSED) || 0,
    HOLD: Number(rawStats.HOLD) || 0,
    REVIEW: Number(rawStats.REVIEW) || 0,
    requiredKgs: Number(rawStats.requiredKgs) || 0,
  };
  const pagination = {
    currentPage: page,
    limit,
    totalEntries: 0,
    totalPages: 1,
    ...(data?.pagination ?? {}),
  };

  const updateFilter = (key, value) => {
    setPage(1);
    setFilters((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({ ...INITIAL_FILTERS });
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    filters.from ||
    filters.to ||
    filters.search.trim() ||
    filters.status !== "ALL",
  );

  return (
    <div className="min-w-0 w-full space-y-5 pb-6">
      <PageHeader title="Unit-3 PO Planner" description="Read-only planning status from imported ERP PO remarks. Not a production completion record." actions={importItem && can(importItem) && <Link to={importItem.path} className="inline-flex min-h-10 items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover">Import / Update PO sheet</Link>} />

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
              {(pagination.totalEntries ?? 0).toLocaleString("en-IN")} PO Lines
            </span>

            <span>
              Required:{" "}
              <strong className="text-foreground">
                {isLoading || error ? '—' : formatNumber(stats.requiredKgs)} KG
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
          value={isLoading || error ? '—' : stats.CLOSED.toLocaleString("en-IN")}
          tone="primary"
        />

        <Stat label="Open" value={isLoading || error ? '—' : stats.OPEN.toLocaleString("en-IN")} />

        <Stat label="On Hold" value={isLoading || error ? '—' : stats.HOLD.toLocaleString("en-IN")} />

        <Stat
          label="Review Remarks"
          value={isLoading || error ? '—' : stats.REVIEW.toLocaleString("en-IN")}
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
          isFetching={isFetching}
          serverPagination={{pagination,disabled:isFetching,onPageChange:setPage,onPageSizeChange:(next)=>{setLimit(next);setPage(1);}}}
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
