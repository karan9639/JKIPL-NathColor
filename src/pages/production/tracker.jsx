import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CalendarDays, ClipboardPenLine, FileUp, Link2, RotateCcw } from 'lucide-react';
import { productionService } from '@/services/production.service';
import { errorMessage } from '@/services/http/client';
import { config } from '@/config/env';
import { linkedCards, knittingStatus, plannedKgs, poDateValue, poLineId, poNumber, producedKgs } from '@/utils/knitting';
import { formatDate, formatNumber, parseLooseDate, pickString, todayISO } from '@/utils/format';
import { toIsoDate } from '@/utils/spreadsheet';
import { DataTable } from '@/components/ui/data-table';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { PageHeader, Panel } from '@/components/ui/panel';
function opened(row) {
    return parseLooseDate(`${pickString(row, 'JOBCARDDATE')} ${pickString(row, 'JOBCARDTIME')}`.trim());
}
function elapsed(row, key) {
    const start = opened(row);
    const end = parseLooseDate(row[key]);
    if (!start || !end)
        return null;
    const hours = (end.getTime() - start.getTime()) / 36e5;
    return hours < 0 ? null : hours;
}
function stamp(key, label) {
    return {
        key, label,
        sortValue: (row) => parseLooseDate(row[key])?.getTime() ?? 0,
        render: (row) => {
            if (!pickString(row, key))
                return <span className="text-muted-foreground">—</span>;
            const h = elapsed(row, key);
            return <span className="flex flex-col leading-tight">
        <span>{formatDate(row[key], true)}</span>
        {h !== null && <span className="tabular text-xs text-muted-foreground">+{h < 48 ? `${h.toFixed(1)}h` : `${(h / 24).toFixed(1)}d`}</span>}
      </span>;
        },
    };
}
const jobColumns = [
    { key: 'PO_NUMBER', label: 'PO number', render: (row) => pickString(row, 'PO_NUMBER') || <span className="text-muted-foreground">Not linked</span> },
    { key: 'PO_DATE', label: 'PO date', render: (row) => pickString(row, 'PO_DATE') ? formatDate(row.PO_DATE) : '—' },
    { key: 'JOBCARDNO', label: 'Job card', render: (row) => <span className="tabular font-medium text-primary">{pickString(row, 'JOBCARDNO')}</span> },
    { key: 'MANUALLOTNO', label: 'Lot' },
    { key: 'JETNO', label: 'Jet', align: 'right' },
    { key: 'JOBCARDDATE', label: 'Opened', render: (row) => formatDate(`${pickString(row, 'JOBCARDDATE')} ${pickString(row, 'JOBCARDTIME')}`, true) },
    {
        key: 'KNITTING_COMPLETED_AT', label: 'Knitting',
        sortValue: (row) => parseLooseDate(row.KNITTING_COMPLETED_AT)?.getTime() ?? 0,
        render: (row) => {
            const completed = pickString(row, 'KNITTING_COMPLETED_AT');
            const status = pickString(row, 'KNITTING_STATUS');
            if (!completed)
                return status ? <span className="text-xs text-muted-foreground">{status.replaceAll('_', ' ')}</span> : '—';
            // Knitting predates the dyeing job card; never subtract its timestamp from the job-card opening.
            return <span className="flex flex-col leading-tight"><span>{formatDate(completed, true)}</span><span className="text-xs text-muted-foreground">Completed</span></span>;
        },
    },
    stamp('RECIPEDATE', 'Recipe'),
    stamp('DYESCHEMISSUEDATE', 'Dyes issue'),
    stamp('JETLOADINGDATE', 'Jet loading'),
    stamp('HEATSETTINGDATE', 'Heat set'),
    stamp('FINISHINGDATE', 'Finishing'),
    stamp('JOBCARDCLOSEDDATE', 'Closed'),
    stamp('INVOICE_DATE', 'Invoiced'),
];
const poColumns = [
    { key: 'PO_NUMBER', label: 'PO number', render: (r) => <span className="font-semibold text-primary">{poNumber(r)}</span> },
    { key: 'PO_DATE', label: 'PO date', render: (r) => formatDate(poDateValue(r, 'PO_DATE')) },
    { key: 'FABRIC_NAME', label: 'Fabric' },
    { key: 'PLANNED_KGS', label: 'Planned KG', align: 'right', render: (r) => pickString(r, 'PLANNED_KGS', 'planned_kgs') ? formatNumber(plannedKgs(r)) : '—' },
    { key: 'PRODUCED_KGS', label: 'Produced KG', align: 'right', render: (r) => formatNumber(producedKgs(r)) },
    { key: 'PLANNED_MACHINE', label: 'Machine' },
    { key: 'EXPECTED_DELIVERY_DATE', label: 'EDD', render: (r) => formatDate(poDateValue(r, 'EXPECTED_DELIVERY_DATE')) },
    { key: 'KNITTING_STATUS', label: 'Knitting status', render: (r) => <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium">{knittingStatus(r).replaceAll('_', ' ')}</span> },
    { key: 'KNITTING_COMPLETED_AT', label: 'Knitting completed', render: (r) => pickString(r, 'KNITTING_COMPLETED_AT') ? formatDate(r.KNITTING_COMPLETED_AT, true) : '—' },
    { key: 'JOB_CARDS', label: 'Linked cards', render: (r) => linkedCards(r).join(', ') || <span className="text-muted-foreground">Not linked</span> },
];
function knitMatch(row, cards) {
    const no = pickString(row, 'JOBCARDNO');
    const order = pickString(row, 'ORDERID');
    const lineId = pickString(row, 'PO_LINE_ID');
    // A card number alone can repeat across different ERP orders. Only verified
    // line IDs or an explicit OrderID + JobCardNo link can enrich a row.
    return cards.filter((line) => {
        if (lineId && lineId === poLineId(line))
            return true;
        const links = line.LINKED_JOB_CARDS ?? line.linked_job_cards;
        return !!order && !!no && Array.isArray(links) && links.some((link) => {
            if (!link || typeof link !== 'object')
                return false;
            const candidate = link;
            return pickString(candidate, 'JOBCARDNO', 'jobcardno') === no && pickString(candidate, 'ORDERID', 'order_id') === order;
        });
    });
}
function mergeTrackerRows(rows, poLines) {
    return rows.map((row) => {
        const matches = knitMatch(row, poLines);
        const uniquePOs = [...new Set(matches.map(poNumber).filter(Boolean))];
        const single = matches.length === 1 ? matches[0] : undefined;
        return {
            ...row,
            PO_NUMBER: pickString(row, 'PO_NUMBER') || uniquePOs.join(', '),
            PO_DATE: pickString(row, 'PO_DATE') || (single && poDateValue(single, 'PO_DATE')) || '',
            KNITTING_STATUS: pickString(row, 'KNITTING_STATUS') || (single && knittingStatus(single)) || '',
            KNITTING_COMPLETED_AT: pickString(row, 'KNITTING_COMPLETED_AT') || (single && pickString(single, 'KNITTING_COMPLETED_AT')) || '',
        };
    });
}
function EditKnittingDialog({ line, onClose, onShowCards }) {
    const queryClient = useQueryClient();
    const [mode, setMode] = useState('production');
    const [eventId] = useState(() => crypto.randomUUID());
    const [date, setDate] = useState(todayISO());
    const [machine, setMachine] = useState('');
    const [qty, setQty] = useState('');
    const [status, setStatus] = useState('PARTIAL');
    const [completed, setCompleted] = useState('');
    const [greigeLot, setGreigeLot] = useState('');
    const [remarks, setRemarks] = useState('');
    const [jobCard, setJobCard] = useState('');
    const [orderId, setOrderId] = useState('');
    const [lot, setLot] = useState('');
    const save = useMutation({
        mutationFn: productionService.createKnittingEntry,
        onSuccess: async () => {
            await Promise.all([queryClient.invalidateQueries({ queryKey: ['knitting-po-lines'] }), queryClient.invalidateQueries({ queryKey: ['tracker'] })]);
            toast.success('Knitting production updated');
            onClose();
        },
        onError: (e) => toast.error(errorMessage(e)),
    });
    const link = useMutation({
        mutationFn: productionService.linkKnittingJobCard,
        onSuccess: async () => {
            await Promise.all([queryClient.invalidateQueries({ queryKey: ['knitting-po-lines'] }), queryClient.invalidateQueries({ queryKey: ['tracker'] })]);
            toast.success('Job card linked to PO line');
            onClose();
        },
        onError: (e) => toast.error(errorMessage(e)),
    });
    if (!line)
        return null;
    const id = poLineId(line);
    const saveEntry = () => {
        const amount = Number(qty);
        if (!id || !date || !machine.trim() || qty.trim() === '' || !Number.isFinite(amount) || amount < 0 || (['PARTIAL', 'COMPLETED'].includes(status) && amount <= 0)) {
            toast.error('Enter a PO line ID, date, machine and valid incremental production quantity.');
            return;
        }
        if (status === 'COMPLETED' && !completed) {
            toast.error('Enter the actual completion date and time.');
            return;
        }
        save.mutate({
            po_line_id: id,
            production_event_id: eventId, // stable across network retries; server enforces idempotency
            production_date: date,
            machine_no: machine.trim(), produced_kgs: amount, status,
            completed_at: status === 'COMPLETED' ? completed : null,
            greige_lot_no: greigeLot.trim(), remarks: remarks.trim(),
        });
    };
    const saveLink = () => {
        if (!id || !jobCard.trim() || !orderId.trim()) {
            toast.error('PO line ID, OrderID and Job Card number are required for a verified link.');
            return;
        }
        const payload = { po_line_id: id, order_id: orderId.trim(), jobcardno: jobCard.trim(), manual_lot_no: lot.trim() };
        link.mutate(payload);
    };
    return <Dialog open={!!line} onOpenChange={(open) => { if (!open && !save.isPending && !link.isPending)
        onClose(); }} title={`${poNumber(line)} · ${id}`} description={pickString(line, 'FABRIC_NAME')} className="max-w-2xl" footer={<>
      <Button variant="outline" onClick={onShowCards}>Show linked job cards</Button><Button variant="outline" onClick={onClose}>Cancel</Button>
      {mode === 'production' ? <Button loading={save.isPending} onClick={saveEntry}>Save production entry</Button> : <Button loading={link.isPending} onClick={saveLink}>Link job card</Button>}
    </>}>
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-border pb-3">
        <Button variant={mode === 'production' ? 'secondary' : 'ghost'} size="sm" onClick={() => setMode('production')}><ClipboardPenLine /> Production update</Button>
        <Button variant={mode === 'link' ? 'secondary' : 'ghost'} size="sm" onClick={() => setMode('link')}><Link2 /> Job card linking</Button>
      </div>
      <p className="text-xs text-muted-foreground">Planned: {formatNumber(plannedKgs(line))} KG · Previously produced: {formatNumber(producedKgs(line))} KG · Existing status: {knittingStatus(line).replaceAll('_', ' ')}</p>
      {mode === 'production' ? <>
        <p className="text-xs text-muted-foreground">Enter only the additional KG manufactured in this event. Do not re-enter previous totals.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Production date" htmlFor="knit-date"><Input id="knit-date" type="date" value={date} onChange={(e) => setDate(e.target.value)}/></Field>
          <Field label="Actual machine" htmlFor="knit-machine"><Input id="knit-machine" value={machine} onChange={(e) => setMachine(e.target.value)} placeholder={pickString(line, 'PLANNED_MACHINE') || 'Machine number'}/></Field>
          <Field label="Additional produced KG" htmlFor="knit-kg"><Input id="knit-kg" type="number" min="0" step="0.001" value={qty} onChange={(e) => setQty(e.target.value)}/></Field>
          <Field label="Production status" htmlFor="knit-status"><Select id="knit-status" value={status} onChange={(e) => setStatus(e.target.value)}><option value="IN_PROGRESS">In progress</option><option value="PARTIAL">Partial</option><option value="COMPLETED">Completed</option><option value="ON_HOLD">On hold</option></Select></Field>
          {status === 'COMPLETED' && <Field label="Actual completion date and time" htmlFor="knit-finished"><Input id="knit-finished" type="datetime-local" value={completed} onChange={(e) => setCompleted(e.target.value)}/></Field>}
          <Field label="Greige lot (optional)" htmlFor="knit-greige"><Input id="knit-greige" value={greigeLot} onChange={(e) => setGreigeLot(e.target.value)}/></Field>
        </div>
        <Field label="Remarks (optional)" htmlFor="knit-remarks"><Textarea id="knit-remarks" rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)}/></Field>
      </> : <>
        <p className="text-xs text-muted-foreground">Enter the verified ERP OrderID and Job Card number. Fabric names alone are never used to link records.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="ERP OrderID" htmlFor="knit-order"><Input id="knit-order" value={orderId} onChange={(e) => setOrderId(e.target.value)}/></Field>
          <Field label="Job Card number" htmlFor="knit-card"><Input id="knit-card" value={jobCard} onChange={(e) => setJobCard(e.target.value)}/></Field>
          <Field label="Manual/greige lot (optional)" htmlFor="knit-lot"><Input id="knit-lot" value={lot} onChange={(e) => setLot(e.target.value)}/></Field>
        </div>
        <div className="text-xs text-muted-foreground">Current linked cards: {linkedCards(line).join(', ') || 'None'}</div>
      </>}
    </div>
  </Dialog>;
}
export default function TrackerPage() {
    const tracker = useQuery({ queryKey: ['tracker'], queryFn: productionService.tracker });
    const pos = useQuery({ queryKey: ['knitting-po-lines'], queryFn: productionService.knittingPOLines, retry: false });
    const [basis, setBasis] = useState('PO_DATE');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [searchPo, setSearchPo] = useState('');
    const [selectedPO, setSelectedPO] = useState('');
    const [line, setLine] = useState(null);
    const allLines = pos.data ?? [];
    const filteredPO = useMemo(() => allLines.filter((r) => {
        const date = toIsoDate(poDateValue(r, basis));
        if ((from || to) && (!date || (from && date < from) || (to && date > to)))
            return false;
        return !searchPo.trim() || poNumber(r).toUpperCase().includes(searchPo.trim().toUpperCase()) || pickString(r, 'FABRIC_NAME').toUpperCase().includes(searchPo.trim().toUpperCase());
    }), [allLines, from, to, basis, searchPo]);
    const jobRows = useMemo(() => {
        const enriched = mergeTrackerRows(tracker.data ?? [], allLines);
        return !selectedPO ? enriched : enriched.filter((r) => pickString(r, 'PO_NUMBER').split(',').map((p) => p.trim()).includes(selectedPO));
    }, [tracker.data, allLines, selectedPO]);
    const totalPlanned = filteredPO.reduce((sum, r) => sum + plannedKgs(r), 0);
    const totalProduced = filteredPO.reduce((sum, r) => sum + producedKgs(r), 0);
    return <>
    <PageHeader title="Order Tracker" description="PO-wise knitting and job-card timestamps, from planning through finishing."/>
    <Panel className="mb-4 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Date-wise Knitting PO tracker</h2>
          <p className="mt-1 text-xs text-muted-foreground">Select a PO line to update Knitting, or connect it to an ERP job card. Date filters apply to this PO table.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/imports/knitting-po-planning" className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-sm font-medium hover:bg-muted"><FileUp className="size-4"/> Import PO planner</Link>
          <Link to="/imports/knitting-completion" className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-sm font-medium hover:bg-muted"><FileUp className="size-4"/> Import completions</Link>
          <Button variant="ghost" size="sm" onClick={() => { void pos.refetch(); void tracker.refetch(); }}><RotateCcw /> Refresh</Button>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Track by date" htmlFor="po-date-basis"><Select id="po-date-basis" value={basis} onChange={(e) => setBasis(e.target.value)}><option value="PO_DATE">PO date</option><option value="KNITTING_COMPLETED_AT">Knitting completion date</option><option value="EXPECTED_DELIVERY_DATE">Expected delivery (EDD)</option></Select></Field>
        <Field label="From" htmlFor="po-from"><Input id="po-from" type="date" max={to || undefined} value={from} onChange={(e) => setFrom(e.target.value)}/></Field>
        <Field label="To" htmlFor="po-to"><Input id="po-to" type="date" min={from || undefined} value={to} onChange={(e) => setTo(e.target.value)}/></Field>
        <Field label="PO number / fabric" htmlFor="po-quick-search"><Input id="po-quick-search" placeholder="Search a PO or fabric" value={searchPo} onChange={(e) => setSearchPo(e.target.value)}/></Field>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
        <span><CalendarDays className="mr-1 inline size-3.5"/>{filteredPO.length.toLocaleString('en-IN')} PO lines</span>
        <span>Planned: <b className="text-foreground">{formatNumber(totalPlanned)} KG</b></span>
        <span>Produced: <b className="text-foreground">{formatNumber(totalProduced)} KG</b></span>
        {(from || to || searchPo) && <Button size="sm" variant="ghost" onClick={() => { setFrom(''); setTo(''); setSearchPo(''); }}>Clear filters</Button>}
      </div>
    </Panel>

    
    <div className="mb-5">
      <DataTable rows={filteredPO} columns={poColumns} isLoading={pos.isLoading} searchable={false} title="Knitting PO lines" description="Click a line to record production or link its job card" onRowClick={(r) => setLine(r)} exportName="knitting-po-tracker" emptyDescription="Try clearing the date filters or import a PO planner."/>
    </div>

    <div id="job-card-section" className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div><h2 className="text-base font-semibold">Job card stages</h2><p className="text-xs text-muted-foreground">Original production stages retained; Knitting appears before Recipe. Unlinked job cards remain visible.</p></div>
      {selectedPO && <Button size="sm" variant="outline" onClick={() => setSelectedPO('')}>Clear PO filter: {selectedPO}</Button>}
      {!selectedPO && <span className="text-xs text-muted-foreground">To filter job cards by PO, select a PO line above, then use “Show linked job cards”.</span>}
    </div>
    <DataTable rows={jobRows} columns={jobColumns} isLoading={tracker.isLoading} error={tracker.error ? errorMessage(tracker.error) : null} onRetry={() => tracker.refetch()} exportName="job-card-tracker" emptyDescription={selectedPO ? 'No linked job cards for this PO yet.' : undefined}/>
    {line && <EditKnittingDialog key={poLineId(line)} line={line} onClose={() => setLine(null)} onShowCards={() => { setSelectedPO(poNumber(line)); setLine(null); document.getElementById('job-card-section')?.scrollIntoView({ behavior: 'smooth' }); }}/>}
  </>;
}
