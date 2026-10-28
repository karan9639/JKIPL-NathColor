import { isAllPageSize, normalizePageSize, localPageSize, MAX_ALL_ROWS } from '@/utils/all-page-size';
import { useDeferredValue, useEffect, useId, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Download, Search } from 'lucide-react';
import { cn, formatCell, humanizeKey, isNumericLike, rowField, toNumber } from '@/utils/format';
import { exportRowsToXlsx } from '@/utils/spreadsheet';
import { Button } from './button';
import { Input, Select } from './field';
import { Dialog } from './dialog';
import { getServerPageMeta } from '@/utils/server-pagination';
import { EmptyState, ErrorState, LoadingState, Panel } from './panel';
function inferColumns(rows) {
    const first = rows[0];
    if (!first)
        return [];
    return Object.keys(first)
        .filter((k) => typeof first[k] !== 'object' || first[k] === null)
        .map((key) => ({ key, align: rows.slice(0, 10).every((r) => r[key] === '' || r[key] == null || isNumericLike(r[key])) ? 'right' : 'left' }));
}
export function DataTable({ rows = [], columns, title, description, isLoading, isFetching, error, onRetry, searchable = true, exportName, toolbar, footer, emptyTitle = 'No records found', emptyDescription, onRowClick, maxHeight, mobileRow, serverPagination, serverSort, onServerSortChange, loadMore, }) {
    const [query, setQuery] = useState('');
    const [localSort, setLocalSort] = useState(null);
    const sort = serverPagination ? serverSort : localSort;
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);
    const [cellDetail, setCellDetail] = useState(null);
    const [scrollTop, setScrollTop] = useState(0);
    const viewportRef = useRef(null);
    const deferredQuery = useDeferredValue(query);
    const filterId = useId();
    const cols = useMemo(() => columns ?? inferColumns(rows), [columns, rows]);
    const visible = useMemo(() => {
        let out = rows;
        const words = deferredQuery.trim().toUpperCase().split(/\s+/).filter(Boolean);
        if (words.length) {
            out = out.filter((r) => {
                const hay = cols.map((c) => formatCell(rowField(r, c.key))).join(' ').toUpperCase();
                return words.every((w) => hay.includes(w));
            });
        }
        if (sort && !serverPagination) {
            const col = cols.find((c) => c.key === sort.key);
            const getter = col?.sortValue ?? ((r) => (col?.align === 'right' ? toNumber(rowField(r, sort.key)) : String(rowField(r, sort.key) ?? '')));
            out = [...out].sort((a, b) => {
                const rawA = rowField(a, sort.key);
                const rawB = rowField(b, sort.key);
                if (!col?.sortValue) {
                    const missingA = rawA == null || rawA === '';
                    const missingB = rawB == null || rawB === '';
                    if (missingA || missingB) return missingA === missingB ? 0 : missingA ? 1 : -1;
                }
                const av = getter(a);
                const bv = getter(b);
                const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv), undefined, { numeric: true });
                return sort.dir === 'asc' ? cmp : -cmp;
            });
        }
        return out;
    }, [rows, deferredQuery, sort, cols, serverPagination]);
    const effectiveSize = localPageSize(pageSize, visible.length);
    const totalPages = Math.max(1, Math.ceil(visible.length / effectiveSize));
    const currentPage = Math.min(page, totalPages);
    // Server already returned the requested page: never slice it again.
    const pageRows = serverPagination ? visible : visible.slice((currentPage - 1) * effectiveSize, currentPage * effectiveSize);
    const toggleSort = (key) => {
        if (serverPagination) {
            if (onServerSortChange) {
                onServerSortChange(serverSort?.key === key
                    ? { key, dir: serverSort.dir === 'asc' ? 'desc' : 'asc' }
                    : { key, dir: 'asc' });
            }
            return;
        }
        setPage(1);
        setLocalSort((s) => (s?.key !== key ? { key, dir: 'asc' } : s.dir === 'asc' ? { key, dir: 'desc' } : null));
    };
    const { total: remoteTotal, limit: remoteLimit, page: remoteCurrent,
        pages: remotePages, start: remoteStart, end: remoteEnd } = getServerPageMeta(serverPagination?.pagination, pageRows.length);
    // The ALL option can contain tens of thousands of ERP lines. Only render the
    // visible window inside the table viewport instead of thousands of DOM rows.
    const isVirtual = pageRows.length > 250;
    const virtualRowHeight = 56;
    const virtualFirst = isVirtual ? Math.min(Math.max(0, pageRows.length - 1), Math.max(0, Math.floor(scrollTop / virtualRowHeight) - 10)) : 0;
    const virtualLast = isVirtual ? Math.min(pageRows.length, virtualFirst + 38) : pageRows.length;
    const displayRows = isVirtual ? pageRows.slice(virtualFirst, virtualLast) : pageRows;
    const topSpacer = virtualFirst * virtualRowHeight;
    const bottomSpacer = Math.max(0, pageRows.length - virtualLast) * virtualRowHeight;
    const paginationBusy = Boolean(serverPagination?.disabled || isFetching || isLoading);
    // A remote table without an actual sort endpoint must not pretend to sort globally.
    const sortingEnabled = !serverPagination || typeof onServerSortChange === 'function';
    // New page/search data should always begin at the top of the table viewport.
    useEffect(() => {
        setScrollTop(0);
        if (viewportRef.current) viewportRef.current.scrollTop = 0;
    }, [rows, deferredQuery, page, pageSize, serverPagination?.pagination?.currentPage, serverPagination?.pagination?.limit]);

    const showToolbar = title || searchable || exportName || toolbar;
    return (<Panel className="flex min-w-0 shrink-0 flex-col overflow-hidden">
      {showToolbar && (<div className="no-print flex flex-col gap-3 border-b border-border px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-semibold">{title}</h2>}
            <p className="text-xs text-muted-foreground">
              {description ? `${description} · ` : ''}
              <span className="tabular">{isLoading || error ? '—' : (serverPagination ? remoteTotal : visible.length).toLocaleString('en-IN')}</span>
              {(isFetching || query !== deferredQuery) && <span role="status" className="ml-2 text-primary">Updating…</span>}
              {!serverPagination && visible.length !== rows.length && <> of <span className="tabular">{rows.length.toLocaleString('en-IN')}</span></>} rows
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {toolbar}
            {searchable && (<div className="relative w-full sm:w-64">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true"/>
                <label htmlFor={filterId} className="sr-only">
                  Filter rows
                </label>
                <Input id={filterId} value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Filter rows…" className="h-9 pl-9"/>
              </div>)}
            {exportName && (<Button variant="outline" size="sm" className="h-9" disabled={!visible.length || isLoading || !!error || query !== deferredQuery} onClick={() => exportRowsToXlsx(visible.map((row) => Object.fromEntries(cols.map((c) => [c.key, rowField(row, c.key) ?? '']))), cols.map((c) => c.key), exportName)}>
                <Download aria-hidden="true"/>
                {serverPagination ? 'Export page' : 'Export'}
              </Button>)}
          </div>
        </div>)}

      {isLoading ? (<LoadingState />) : error ? (<ErrorState message={error} onRetry={onRetry}/>) : !visible.length ? (<EmptyState title={rows.length ? 'No rows match your filter' : emptyTitle} description={rows.length ? undefined : emptyDescription}/>) : (<><div role="region" aria-label={`${title || 'Records'} — scroll to view all columns`} tabIndex={0} ref={viewportRef} onScroll={isVirtual ? (event) => setScrollTop(event.currentTarget.scrollTop) : undefined} className={cn('erp-data-table-viewport min-w-0 overflow-auto overscroll-contain focus-visible:outline-offset-[-2px]', mobileRow && !isVirtual && 'hidden md:block')} style={{ maxHeight }}>
          <table className="w-max min-w-full border-collapse text-sm">
            <caption className="sr-only">{title || 'Records'}{onRowClick ? '. Select a row to view details.' : ''}</caption>
            <thead className="sticky top-0 z-10 bg-muted">
              <tr>
                {cols.map((c) => {
                const active = sort?.key === c.key;
                return (<th key={c.key} scope="col" aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'} className={cn('border-b border-border px-3 py-2 text-xs font-semibold whitespace-nowrap text-muted-foreground', c.align === 'right' ? 'text-right' : 'text-left')}>
                      <button type="button" onClick={() => toggleSort(c.key)} disabled={!sortingEnabled} className={cn('inline-flex min-h-8 items-center gap-1.5', sortingEnabled && 'hover:text-foreground', c.align === 'right' && 'flex-row-reverse')}>
                        {c.label ?? humanizeKey(c.key)}
                        {sortingEnabled && (active ? sort.dir === 'asc' ? <ArrowUp className="size-3" aria-hidden="true"/> : <ArrowDown className="size-3" aria-hidden="true"/> : <ArrowUpDown className="size-3 opacity-40" aria-hidden="true"/>)}
                      </button>
                    </th>);
            })}
              </tr>
            </thead>
            <tbody>
              {isVirtual && topSpacer > 0 && <tr aria-hidden="true"><td colSpan={cols.length} style={{height:topSpacer,padding:0,border:0}} /></tr>}
              {displayRows.map((row, i) => (<tr key={row._id ?? row.recordKey ?? i} onClick={onRowClick ? () => onRowClick(row) : undefined} onKeyDown={onRowClick ? (e) => e.target === e.currentTarget && !e.nativeEvent.isComposing && e.keyCode !== 229 && (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onRowClick(row)) : undefined} tabIndex={onRowClick ? 0 : undefined} style={isVirtual ? {height:virtualRowHeight} : undefined} className={cn('border-b border-border/70 transition-colors duration-150 last:border-0 even:bg-muted/20 hover:bg-primary-soft/40', onRowClick && 'cursor-pointer hover:bg-primary-soft/60 focus-visible:bg-primary-soft/60')}>
                  {cols.map((c) => (<td key={c.key} className={cn('px-3 py-2 align-top whitespace-nowrap', c.align === 'right' && 'tabular text-right', c.className)}>
                      {c.className?.includes('truncate') ? <button type="button" title={formatCell(rowField(row, c.key))} className="block max-w-full truncate text-left underline decoration-border underline-offset-4 hover:decoration-primary" aria-label={`View full ${c.label ?? humanizeKey(c.key)}: ${formatCell(rowField(row, c.key))}`} onClick={(event) => { event.stopPropagation(); setCellDetail({ title: c.label ?? humanizeKey(c.key), value: formatCell(rowField(row, c.key)) }); }}>{c.render ? c.render(row) : formatCell(rowField(row, c.key))}</button> : c.render ? c.render(row) : formatCell(rowField(row, c.key))}
                    </td>))}
                </tr>))}
              {isVirtual && bottomSpacer > 0 && <tr aria-hidden="true"><td colSpan={cols.length} style={{height:bottomSpacer,padding:0,border:0}} /></tr>}
            </tbody>
          </table>
        </div>{mobileRow && !isVirtual && <div className="divide-y divide-border md:hidden">{pageRows.map((row, index) => <div key={row._id ?? index}>{mobileRow(row)}</div>)}</div>}</>)}
      {/* Exactly one pager. Server mode uses the entire filtered MongoDB result count. */}
      {(!!visible.length || (serverPagination && remoteTotal > 0)) && !isLoading && !error && (serverPagination ? (
        <div className="flex flex-col gap-3 border-t border-border px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span aria-live="polite">
            Showing <strong className="text-foreground">{remoteStart.toLocaleString('en-IN')}–{remoteEnd.toLocaleString('en-IN')}</strong> of{' '}
            <strong className="text-foreground">{remoteTotal.toLocaleString('en-IN')}</strong> records
          </span>
          <div className="flex flex-wrap items-center gap-2" aria-label="Records pagination">
            <label htmlFor={`${filterId}-server-size`} className="sr-only">Rows per page</label>
            <Select id={`${filterId}-server-size`} className="h-9 w-28 text-xs" value={remoteLimit}
              disabled={paginationBusy}
              onChange={(event) => {setScrollTop(0);serverPagination.onPageSizeChange(normalizePageSize(event.target.value));}}>
              {[25, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
              <option value="all" disabled={remoteTotal > MAX_ALL_ROWS}>All{remoteTotal > MAX_ALL_ROWS ? ` (max ${MAX_ALL_ROWS.toLocaleString('en-IN')})` : ''}</option>
            </Select>
            <Button type="button" variant="outline" size="sm" disabled={paginationBusy || remoteCurrent <= 1}
              onClick={() => serverPagination.onPageChange(remoteCurrent - 1)}>Previous</Button>
            <span className="whitespace-nowrap tabular">{isAllPageSize(remoteLimit) ? 'All records' : <>Page {remoteCurrent.toLocaleString('en-IN')} / {remotePages.toLocaleString('en-IN')}</>}</span>
            <Button type="button" variant="outline" size="sm" disabled={paginationBusy || remoteCurrent >= remotePages}
              onClick={() => serverPagination.onPageChange(remoteCurrent + 1)}>Next</Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3 text-xs text-muted-foreground">
          <span>Showing {visible.length ? (currentPage - 1) * effectiveSize + 1 : 0}–{Math.min(currentPage * effectiveSize, visible.length)} of {visible.length.toLocaleString('en-IN')} rows</span>
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor={`${filterId}-size`} className="sr-only">Rows per page</label>
            <Select id={`${filterId}-size`} className="h-9 w-28 text-xs" value={pageSize} onChange={event => { setPageSize(normalizePageSize(event.target.value)); setScrollTop(0); setPage(1); }}>{[25, 50, 100].map(size => <option key={size} value={size}>{size}</option>)}<option value="all">{loadMore ? 'All loaded' : 'All'}</option></Select>
            <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</Button>
            <span className="whitespace-nowrap tabular">{isAllPageSize(pageSize) ? 'All records' : `Page ${currentPage.toLocaleString('en-IN')} / ${totalPages.toLocaleString('en-IN')}`}</span>
            <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next</Button>
            {loadMore && <Button type="button" variant="outline" size="sm" disabled={loadMore.loading} loading={loadMore.loading} onClick={loadMore.onClick}>Load more records</Button>}
          </div>
        </div>
      ))}
      {footer && <div className="border-t border-border px-4 py-3">{footer}</div>}
      <Dialog open={!!cellDetail} onOpenChange={open => !open && setCellDetail(null)} title={cellDetail?.title || 'Full value'}><p className="whitespace-pre-wrap break-words text-sm">{cellDetail?.value}</p></Dialog>
    </Panel>);
}
