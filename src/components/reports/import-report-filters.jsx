import { useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/field';
import { importQueryParams } from '@/utils/import-read-models';

const INITIAL = { mode: 'latest', date: '', fromDate: '', toDate: '', search: '' };

/** Shared, responsive date/search controls for the existing import-backed views. */
export function ImportReportFilters({ kind, onApply, onRefresh, loading = false, pageSize = 50 }) {
    const [draft, setDraft] = useState(INITIAL);
    const [validation, setValidation] = useState('');
    const change = (name, value) => { setValidation(''); setDraft((d) => ({ ...d, [name]: value })); };
    const apply = (event) => {
        event.preventDefault();
        if (draft.mode === 'date' && !draft.date) {
            setValidation('Select a date or choose Latest report.'); return;
        }
        if (draft.mode === 'range' && (!draft.fromDate || !draft.toDate || draft.fromDate > draft.toDate)) {
            setValidation('Select a valid start and end date.'); return;
        }
        onApply(importQueryParams({ ...draft, page: 1, limit: pageSize }));
    };
    const reset = () => { setDraft(INITIAL); setValidation(''); onApply({ page: 1, limit: pageSize }); };
    return <form onSubmit={apply} className="rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
        <Field label="Report period" htmlFor={`${kind}-date-mode`} className="w-full sm:w-52">
          <Select id={`${kind}-date-mode`} value={draft.mode} onChange={(e) => change('mode', e.target.value)}>
            <option value="latest">Latest report</option>
            <option value="date">Specific date</option>
            <option value="range">Date range</option>
          </Select>
        </Field>
        {draft.mode === 'date' && <Field label={kind === 'dyeing' ? 'Schedule date' : 'Report to date'} htmlFor={`${kind}-date`} className="w-full sm:w-44">
          <Input id={`${kind}-date`} type="date" value={draft.date} onChange={(e) => change('date', e.target.value)}/>
        </Field>}
        {draft.mode === 'range' && <>
          <Field label="From date" htmlFor={`${kind}-from`} className="w-full sm:w-44">
            <Input id={`${kind}-from`} type="date" value={draft.fromDate} onChange={(e) => change('fromDate', e.target.value)}/>
          </Field>
          <Field label="To date" htmlFor={`${kind}-to`} className="w-full sm:w-44">
            <Input id={`${kind}-to`} type="date" min={draft.fromDate || undefined} value={draft.toDate} onChange={(e) => change('toDate', e.target.value)}/>
          </Field>
        </>}
        {(kind === 'dyeing' || kind === 'yarn') && <Field label="Search schedules" htmlFor={`${kind}-remote-search`} className="min-w-0 flex-1 sm:min-w-56">
          <Input id={`${kind}-remote-search`} value={draft.search} onChange={(e) => change('search', e.target.value)} placeholder={kind === 'yarn' ? 'Search yarn name, item code, colour…' : 'Order, customer, fabric, colour…'}/>
        </Field>}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={loading}><Search aria-hidden="true"/> Apply</Button>
          <Button type="button" variant="outline" onClick={reset} disabled={loading}>Reset</Button>
          <Button type="button" variant="outline" onClick={onRefresh} loading={loading}><RefreshCw aria-hidden="true"/> Refresh</Button>
        </div>
      </div>
      {validation && <p role="alert" className="mt-2 text-sm text-danger">{validation}</p>}
    </form>;
}
