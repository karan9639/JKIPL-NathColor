import { localPageSize } from '@/utils/all-page-size';
import { useDeferredValue, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ClipboardPaste, FileUp, Upload, Eye } from 'lucide-react';
import { dyeingService } from '@/services/dyeing.service';
import { yarnService } from '@/services/yarn.service';
import { ordersService } from '@/services/orders.service';
import { greigeStockService } from '@/services/greige-stock.service';
import { importsService } from '@/services/imports.service';
import { errorMessage } from '@/services/http/client';
import { chunk, parseClipboardTable, readHtmlTables, readWorkbook } from '@/utils/spreadsheet';
import { dataTableRows } from '@/utils/import-mappers';
import { humanizeKey } from '@/utils/format';
import { parseERPFile, withErpOccurrences } from '@/utils/erp-file-parser';
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
    const reviewRef = useRef(null);
    const [paste, setPaste] = useState('');
    const [previewPage, setPreviewPage] = useState(1);
    const [previewLimit, setPreviewLimit] = useState(50);
    const [previewSearch, setPreviewSearch] = useState('');
    const deferredPreviewSearch = useDeferredValue(previewSearch);
    const [file, setFile] = useState(null);
    const [rows, setRows] = useState([]);
    const [issues, setIssues] = useState([]);
    const [period, setPeriod] = useState({ fromDate: '', toDate: '' });
    const [parsing, setParsing] = useState(false);
    const [progress, setProgress] = useState(null);
    const [result, setResult] = useState(null);
    const [uploadError, setUploadError] = useState(null);
    const [duplicateRows, setDuplicateRows] = useState(0);
    const [saved, setSaved] = useState(null);
    const [savedError, setSavedError] = useState('');
    const [savedLoading, setSavedLoading] = useState(false);
    const [savedDate, setSavedDate] = useState('');
    const [savedLimit, setSavedLimit] = useState(50);

    const finishParse = (sourceRows) => {
        const normalized = normalizeRecords(def, sourceRows);
        if (!Array.isArray(normalized?.rows) || !Array.isArray(normalized?.errors)) {
            throw new Error('ERP validation returned invalid rows/errors. Check the selected report format.');
        }
        const { rows: rawClean, errors, duplicateRows: repeated = 0 } = normalized;
        const clean = ['/insertDispatch','/insertClosedJobCards','/upload-recipe'].includes(def.endpoint) ? withErpOccurrences(rawClean) : rawClean;
        setDuplicateRows(repeated);
        setPreviewPage(1);
        setPreviewSearch('');
        setUploadError(null);
        setRows(clean);
        setIssues(errors);
        setResult(null);
        if (errors.length) toast.error(`${errors.length} row(s) need correction before upload.`);
        else if (repeated) toast.info(`${repeated} exact duplicate ERP row(s) will be skipped.`);
        else if (!clean.length) toast.error('No data rows found. Check the report and headers.');
    };
    const parseFile = async (selectedFile) => {
        if (parsing || upload.isPending) return;
        setFile(selectedFile);
        setRows([]);
        setIssues([]);
        setResult(null);
        setUploadError(null);
        setDuplicateRows(0);
        setPreviewPage(1);
        setPreviewSearch('');
        setParsing(true);
        try {
            const parsed = await parseERPFile(selectedFile, def, {readWorkbook,readHtmlTables});
            if (!Array.isArray(parsed?.rows)) throw new Error('ERP parser returned an invalid result.');
            if (def.backend === 'yarn') setPeriod(parsed.reportPeriod ?? {fromDate:'',toDate:''});
            finishParse(parsed.rows);
        } catch (e) {
            setRows([]);
            setIssues([]);
            toast.error(`Could not read file: ${errorMessage(e)}`);
            setUploadError({ message: `Could not read file: ${errorMessage(e)}` });
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
            if (!rows.length || issues.length) throw new Error('Correct invalid rows before uploading.');
            if (def.backend === 'yarn' && (!period.fromDate || !period.toDate || period.fromDate > period.toDate)) {
                throw new Error('Enter a valid stock report date range (From date must be on or before To date).');
            }
            if (['yarn', 'greige-u2', 'greige-u3'].includes(def.backend) && rows.length > 10000) {
                throw new Error('A stock report must contain at most 10,000 records and be uploaded as one complete snapshot.');
            }
            const batches = ['yarn', 'greige-u2', 'greige-u3'].includes(def.backend) ? [rows] : chunk(rows, def.chunkSize ?? rows.length);
            const totals = {};
            setProgress({ done: 0, total: batches.length });
            for (const [i, batch] of batches.entries()) {
                let res;
                try {
                    if (def.backend === 'dyeing') res = await dyeingService.createDyeingPrograms(batch);
                    else if (def.backend === 'yarn') res = await yarnService.createImportedYarnStock(batch, period);
                    else if (def.backend === 'greige-u2') res = await greigeStockService.createU2(batch);
                    else if (def.backend === 'greige-u3') res = await greigeStockService.createU3(batch);
                    else res = await importsService.postRows(def.endpoint, batch, { ...def.extra, ...(def.knittingFormat ? { source: 'excel', source_filename: file?.name ?? '' } : {}) });
                } catch (error) {
                    // import upserts use stable ERP identifiers. Keep only the NOT-YET-UPLOADED
                    // rows in the preview so retrying won't resubmit successful batches.
                    if (i > 0) {
                        throw new Error(`${i} batch(es) were uploaded before this request failed. Only the remaining ${rows.length - i * (def.chunkSize ?? rows.length)} rows are kept for retry. ${errorMessage(error)}`);
                    }
                    throw error;
                }
                for (const [k, v] of Object.entries(res ?? {})) {
                    totals[k] = k === 'statusCounts' && v && typeof v === 'object'
                        ? Object.fromEntries([...new Set([...Object.keys(totals[k] ?? {}), ...Object.keys(v)])].map(name => [name, Number(totals[k]?.[name] ?? 0) + Number(v[name] ?? 0)]))
                        : typeof v === 'number' ? Number(totals[k] ?? 0) + v : Array.isArray(v) ? [...(totals[k] ?? []), ...v] : v;
                }
                setRows(rows.slice(Math.min(rows.length, (i + 1) * (def.chunkSize ?? rows.length))));
                setProgress({ done: i + 1, total: batches.length });
            }
            return totals;
        },
        onSuccess: (res) => {
            setUploadError(null);
            setResult(res ?? { message: 'Import complete' });
            setSaved(null);
            setRows([]); // Avoid accidental resubmission; the import API uses ERP-keyed upserts.
            setFile(null);
            setPaste('');
            toast.success(String(res?.message ?? 'Import complete'));
            void queryClient.invalidateQueries({ queryKey: ['knitting-po-lines'] });
            void queryClient.invalidateQueries({ queryKey: ['tracker'] });
            void queryClient.invalidateQueries({ queryKey: ['dyeing-programs'] });
            void queryClient.invalidateQueries({ queryKey: ['yarn-stock'] });
            void queryClient.invalidateQueries({ queryKey: ['recipe-records'] });
            void queryClient.invalidateQueries({ queryKey: ['greige-stock'] });
            void queryClient.invalidateQueries({ queryKey: ['orders'] });
            for (const key of ['order-book', 'order-summary', 'order-tracker', 'job-card-lots', 'records', 'report', 'lud']) void queryClient.invalidateQueries({ queryKey: [key] });
        },
        onError: (e) => { setUploadError({ status: e.status, code: e.code, message: errorMessage(e) }); },
        onSettled: () => setProgress(null),
    });
    const loadSaved = async (page = 1, limit = savedLimit) => {
        setSavedError('');
        setSavedLoading(true);
        try {
            const params = { page, limit, ...(savedDate ? { date: savedDate } : {}) };
            const data = def.backend === 'dyeing' ? await dyeingService.fetchImportedDyeingPrograms(params) : await yarnService.fetchImportedYarnStock(params);
            setSaved(data);
        } catch (error) {
            setSaved(null);
            setSavedError(error.status === 404 ? 'No imports found for this date.' : errorMessage(error));
        } finally { setSavedLoading(false); }
    };
    // Review every ERP row but render only the current preview page.
    // For large files this avoids rendering/flattening thousands of rows at once.
    const previewMatches = useMemo(() => {
        const words = deferredPreviewSearch.trim().toUpperCase().split(/\s+/).filter(Boolean);
        if (!words.length) return rows;
        return rows.filter(row => {
            const haystack = JSON.stringify(row).toUpperCase();
            return words.every(word => haystack.includes(word));
        });
    }, [rows, deferredPreviewSearch]);
    const previewEffectiveLimit = localPageSize(previewLimit, previewMatches.length);
    const previewPages = Math.max(1, Math.ceil(previewMatches.length / previewEffectiveLimit));
    const activePreviewPage = Math.min(previewPage, previewPages);
    const previewRows = useMemo(() => previewMatches
        .slice((activePreviewPage - 1) * previewEffectiveLimit, activePreviewPage * previewEffectiveLimit)
        .map(flattenForPreview), [previewMatches, activePreviewPage, previewEffectiveLimit]);
    const previewColumns = useMemo(() => Object.keys(flattenForPreview(rows[0] ?? {})), [rows]);
    const orderedPreviewKeys = def.backend === 'greige-u3' ? [
        'itemName', 'uom', 'closing.qtyKgs', 'closing.qty', 'receipt.qtyKgs', 'issue.qtyKgs',
        'lastReceived.date', 'lastReceived.qtyKgs', 'lastIssue.date', 'lastIssue.qtyKgs',
        'opening.qtyKgs', 'opening.qty',
    ].filter(key => previewColumns.includes(key)) : previewColumns;
    const columns = orderedPreviewKeys.map(key => ({ key, label: humanizeKey(key), align: /qty|kgs/i.test(key) ? 'right' : 'left' }));
    const errorRows = Array.isArray(result?.error_rows) ? result.error_rows : [];
    const canUpload = rows.length > 0 && !issues.length && !parsing && (def.backend !== 'yarn' || (!!period.fromDate && !!period.toDate && period.fromDate <= period.toDate));
    const showUploadFile = def.source !== 'paste' || def.allowFile;
    const showPaste = def.source === 'paste' || def.allowPaste;
    const savedRows = def.backend === 'dyeing' ? saved?.dyeingPrograms ?? [] : saved?.yarnStocks ?? [];
    const savedPreview = savedRows.map(flattenForPreview);
    const savedColumns = savedPreview[0] ? Object.keys(savedPreview[0]).filter((key) => !['_id', '__v'].includes(key)).slice(0, 12).map((key) => ({ key, label: humanizeKey(key) })) : [];
    return (<>
      <PageHeader title={def.title} description={def.description}/>
      <ol className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4" aria-label="Import progress">
        {['Select data', 'Preview & validate', 'Upload', 'Result'].map((step, index) => {
          const current = result ? 3 : upload.isPending ? 2 : rows.length || parsing || issues.length ? 1 : 0;
          return <li key={step} aria-current={current === index ? 'step' : undefined} className={`flex items-center gap-2 rounded-lg border px-3 py-3 ${current === index ? 'border-primary/30 bg-primary-soft font-semibold text-primary' : 'border-border bg-surface text-muted-foreground'}`}><span className="tabular">{index + 1}.</span>{step}</li>;
        })}
      </ol>
      {/* One upload action for every ERP importer, above the file picker and long preview.
          Keep the bar visible beneath the application header while the user scrolls. */}
      <div className="no-print sticky top-14 z-20 rounded-xl border border-border bg-surface/95 p-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-surface/90 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0" aria-live="polite">
            <p className="text-sm font-semibold text-foreground">
              {result ? 'Import completed' : parsing ? 'Reading ERP file…' : rows.length ? `${rows.length.toLocaleString('en-IN')} rows ready to upload` : 'Select an ERP file to begin'}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {upload.isPending
                ? 'Import in progress. Please keep this page open.'
                : issues.length
                  ? `${issues.length.toLocaleString('en-IN')} invalid row(s). Correct the source file before uploading.`
                  : def.backend === 'yarn' && rows.length && !canUpload
                    ? 'Check the stock-report From and To dates before uploading.'
                    : 'Preview and validate the ERP rows before importing.'}
            </p>
          </div>
          <div className="flex w-full shrink-0 flex-wrap items-center justify-end gap-2 sm:w-auto">
            {rows.length > 0 && !parsing && <Button variant="outline" size="sm" disabled={upload.isPending} onClick={() => reviewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}><Eye aria-hidden="true"/> Review all rows</Button>}
            <Button
              size="lg"
              className="w-full sm:w-auto"
              disabled={!canUpload || upload.isPending}
              loading={upload.isPending}
              onClick={() => upload.mutate()}
              aria-label={`Upload ${rows.length} ERP rows`}
            >
              <Upload aria-hidden="true" />
              {upload.isPending ? 'Uploading…' : `Upload ${rows.length.toLocaleString('en-IN')} rows`}
            </Button>
            {progress && <p className="text-xs tabular-nums text-muted-foreground" aria-live="polite">Batch {progress.done} of {progress.total}</p>}
          </div>
        </div>
        {progress && progress.total > 0 && (
          <div
            role="progressbar"
            aria-label="ERP import progress"
            aria-valuemin={0}
            aria-valuemax={progress.total}
            aria-valuenow={progress.done}
            className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-200"
              style={{ width: `${Math.min(100, Math.round((progress.done / progress.total) * 100))}%` }}
            />
          </div>
        )}
      </div>
      {def.knittingFormat === 'planning' && <div className="mb-4 rounded-lg border border-border bg-surface p-4 text-sm">
        <p className="font-semibold">Unit-3 uses only the consolidated PO sheet</p>
        <p className="mt-1 text-muted-foreground">Update the same workbook and reimport it to refresh the status. The weekly machine grids, job card linking and separate completion sheets are not required.</p>
      </div>}
      <Panel>
        <PanelHeader title="1. Select import data"/>
        <div className="flex flex-col gap-5 p-4">
          {showUploadFile && <label htmlFor="file" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); const dropped = event.dataTransfer.files?.[0]; if (dropped && !parsing && !upload.isPending) void parseFile(dropped); }} className="focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border px-4 py-8 text-center transition-colors hover:border-primary hover:bg-primary-soft/40 sm:px-6">
              <FileUp className="size-8 text-primary" aria-hidden="true"/>
              <span className="max-w-full break-all text-sm font-medium">{file ? file.name : 'Drop your ERP file here, or choose a file'}</span>
              <span className="text-xs text-muted-foreground">{def.accept?.replaceAll(',', ', ')}</span>
              {file && <span className="text-xs text-muted-foreground">{(file.size / 1024).toLocaleString('en-IN', { maximumFractionDigits: 1 })} KB{parsing ? ' · Reading and validating…' : ''}</span>}
              <input id="file" type="file" disabled={parsing || upload.isPending} accept={def.accept} className="sr-only" onChange={(e) => {
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
      {duplicateRows > 0 && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{duplicateRows} repeated identical job-card row(s) skipped during preview. Distinct orders sharing the same Job Card No. are retained.</p>}
      {uploadError && <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800"><strong>Upload failed{uploadError.status ? ` (${uploadError.status})` : ''}.</strong> <span>{uploadError.message}</span>{uploadError.code === 'JOBCARD_LEGACY_INDEX' && <p className="mt-2">Your MongoDB still has an old unique jobCardNo index. Ask the backend administrator to back up the database and run the migration from JOBCARD-IMPORT-FIX.md. Do not delete job cards to fix this.</p>}</div>}
      {!!issues.length && <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800" role="alert">
          <p className="font-semibold">{issues.length} invalid row(s) — upload is disabled until the file is corrected.</p>
          <ul className="mt-2 max-h-40 list-disc space-y-1 overflow-auto pl-5">{issues.slice(0, 30).map((issue, index) => <li key={index}>{issue}</li>)}</ul>
          {issues.length > 30 && <p className="mt-2">Showing the first 30 issues.</p>}
      </div>}
      {(rows.length > 0 || parsing) && <div ref={reviewRef} className="min-w-0 scroll-mt-24"><DataTable
          rows={previewRows}
          columns={columns}
          isLoading={parsing}
          title="2. Review data"
          description={`${rows.length.toLocaleString('en-IN')} valid ERP row(s) — ALL rows available; ${previewMatches.length.toLocaleString('en-IN')} match preview filter. ${columns.length} source columns.`}
          searchable={false}
          toolbar={<div className="min-w-0"><label className="sr-only" htmlFor="erp-preview-search">Search all preview rows</label><Input id="erp-preview-search" className="h-9 w-full sm:w-60" value={previewSearch} onChange={e => {setPreviewSearch(e.target.value);setPreviewPage(1);}} placeholder="Search all ERP rows…" aria-label="Search all ERP rows" /></div>}
          serverPagination={{
              pagination: { totalEntries: previewMatches.length, currentPage: activePreviewPage, limit: previewLimit },
              onPageChange: setPreviewPage,
              onPageSizeChange: size => { setPreviewLimit(size); setPreviewPage(1); },
              disabled: parsing || upload.isPending,
          }}
          emptyDescription="No ERP rows match your preview search."
          maxHeight="55vh"
      /></div>}
      {result && <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{summarize(result).map(([label, value]) => <Stat key={label} label={label} value={value}/>)}</div>
          {errorRows.length > 0 && <DataTable rows={errorRows} columns={Object.keys(errorRows[0]).map((key) => ({ key, label: key }))} title="Rejected rows" exportName="import-errors"/>}
      </>}
    </>);
}
