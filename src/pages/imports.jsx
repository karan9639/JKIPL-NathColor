import { useState } from 'react';
import { useParams } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ClipboardPaste, FileUp, Upload, RefreshCw } from 'lucide-react';
import { dyeingService } from '@/services/dyeing.service';
import { yarnService } from '@/services/yarn.service';
import { ordersService } from '@/services/orders.service';
import { importsService } from '@/services/imports.service';
import { errorMessage } from '@/services/http/client';
import { config } from '@/config/env';
import { chunk, exportRowsToXlsx, parseClipboardTable, readHtmlTables, readWorkbook, zipFile } from '@/utils/spreadsheet';
import { extractYarnTable, dataTableRows, extractOrderBookTable, normalizeOrderBookRecords } from '@/utils/import-mappers';
import { COMPLETION_TEMPLATE, normalizeCompletionSheet, normalizePlanningSheet } from '@/utils/knitting';
import { humanizeKey } from '@/utils/format';
import { IMPORTS } from '@/constants/imports';
import { flattenForPreview, summarize, normalizeRecords } from '@/utils/import-transform';
import { Button } from '@/components/ui/button';
import { Field, Input, Textarea } from '@/components/ui/field';
import { DataTable } from '@/components/ui/data-table';
import { EmptyState, PageHeader, Panel, PanelHeader, Stat } from '@/components/ui/panel';

export default function ImportsRouter() {
    const { kind = '' } = useParams();
    const def = IMPORTS[kind];
    if (!def) return <EmptyState title="Import not found"/>;
    return <ImportPage key={kind} def={def}/>;
}
function ImportPage({ def }) {
    const queryClient = useQueryClient();
    const [paste, setPaste] = useState('');
    const [file, setFile] = useState(null);
    const [rows, setRows] = useState([]);
    const [issues, setIssues] = useState([]);
    const [period, setPeriod] = useState({ fromDate: '', toDate: '' });
    const [parsing, setParsing] = useState(false);
    const [progress, setProgress] = useState(null);
    const [result, setResult] = useState(null);
    const [saved, setSaved] = useState(null);
    const [savedError, setSavedError] = useState('');
    const [savedLoading, setSavedLoading] = useState(false);
    const [savedDate, setSavedDate] = useState('');
    const [savedPage, setSavedPage] = useState(1);

    const finishParse = (sourceRows) => {
        const { rows: clean, errors } = def.backend === 'orderbook'
            ? normalizeOrderBookRecords(sourceRows)
            : normalizeRecords(def, sourceRows);
        setRows(clean);
        setIssues(errors);
        setResult(null);
        if (errors.length) toast.error(`${errors.length} row(s) need correction before upload.`);
        else if (!clean.length) toast.error('No data rows found. Check the report and headers.');
    };
    const parseFile = async (selectedFile) => {
        setFile(selectedFile);
        setRows([]);
        setIssues([]);
        setResult(null);
        if (def.source === 'zip') return;
        setParsing(true);
        try {
            if (def.backend === 'orderbook') {
                // ERP exports may be real Excel workbooks or HTML tables saved with .xls.
                const fileStart = await selectedFile.slice(0, 512).text().catch(() => '');
                const looksLikeHtml = /<\s*(html|table|head|body)\b/i.test(fileStart);
                let table;
                if (/\.(html?|htm)$/i.test(selectedFile.name) || looksLikeHtml) {
                    const tables = await readHtmlTables(selectedFile);
                    table = extractOrderBookTable(tables);
                } else {
                    const book = await readWorkbook(selectedFile);
                    const sheet = book.sheetNames[0];
                    table = extractOrderBookTable([book.sheetRows(sheet, false)]);
                }
                finishParse(table);
            } else if (def.source === 'html') {
                const tables = await readHtmlTables(selectedFile);
                if (def.backend === 'yarn') {
                    const { records, reportPeriod } = extractYarnTable(tables);
                    setPeriod(reportPeriod ?? { fromDate: '', toDate: '' });
                    finishParse(records);
                } else {
                    const biggest = [...tables].sort((a, b) => b.length - a.length)[0] ?? [];
                    finishParse(dataTableRows(biggest, [], 3));
                }
            } else {
                const book = await readWorkbook(selectedFile);
                if (def.requiredSheet && def.sheet && !book.sheetNames.includes(def.sheet)) {
                    throw new Error(`Required worksheet "${def.sheet}" not found. Available sheets: ${book.sheetNames.slice(0, 8).join(', ')}`);
                }
                const sheet = def.sheet && book.sheetNames.includes(def.sheet) ? def.sheet : book.sheetNames[0];
                if (def.sheet && sheet !== def.sheet) toast.warning(`Sheet "${def.sheet}" not found, using "${sheet}"`);
                const table = book.sheetRows(sheet, !!def.knittingFormat || def.backend === 'dyeing');
                if (def.knittingFormat) {
                    finishParse(def.knittingFormat === 'planning' ? normalizePlanningSheet(table, selectedFile.name) : normalizeCompletionSheet(table));
                } else {
                    const required = def.backend === 'dyeing' ? ['Dyeing Schedule Date', 'Dyeing Schedule No.', 'Order ID'] : [];
                    finishParse(dataTableRows(table, required, def.extra?.unit === 'U-2' ? 2 : 3));
                }
            }
        } catch (e) {
            setRows([]);
            setIssues([]);
            toast.error(`Could not read file: ${errorMessage(e)}`);
        } finally { setParsing(false); }
    };
    const pasteData = () => {
        setFile(null);
        try {
            const table = parseClipboardTable(paste);
            const required = def.backend === 'dyeing' ? ['Dyeing Schedule Date', 'Dyeing Schedule No.', 'Order ID'] : [];
            finishParse(dataTableRows(table, required, def.extra?.unit === 'U-2' ? 2 : 3));
        } catch (e) { setRows([]); setIssues([]); toast.error(errorMessage(e)); }
    };
    const upload = useMutation({
        mutationFn: async () => {
            if (def.backend === 'orderbook') {
                if (!rows.length || issues.length) throw new Error('Choose a valid Order Book file and correct any invalid rows before uploading.');
                const batches = chunk(rows, def.chunkSize ?? 100);
                const totals = {};
                setProgress({ done: 0, total: batches.length });
                for (const [i, batch] of batches.entries()) {
                    let res;
                    try {
                        res = await ordersService.createOrderBook(batch);
                    } catch (error) {
                        if (i > 0) {
                            throw new Error(`${i} batch(es) were uploaded before this request failed. Check the database before retrying to avoid duplicate records. ${errorMessage(error)}`);
                        }
                        throw error;
                    }
                    for (const [key, value] of Object.entries(res ?? {})) {
                        totals[key] = typeof value === 'number'
                            ? Number(totals[key] ?? 0) + value
                            : Array.isArray(value) ? [...(totals[key] ?? []), ...value] : value;
                    }
                    setRows((current) => current.slice(batch.length));
                    setProgress({ done: i + 1, total: batches.length });
                }
                return totals;
            }
            if (def.source === 'zip') {
                if (!file) throw new Error('Choose a file first');
                return importsService.uploadZip(def.endpoint, await zipFile(file), `${file.name}.zip`);
            }
            if (!rows.length || issues.length) throw new Error('Correct invalid rows before uploading.');
            if (def.backend === 'yarn' && (!period.fromDate || !period.toDate || period.fromDate > period.toDate)) {
                throw new Error('Enter a valid stock report date range (From date must be on or before To date).');
            }
            const batches = chunk(rows, def.chunkSize ?? rows.length);
            const totals = {};
            setProgress({ done: 0, total: batches.length });
            for (const [i, batch] of batches.entries()) {
                let res;
                try {
                    if (def.backend === 'dyeing') res = await dyeingService.createDyeingPrograms(batch);
                    else if (def.backend === 'yarn') res = await yarnService.createImportedYarnStock(batch, period);
                    else res = await importsService.postRows(def.endpoint, batch, { ...def.extra, ...(def.knittingFormat ? { source: 'excel', source_filename: file?.name ?? '' } : {}) });
                } catch (error) {
                    // insertMany is not idempotent. Keep only the NOT-YET-UPLOADED
                    // rows in the preview so retrying won't resubmit successful batches.
                    if (i > 0) {
                        throw new Error(`${i} batch(es) were uploaded before this request failed. Only the remaining ${rows.length - i * (def.chunkSize ?? rows.length)} rows are kept for retry. ${errorMessage(error)}`);
                    }
                    throw error;
                }
                for (const [k, v] of Object.entries(res ?? {})) {
                    totals[k] = typeof v === 'number' ? Number(totals[k] ?? 0) + v : Array.isArray(v) ? [...(totals[k] ?? []), ...v] : v;
                }
                setRows(rows.slice(Math.min(rows.length, (i + 1) * (def.chunkSize ?? rows.length))));
                setProgress({ done: i + 1, total: batches.length });
            }
            return totals;
        },
        onSuccess: (res) => {
            setResult(res ?? { message: 'Import complete' });
            setSaved(null);
            setRows([]); // Prevent accidental double submission: backend insertMany is not an upsert.
            setFile(null);
            setPaste('');
            toast.success(String(res?.message ?? 'Import complete'));
            void queryClient.invalidateQueries({ queryKey: ['knitting-po-lines'] });
            void queryClient.invalidateQueries({ queryKey: ['tracker'] });
            void queryClient.invalidateQueries({ queryKey: ['dyeing-programs'] });
            void queryClient.invalidateQueries({ queryKey: ['yarn-stock'] });
            void queryClient.invalidateQueries({ queryKey: ['orders'] });
        },
        onError: (e) => toast.error(errorMessage(e)),
        onSettled: () => setProgress(null),
    });
    const loadSaved = async (page = 1) => {
        setSavedError('');
        setSavedLoading(true);
        try {
            const params = { page, ...(savedDate ? { date: savedDate } : {}) };
            const data = def.backend === 'dyeing' ? await dyeingService.fetchImportedDyeingPrograms(params) : await yarnService.fetchImportedYarnStock(params);
            setSaved(data);
            setSavedPage(page);
        } catch (error) {
            setSaved(null);
            setSavedError(error.status === 404 ? 'No imports found for this date.' : errorMessage(error));
        } finally { setSavedLoading(false); }
    };
    const previewRows = rows.slice(0, 100).map(flattenForPreview);
    const columns = previewRows[0] ? Object.keys(previewRows[0]).slice(0, 12).map((key) => ({ key, label: humanizeKey(key) })) : [];
    const errorRows = Array.isArray(result?.error_rows) ? result.error_rows : [];
    const canUpload = def.source === 'zip' ? !!file : rows.length > 0 && !issues.length && !parsing && (def.backend !== 'yarn' || (!!period.fromDate && !!period.toDate && period.fromDate <= period.toDate));
    const showUploadFile = def.source !== 'paste' || def.allowFile;
    const showPaste = def.source === 'paste' || def.allowPaste;
    const savedRows = def.backend === 'dyeing' ? saved?.dyeingPrograms ?? [] : saved?.yarnStocks ?? [];
    const savedPreview = savedRows.map(flattenForPreview);
    const savedColumns = savedPreview[0] ? Object.keys(savedPreview[0]).filter((key) => !['_id', '__v'].includes(key)).slice(0, 12).map((key) => ({ key, label: humanizeKey(key) })) : [];
    return (<>
      <PageHeader title={def.title} description={def.description}/>
      {!def.backend && <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">
        This import uses the legacy API route <code className="break-all font-mono">{def.endpoint}</code>, which is not provided in the supplied Express backend. {config.legacyApiBaseUrl ? 'Requests are directed to your configured legacy service. That service must implement and authorize this route.' : 'If your legacy API runs separately, set VITE_LEGACY_API_BASE_URL in .env and restart Vite. Otherwise this upload will return 404.'}
      </div>}
      {def.knittingFormat && (<div className="rounded-md border border-border bg-surface px-4 py-3 text-sm text-muted-foreground">
          {def.knittingFormat === 'planning' ? <p>Reads only the <strong>PO</strong> worksheet. Identical fabric names under one PO remain separate source rows. SOURCE_FILE + SOURCE_SHEET + SOURCE_ROW_NUMBER are passed to the backend for reconciliation.</p> : <div className="flex flex-wrap items-center justify-between gap-2">
              <p>Use stable <strong>PRODUCTION_EVENT_ID</strong> values for idempotent uploads. <strong>PO_LINE_ID</strong> comes from the PO tracker export.</p>
              <Button size="sm" variant="outline" onClick={() => void exportRowsToXlsx(COMPLETION_TEMPLATE, Object.keys(COMPLETION_TEMPLATE[0]), 'knitting-completion-template', 'KNITTING_COMPLETION')}>Download blank template</Button>
            </div>}
        </div>)}
      <Panel>
        <PanelHeader title="1. Select import data"/>
        <div className="flex flex-col gap-5 p-4">
          {showUploadFile && <label htmlFor="file" className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border px-4 py-8 text-center transition-colors hover:border-primary hover:bg-primary-soft/40 sm:px-6">
              <FileUp className="size-8 text-primary" aria-hidden="true"/>
              <span className="max-w-full break-all text-sm font-medium">{file ? file.name : 'Click to choose a file'}</span>
              <span className="text-xs text-muted-foreground">{def.accept?.replaceAll(',', ', ')}</span>
              <input id="file" type="file" accept={def.accept} className="sr-only" onChange={(e) => {
                  const selected = e.target.files?.[0];
                  if (selected) void parseFile(selected);
                  e.target.value = '';
              }}/>
          </label>}
          {showPaste && <div className="flex flex-col gap-3">
              {showUploadFile && <p className="text-center text-xs font-medium uppercase tracking-widest text-muted-foreground">Or paste Excel data</p>}
              <Field label="Excel data" htmlFor="paste" hint="Select the table in Excel, press Ctrl+C, then paste here (include the header row).">
                <Textarea id="paste" rows={6} value={paste} onChange={(e) => setPaste(e.target.value)} className="font-mono text-xs" placeholder="Paste tab-separated rows…"/>
              </Field>
              <div><Button variant="outline" disabled={!paste.trim() || parsing || upload.isPending} onClick={pasteData}><ClipboardPaste aria-hidden="true"/>Preview pasted rows</Button></div>
          </div>}
          {def.backend === 'yarn' && <div className="grid gap-4 rounded-lg border border-border bg-muted/30 p-4 sm:grid-cols-2">
              <Field label="Report from date" htmlFor="report-from"><Input id="report-from" type="date" value={period.fromDate} onChange={(e) => setPeriod((p) => ({ ...p, fromDate: e.target.value }))}/></Field>
              <Field label="Report to date" htmlFor="report-to"><Input id="report-to" type="date" value={period.toDate} onChange={(e) => setPeriod((p) => ({ ...p, toDate: e.target.value }))}/></Field>
              <p className="text-xs text-muted-foreground sm:col-span-2">Dates are detected from the uploaded report when possible. Verify them before importing.</p>
          </div>}
        </div>
      </Panel>
      {!!issues.length && <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800" role="alert">
          <p className="font-semibold">{issues.length} invalid row(s) — upload is disabled until the file is corrected.</p>
          <ul className="mt-2 max-h-40 list-disc space-y-1 overflow-auto pl-5">{issues.slice(0, 30).map((issue, index) => <li key={index}>{issue}</li>)}</ul>
          {issues.length > 30 && <p className="mt-2">Showing the first 30 issues.</p>}
      </div>}
      {(rows.length > 0 || parsing) && <DataTable rows={previewRows} columns={columns} isLoading={parsing} title="2. Review data" description={`${rows.length} valid row(s)${rows.length > 100 ? ' · previewing first 100' : ''}${columns.length === 12 ? ' · first 12 columns' : ''}`} searchable={false}/>}
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        <Button size="lg" disabled={!canUpload || upload.isPending} loading={upload.isPending} onClick={() => upload.mutate()}><Upload aria-hidden="true"/>{def.source === 'zip' ? 'Upload file' : `Upload ${rows.length} rows`}</Button>
        {progress && <p className="text-sm tabular text-muted-foreground" aria-live="polite">Batch {progress.done} of {progress.total}…</p>}
      </div>
      {result && <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{summarize(result).map(([label, value]) => <Stat key={label} label={label} value={value}/>)}</div>
          {errorRows.length > 0 && <DataTable rows={errorRows} columns={Object.keys(errorRows[0]).map((key) => ({ key, label: key }))} title="Rejected rows" exportName="import-errors"/>}
      </>}
      {(def.backend === 'dyeing' || def.backend === 'yarn') && <Panel>
          <PanelHeader title="Saved imports"/>
          <div className="flex flex-wrap items-end gap-3 p-4">
              <Field label={def.backend === 'dyeing' ? 'Dyeing schedule date' : 'Stock report to date'} htmlFor="saved-date">
                  <Input id="saved-date" type="date" value={savedDate} onChange={(e) => setSavedDate(e.target.value)}/>
              </Field>
              <Button variant="outline" loading={savedLoading} onClick={() => void loadSaved(1)}><RefreshCw aria-hidden="true"/>Load saved records</Button>
              <p className="text-xs text-muted-foreground">Leave the date empty to fetch the most recent report. 100 records per page.</p>
          </div>
          {savedError && <p role="alert" className="px-4 pb-4 text-sm text-red-600">{savedError}</p>}
          {saved && <div className="px-4 pb-4">
              <DataTable rows={savedPreview} columns={savedColumns} title={`Saved records (${saved.pagination?.totalEntries ?? savedRows.length})`} searchable={false}/>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <Button size="sm" variant="outline" disabled={savedLoading || !saved.pagination?.hasPrevPage} onClick={() => void loadSaved(savedPage - 1)}>Previous</Button>
                  <span className="text-xs text-muted-foreground">Page {savedPage} of {saved.pagination?.totalPages ?? 1}</span>
                  <Button size="sm" variant="outline" disabled={savedLoading || !saved.pagination?.hasNextPage} onClick={() => void loadSaved(savedPage + 1)}>Next</Button>
              </div>
          </div>}
      </Panel>}
    </>);
}
