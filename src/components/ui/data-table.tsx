import { useMemo, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, Download, Search } from 'lucide-react'
import { cn, formatCell, humanizeKey, isNumericLike, toNumber, type Row } from '@/lib/utils'
import { exportRowsToXlsx } from '@/lib/spreadsheet'
import { Button } from './button'
import { Input } from './field'
import { EmptyState, ErrorState, LoadingState, Panel } from './panel'

export interface Column {
  key: string
  label?: string
  align?: 'left' | 'right'
  render?: (row: Row) => ReactNode
  sortValue?: (row: Row) => string | number
  className?: string
}

interface DataTableProps {
  rows: Row[]
  columns?: Column[]
  title?: string
  description?: string
  isLoading?: boolean
  error?: string | null
  onRetry?: () => void
  searchable?: boolean
  exportName?: string
  toolbar?: ReactNode
  footer?: ReactNode
  emptyTitle?: string
  emptyDescription?: string
  onRowClick?: (row: Row) => void
  maxHeight?: string
}

function inferColumns(rows: Row[]): Column[] {
  const first = rows[0]
  if (!first) return []
  return Object.keys(first)
    .filter((k) => typeof first[k] !== 'object' || first[k] === null)
    .map((key) => ({ key, align: rows.slice(0, 10).every((r) => r[key] === '' || r[key] == null || isNumericLike(r[key])) ? 'right' : 'left' }))
}

export function DataTable({
  rows,
  columns,
  title,
  description,
  isLoading,
  error,
  onRetry,
  searchable = true,
  exportName,
  toolbar,
  footer,
  emptyTitle = 'No records found',
  emptyDescription,
  onRowClick,
  maxHeight = '70vh',
}: DataTableProps) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null)
  const cols = useMemo(() => columns ?? inferColumns(rows), [columns, rows])

  const visible = useMemo(() => {
    let out = rows
    const words = query.trim().toUpperCase().split(/\s+/).filter(Boolean)
    if (words.length) {
      out = out.filter((r) => {
        const hay = cols.map((c) => formatCell(r[c.key])).join(' ').toUpperCase()
        return words.every((w) => hay.includes(w))
      })
    }
    if (sort) {
      const col = cols.find((c) => c.key === sort.key)
      const getter = col?.sortValue ?? ((r: Row) => (col?.align === 'right' ? toNumber(r[sort.key]) : String(r[sort.key] ?? '')))
      out = [...out].sort((a, b) => {
        const av = getter(a)
        const bv = getter(b)
        const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv), undefined, { numeric: true })
        return sort.dir === 'asc' ? cmp : -cmp
      })
    }
    return out
  }, [rows, query, sort, cols])

  const toggleSort = (key: string) =>
    setSort((s) => (s?.key !== key ? { key, dir: 'asc' } : s.dir === 'asc' ? { key, dir: 'desc' } : null))

  const showToolbar = title || searchable || exportName || toolbar

  return (
    <Panel className="flex min-w-0 flex-col overflow-hidden">
      {showToolbar && (
        <div className="no-print flex flex-col gap-3 border-b border-border px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
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
            {searchable && (
              <div className="relative w-full sm:w-64">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <label htmlFor={`filter-${title ?? 'table'}`} className="sr-only">
                  Filter rows
                </label>
                <Input id={`filter-${title ?? 'table'}`} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter rows…" className="h-9 pl-9" />
              </div>
            )}
            {exportName && (
              <Button variant="outline" size="sm" className="h-9" disabled={!visible.length} onClick={() => exportRowsToXlsx(visible, cols.map((c) => c.key), exportName)}>
                <Download aria-hidden="true" />
                Export
              </Button>
            )}
          </div>
        </div>
      )}

      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={onRetry} />
      ) : !visible.length ? (
        <EmptyState title={rows.length ? 'No rows match your filter' : emptyTitle} description={rows.length ? undefined : emptyDescription} />
      ) : (
        <div className="overflow-auto" style={{ maxHeight }}>
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-muted">
              <tr>
                {cols.map((c) => {
                  const active = sort?.key === c.key
                  return (
                    <th key={c.key} scope="col" aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'} className={cn('border-b border-border px-3 py-2 text-xs font-semibold whitespace-nowrap text-muted-foreground', c.align === 'right' ? 'text-right' : 'text-left')}>
                      <button type="button" onClick={() => toggleSort(c.key)} className={cn('inline-flex items-center gap-1 hover:text-foreground', c.align === 'right' && 'flex-row-reverse')}>
                        {c.label ?? humanizeKey(c.key)}
                        {active ? sort.dir === 'asc' ? <ArrowUp className="size-3" aria-hidden="true" /> : <ArrowDown className="size-3" aria-hidden="true" /> : <ArrowUpDown className="size-3 opacity-40" aria-hidden="true" />}
                      </button>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {visible.map((row, i) => (
                <tr
                  key={i}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  onKeyDown={onRowClick ? (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onRowClick(row)) : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  className={cn('border-b border-border/70 last:border-0 even:bg-muted/30', onRowClick && 'cursor-pointer hover:bg-primary-soft/60 focus-visible:bg-primary-soft/60')}
                >
                  {cols.map((c) => (
                    <td key={c.key} className={cn('px-3 py-2 align-top whitespace-nowrap', c.align === 'right' && 'tabular text-right', c.className)}>
                      {c.render ? c.render(row) : formatCell(row[c.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {footer && <div className="border-t border-border px-4 py-3">{footer}</div>}
    </Panel>
  )
}
