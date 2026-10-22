import { useDeferredValue, useId, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Download, Search } from 'lucide-react';
import { cn, formatCell, humanizeKey, isNumericLike, rowField, toNumber } from '@/utils/format';
import { exportRowsToXlsx } from '@/utils/spreadsheet';
import { Button } from './button';
import { Input } from './field';
import { EmptyState, ErrorState, LoadingState, Panel } from './panel';
function inferColumns(rows) {
    const first = rows[0];
    if (!first)
        return [];
    return Object.keys(first)
        .filter((k) => typeof first[k] !== 'object' || first[k] === null)
        .map((key) => ({ key, align: rows.slice(0, 10).every((r) => r[key] === '' || r[key] == null || isNumericLike(r[key])) ? 'right' : 'left' }));
}
export function DataTable({ rows, columns, title, description, isLoading, error, onRetry, searchable = true, exportName, toolbar, footer, emptyTitle = 'No records found', emptyDescription, onRowClick, maxHeight = '70vh', }) {
    const [query, setQuery] = useState('');
    const [sort, setSort] = useState(null);
    const [page, setPage] = useState(1);
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
        if (sort) {
            const col = cols.find((c) => c.key === sort.key);
            const getter = col?.sortValue ?? ((r) => (col?.align === 'right' ? toNumber(rowField(r, sort.key)) : String(rowField(r, sort.key) ?? '')));
            out = [...out].sort((a, b) => {
                const av = getter(a);
                const bv = getter(b);
                const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv), undefined, { numeric: true });
                return sort.dir === 'asc' ? cmp : -cmp;
            });
        }
        return out;
    }, [rows, deferredQuery, sort, cols]);
    const pageSize = 100;
    const totalPages = Math.max(1, Math.ceil(visible.length / pageSize));
    const currentPage = Math.min(page, totalPages);
    const pageRows = visible.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    const toggleSort = (key) => { setPage(1); setSort((s) => (s?.key !== key ? { key, dir: 'asc' } : s.dir === 'asc' ? { key, dir: 'desc' } : null)); };
    const showToolbar = title || searchable || exportName || toolbar;
    return (<Panel className="flex min-w-0 flex-col overflow-hidden">
      {showToolbar && (<div className="no-print flex flex-col gap-3 border-b border-border px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-semibold">{title}</h2>}
            <p className="text-xs text-muted-foreground">
              {description ? `${description} · ` : ''}
              <span className="tabular">{visible.length.toLocaleString('en-IN')}</span>
              {visible.length !== rows.length && <> of <span className="tabular">{rows.length.toLocaleString('en-IN')}</span></>} rows
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
            {exportName && (<Button variant="outline" size="sm" className="h-9" disabled={!visible.length} onClick={() => exportRowsToXlsx(visible.map((row) => Object.fromEntries(cols.map((c) => [c.key, rowField(row, c.key) ?? '']))), cols.map((c) => c.key), exportName)}>
                <Download aria-hidden="true"/>
                Export
              </Button>)}
          </div>
        </div>)}

      {isLoading ? (<LoadingState />) : error ? (<ErrorState message={error} onRetry={onRetry}/>) : !visible.length ? (<EmptyState title={rows.length ? 'No rows match your filter' : emptyTitle} description={rows.length ? undefined : emptyDescription}/>) : (<div className="overflow-auto" style={{ maxHeight }}>
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-muted">
              <tr>
                {cols.map((c) => {
                const active = sort?.key === c.key;
                return (<th key={c.key} scope="col" aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'} className={cn('border-b border-border px-3 py-2 text-xs font-semibold whitespace-nowrap text-muted-foreground', c.align === 'right' ? 'text-right' : 'text-left')}>
                      <button type="button" onClick={() => toggleSort(c.key)} className={cn('inline-flex items-center gap-1 hover:text-foreground', c.align === 'right' && 'flex-row-reverse')}>
                        {c.label ?? humanizeKey(c.key)}
                        {active ? sort.dir === 'asc' ? <ArrowUp className="size-3" aria-hidden="true"/> : <ArrowDown className="size-3" aria-hidden="true"/> : <ArrowUpDown className="size-3 opacity-40" aria-hidden="true"/>}
                      </button>
                    </th>);
            })}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row, i) => (<tr key={i} onClick={onRowClick ? () => onRowClick(row) : undefined} onKeyDown={onRowClick ? (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onRowClick(row)) : undefined} tabIndex={onRowClick ? 0 : undefined} className={cn('border-b border-border/70 last:border-0 even:bg-muted/30', onRowClick && 'cursor-pointer hover:bg-primary-soft/60 focus-visible:bg-primary-soft/60')}>
                  {cols.map((c) => (<td key={c.key} className={cn('px-3 py-2 align-top whitespace-nowrap', c.align === 'right' && 'tabular text-right', c.className)}>
                      {c.render ? c.render(row) : formatCell(rowField(row, c.key))}
                    </td>))}
                </tr>))}
            </tbody>
          </table>
        </div>)}
      {visible.length > pageSize && !isLoading && !error && <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3 text-xs text-muted-foreground">
        <span>Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, visible.length)} of {visible.length.toLocaleString('en-IN')} rows</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</Button>
          <span className="tabular">{currentPage} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next</Button>
        </div>
      </div>}
      {footer && <div className="border-t border-border px-4 py-3">{footer}</div>}
    </Panel>);
}
