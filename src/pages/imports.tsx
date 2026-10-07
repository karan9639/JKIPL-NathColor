import { useState } from 'react'
import { useParams } from 'react-router'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ClipboardPaste, FileUp, Upload } from 'lucide-react'
import { api } from '@/lib/services'
import { errorMessage } from '@/lib/api'
import { chunk, parseClipboardTable, readHtmlTables, readWorkbook, toIsoDate, zipFile } from '@/lib/spreadsheet'
import { humanizeKey, type Row } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Field, Textarea } from '@/components/ui/field'
import { DataTable, type Column } from '@/components/ui/data-table'
import { EmptyState, PageHeader, Panel, PanelHeader, Stat } from '@/components/ui/panel'

type Source = 'paste' | 'html' | 'xlsx' | 'zip'

interface ImportDef {
  title: string
  description: string
  source: Source
  endpoint: string
  accept?: string
  sheet?: string
  extra?: Record<string, unknown>
  chunkSize?: number
}

const IMPORTS: Record<string, ImportDef> = {
  'dyeing-programs': { title: 'Import Dyeing Programs', description: 'Copy the greige requisition range from Excel (including the header row) and paste it below.', source: 'paste', endpoint: '/uploadgreq' },
  'job-cards-opening': { title: 'Import Job Cards Opening', description: 'Upload the job card HTML export from the ERP.', source: 'html', endpoint: '/insertJobCards', accept: '.html,.htm,.xls', chunkSize: 500 },
  'job-cards-closing': { title: 'Import Job Cards Closing', description: 'Upload the closed job cards export. The file is compressed before upload.', source: 'zip', endpoint: '/upload_closed_djc', accept: '.html,.htm,.xls,.xlsx' },
  'greige-stock-u2': { title: 'Import Greige Stock U-2', description: 'Copy the Unit-2 greige stock range from Excel and paste it below.', source: 'paste', endpoint: '/uploadgreigestock', extra: { unit: 'U-2' } },
  'greige-stock-u3': { title: 'Import Greige Stock U-3', description: 'Upload the Unit-3 greige stock workbook.', source: 'xlsx', endpoint: '/uploadgreigestock', accept: '.xlsx,.xls', extra: { unit: 'U-3' } },
  'yarn-stock': { title: 'Import Yarn Stock', description: 'Upload the yarn stock HTML export from the ERP.', source: 'html', endpoint: '/insertYarnStock', accept: '.html,.htm,.xls' },
  dispatch: { title: 'Import Dispatch / Billing', description: 'Upload the dispatch register HTML export from the ERP.', source: 'html', endpoint: '/insertDispatch', accept: '.html,.htm,.xls', chunkSize: 500 },
  'orders-book': { title: 'Import Orders Book', description: 'Upload the order book export. The file is compressed before upload.', source: 'zip', endpoint: '/upload_orders', accept: '.html,.htm,.xls,.xlsx' },
  recipes: { title: 'Import Recipes', description: 'Upload the recipe workbook. Rows are read from the MIX sheet.', source: 'xlsx', endpoint: '/upload-recipe', accept: '.xlsx,.xls', sheet: 'MIX' },
}

function tableToRows(table: unknown[][]): Row[] {
  const cells = table.map((r) => r.map((c) => String(c ?? '').trim()))
  const headerIndex = cells.findIndex((r) => r.filter(Boolean).length >= 3)
  if (headerIndex < 0) return []
  const headers = cells[headerIndex].map((h, i) => h || `COL${i + 1}`)
  return cells
    .slice(headerIndex + 1)
    .filter((r) => r.some(Boolean))
    .map((r) =>
      Object.fromEntries(
        headers.map((h, i) => {
          const v = r[i] ?? ''
          return [h, /date/i.test(h) ? toIsoDate(v) || v : v]
        }),
      ),
    )
}

function summarize(result: Row): [string, string][] {
  return Object.entries(result)
    .filter(([, v]) => typeof v === 'number' || typeof v === 'string' || Array.isArray(v))
    .map(([k, v]) => [humanizeKey(k), Array.isArray(v) ? String(v.length) : String(v)])
}

export default function ImportsRouter() {
  const { kind = '' } = useParams()
  const def = IMPORTS[kind]
  if (!def) return <EmptyState title="Import not found" />
  return <ImportPage key={kind} def={def} />
}

function ImportPage({ def }: { def: ImportDef }) {
  const [paste, setPaste] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [parsing, setParsing] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [result, setResult] = useState<Row | null>(null)

  const parseFile = async (f: File) => {
    setFile(f)
    setRows([])
    setResult(null)
    if (def.source === 'zip') return
    setParsing(true)
    try {
      if (def.source === 'html') {
        const tables = await readHtmlTables(f)
        const largest = tables.sort((a, b) => b.length - a.length)[0] ?? []
        setRows(tableToRows(largest))
      } else {
        const book = await readWorkbook(f)
        const sheet = def.sheet && book.sheetNames.includes(def.sheet) ? def.sheet : book.sheetNames[0]
        if (def.sheet && sheet !== def.sheet) toast.warning(`Sheet "${def.sheet}" not found, using "${sheet}"`)
        setRows(tableToRows(book.sheetRows(sheet)))
      }
    } catch (e) {
      toast.error(`Could not read file: ${errorMessage(e)}`)
    } finally {
      setParsing(false)
    }
  }

  const upload = useMutation({
    mutationFn: async () => {
      if (def.source === 'zip') {
        if (!file) throw new Error('Choose a file first')
        return (await api.uploadZip(def.endpoint, await zipFile(file), `${file.name}.zip`)) as Row
      }
      const batches = chunk(rows, def.chunkSize ?? rows.length)
      const totals: Row = {}
      setProgress({ done: 0, total: batches.length })
      for (const [i, batch] of batches.entries()) {
        const res = (await api.postRows(def.endpoint, batch, def.extra)) as Row
        for (const [k, v] of Object.entries(res ?? {})) {
          totals[k] = typeof v === 'number' ? Number(totals[k] ?? 0) + v : Array.isArray(v) ? [...((totals[k] as unknown[]) ?? []), ...v] : v
        }
        setProgress({ done: i + 1, total: batches.length })
      }
      return totals
    },
    onSuccess: (res) => {
      setResult(res)
      toast.success(String(res?.message ?? 'Import complete'))
    },
    onError: (e) => toast.error(errorMessage(e)),
    onSettled: () => setProgress(null),
  })

  const columns: Column[] = rows[0] ? Object.keys(rows[0]).slice(0, 12).map((key) => ({ key, label: key })) : []
  const errorRows = Array.isArray(result?.error_rows) ? (result.error_rows as Row[]) : []
  const canUpload = def.source === 'zip' ? !!file : rows.length > 0

  return (
    <>
      <PageHeader title={def.title} description={def.description} />

      <Panel>
        <PanelHeader title={def.source === 'paste' ? '1. Paste data' : '1. Choose file'} />
        <div className="p-4">
          {def.source === 'paste' ? (
            <div className="flex flex-col gap-3">
              <Field label="Excel data" htmlFor="paste" hint="Select the range in Excel, press Ctrl+C, then paste here.">
                <Textarea id="paste" rows={8} value={paste} onChange={(e) => setPaste(e.target.value)} className="font-mono text-xs" placeholder="Paste tab-separated rows…" />
              </Field>
              <div>
                <Button
                  variant="outline"
                  disabled={!paste.trim()}
                  onClick={() => {
                    const parsed = tableToRows(parseClipboardTable(paste))
                    setRows(parsed)
                    setResult(null)
                    if (!parsed.length) toast.error('No rows found. Include the header row.')
                  }}
                >
                  <ClipboardPaste aria-hidden="true" />
                  Preview rows
                </Button>
              </div>
            </div>
          ) : (
            <label htmlFor="file" className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border px-6 py-10 text-center hover:border-primary hover:bg-primary-soft/40">
              <FileUp className="size-8 text-primary" aria-hidden="true" />
              <span className="text-sm font-medium">{file ? file.name : 'Click to choose a file'}</span>
              <span className="text-xs text-muted-foreground">{def.accept?.replaceAll(',', ', ')}</span>
              <input
                id="file"
                type="file"
                accept={def.accept}
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) parseFile(f)
                  e.target.value = ''
                }}
              />
            </label>
          )}
        </div>
      </Panel>

      {(rows.length > 0 || parsing) && (
        <DataTable rows={rows} columns={columns} isLoading={parsing} title="2. Preview" description={`${rows.length} rows parsed${columns.length === 12 ? ' · first 12 columns shown' : ''}`} searchable={false} />
      )}

      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        <Button size="lg" disabled={!canUpload} loading={upload.isPending} onClick={() => upload.mutate()}>
          <Upload aria-hidden="true" />
          {def.source === 'zip' ? 'Upload file' : `Upload ${rows.length} rows`}
        </Button>
        {progress && (
          <p className="tabular text-sm text-muted-foreground" aria-live="polite">
            Batch {progress.done} of {progress.total}…
          </p>
        )}
      </div>

      {result && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {summarize(result).map(([label, value]) => (
              <Stat key={label} label={label} value={value} />
            ))}
          </div>
          {errorRows.length > 0 && <DataTable rows={errorRows} columns={Object.keys(errorRows[0]).map((key) => ({ key, label: key }))} title="Rejected rows" exportName="import-errors" />}
        </>
      )}
    </>
  )
}
