import { zipSync } from 'fflate'
import type { Row } from './utils'

export async function exportRowsToXlsx(rows: Row[], keys: string[], name: string, sheetName = 'Data') {
  const XLSX = await import('xlsx')
  const data = rows.map((r) => Object.fromEntries(keys.map((k) => [k, r[k] ?? ''])))
  const sheet = XLSX.utils.json_to_sheet(data, { header: keys })
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, sheet, sheetName)
  const stamp = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(book, `${name}-${stamp}.xlsx`)
}

export async function readWorkbook(file: File) {
  const XLSX = await import('xlsx')
  const buffer = await file.arrayBuffer()
  const book = XLSX.read(buffer, { type: 'array', cellDates: false })
  return {
    sheetNames: book.SheetNames,
    sheetRows(name?: string, raw = false): unknown[][] {
      const sheet = book.Sheets[name ?? book.SheetNames[0]]
      if (!sheet) return []
      return XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw, defval: '' })
    },
    sheetObjects(name: string): Row[] | null {
      const sheet = book.Sheets[name]
      if (!sheet) return null
      return XLSX.utils.sheet_to_json<Row>(sheet, { raw: false, defval: '' })
    },
  }
}

/** Parse a tab-separated clipboard paste (as copied from Excel) into a 2D string array. */
export function parseClipboardTable(text: string): string[][] {
  return text
    .replace(/\r/g, '')
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => line.split('\t').map((c) => c.trim()))
}

/** Extract tables from an ERP HTML export; returns each <tr> as an array of <td> texts. */
export async function readHtmlTables(file: File): Promise<string[][][]> {
  const text = await file.text()
  const doc = new DOMParser().parseFromString(text, 'text/html')
  return Array.from(doc.querySelectorAll('table')).map((table) =>
    Array.from(table.querySelectorAll('tr')).map((tr) =>
      Array.from(tr.querySelectorAll('td, th')).map((td) => (td.textContent ?? '').replace(/\s+/g, ' ').trim()),
    ),
  )
}

export async function zipFile(file: File): Promise<Blob> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const zipped = zipSync({ [file.name]: bytes }, { level: 6 })
  return new Blob([zipped as BlobPart], { type: 'application/zip' })
}

const MONTHS: Record<string, string> = { JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06', JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12' }

/** Convert ERP dates like 05-Mar-2026, 05/03/2026 or 05-03-26 into yyyy-mm-dd. Returns '' if unparseable. */
export function toIsoDate(value: unknown): string {
  const text = String(value ?? '').trim()
  if (!text) return ''
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10)
  const m = text.match(/^(\d{1,2})[-/. ]([A-Za-z]{3}|\d{1,2})[-/. ](\d{2,4})/)
  if (!m) return ''
  const [, d, mon, y] = m
  const month = /\d/.test(mon) ? mon.padStart(2, '0') : MONTHS[mon.toUpperCase()]
  if (!month) return ''
  const year = y.length === 2 ? `20${y}` : y
  return `${year}-${month}-${d.padStart(2, '0')}`
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}
