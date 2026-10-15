import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle2, ScanLine } from 'lucide-react';
import { productionService } from '@/services/production.service';
import { errorMessage } from '@/services/http/client';
import { formatCell, formatDate, formatNumber, nowLocalDateTime, pickString } from '@/utils/format';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { Badge, ErrorState, PageHeader, Panel, PanelHeader } from '@/components/ui/panel';
const DETAIL_KEYS = [
    ['Customer', ['CUSTOMERNAME', 'PARTYNAME']],
    ['Fabric', ['ITEMNAME', 'FABRICNAME']],
    ['Color', ['COLOR', 'SHADE']],
    ['Lot', ['MANUALLOTNO', 'LOT_NO']],
    ['Job card date', ['JOBCARDDATE']],
    ['Jet', ['JETNO', 'JETLOADING_MACHINE']],
];
const PIPELINE = [
    ['Dyes', 'DYESCHEMISSUEDATE'],
    ['Jet', 'JETLOADINGDATE'],
    ['Heat set', 'HEATSETTINGDATE'],
    ['Finish', 'FINISHINGDATE'],
    ['Closed', 'JOBCARDCLOSEDDATE'],
];
function initialValues(stage) {
    return Object.fromEntries(stage.fields.map((f) => [f.name, f.type === 'datetime' ? nowLocalDateTime() : '']));
}
export default function StageEntryPage({ stage }) {
    const qc = useQueryClient();
    const inputRef = useRef(null);
    const [jobNo, setJobNo] = useState('');
    const [card, setCard] = useState(null);
    const [values, setValues] = useState(() => initialValues(stage));
    const [remarks, setRemarks] = useState('');
    const [recent, setRecent] = useState([]);
    const lookup = useMutation({
        mutationFn: (no) => productionService.searchJobCard(no),
        onSuccess: (row, no) => {
            if (!row) {
                toast.error(`Job card ${no} not found`);
                setCard(null);
                return;
            }
            setCard(row);
            setValues(initialValues(stage));
            setRemarks('');
        },
        onError: (e) => {
            setCard(null);
            toast.error(errorMessage(e));
        },
    });
    const submit = useMutation({
        mutationFn: () => {
            const jobcardno = pickString(card, 'JOBCARDNO') || jobNo.trim();
            const payload = { jobcardno, remarks };
            for (const f of stage.fields)
                payload[f.name] = f.type === 'datetime' ? values[f.name].replace('T', ' ') : values[f.name];
            return productionService.submitStage({ endpoint: stage.endpoint, payload });
        },
        onSuccess: (res) => {
            const no = pickString(card, 'JOBCARDNO') || jobNo.trim();
            toast.success(String(res?.message ?? `Job card ${no} updated`));
            setRecent((r) => [{ jobcardno: no, at: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) }, ...r].slice(0, 10));
            qc.invalidateQueries({ queryKey: ['production-stages'] });
            qc.invalidateQueries({ queryKey: ['tracker'] });
            setCard(null);
            setJobNo('');
            inputRef.current?.focus();
        },
        onError: (e) => toast.error(errorMessage(e)),
    });
    const alreadyDone = card ? pickString(card, stage.doneKey) : '';
    const missingRequired = stage.fields.some((f) => f.required && !values[f.name]);
    return (<>
      <PageHeader title={stage.title} description={stage.description}/>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="flex min-w-0 flex-col gap-5">
          <Panel>
            <form className="flex flex-col gap-2 p-4 sm:flex-row sm:items-end" onSubmit={(e) => {
            e.preventDefault();
            if (jobNo.trim())
                lookup.mutate(jobNo.trim());
        }}>
              <Field label="Job card number" htmlFor="jobcard" hint="Type or scan the job card barcode, then press Enter." className="flex-1">
                <div className="relative">
                  <ScanLine className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true"/>
                  <Input ref={inputRef} id="jobcard" autoFocus inputMode="numeric" autoComplete="off" value={jobNo} onChange={(e) => setJobNo(e.target.value)} className="tabular h-12 pl-9 text-lg"/>
                </div>
              </Field>
              <Button type="submit" size="lg" disabled={!jobNo.trim()} loading={lookup.isPending} className="sm:mb-5">
                Find job card
              </Button>
            </form>
          </Panel>

          {lookup.isError && !card && <ErrorState message={errorMessage(lookup.error)}/>}

          {card && (<Panel>
              <PanelHeader title={`Job card ${pickString(card, 'JOBCARDNO')}`} description={`${formatNumber(card.KGS)} kg`} actions={alreadyDone ? <Badge tone="warning">Already recorded {formatDate(alreadyDone, true)}</Badge> : <Badge tone="primary">Ready</Badge>}/>
              <div className="flex flex-col gap-5 p-4">
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
                  {DETAIL_KEYS.map(([label, keys]) => (<div key={label} className="min-w-0">
                      <dt className="text-xs text-muted-foreground">{label}</dt>
                      <dd className="truncate font-medium">{formatCell(pickString(card, ...keys))}</dd>
                    </div>))}
                </dl>

                <ol className="flex flex-wrap gap-2" aria-label="Stage progress">
                  {PIPELINE.map(([label, key]) => {
                const done = !!pickString(card, key);
                return (<li key={key} className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${done ? 'border-success/30 bg-success-soft text-success' : 'border-border text-muted-foreground'}`}>
                        {done && <CheckCircle2 className="size-3.5" aria-hidden="true"/>}
                        {label}
                        <span className="sr-only">{done ? 'completed' : 'pending'}</span>
                      </li>);
            })}
                </ol>

                <form className="flex flex-col gap-4 border-t border-border pt-4" onSubmit={(e) => {
                e.preventDefault();
                submit.mutate();
            }}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {stage.fields.map((f) => (<Field key={f.name} label={f.label} htmlFor={f.name}>
                        {f.type === 'select' ? (<Select id={f.name} required={f.required} value={values[f.name]} onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}>
                            <option value="">Select…</option>
                            {f.options?.map((o) => (<option key={o} value={o}>
                                {o}
                              </option>))}
                          </Select>) : (<Input id={f.name} type={f.type === 'datetime' ? 'datetime-local' : 'text'} required={f.required} value={values[f.name]} onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}/>)}
                      </Field>))}
                  </div>
                  <Field label="Remarks (optional)" htmlFor="remarks">
                    <Textarea id="remarks" rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)}/>
                  </Field>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setCard(null)}>
                      Cancel
                    </Button>
                    <Button type="submit" size="lg" disabled={missingRequired} loading={submit.isPending}>
                      {alreadyDone ? 'Overwrite entry' : 'Save entry'}
                    </Button>
                  </div>
                </form>
              </div>
            </Panel>)}
        </div>

        <Panel className="h-fit">
          <PanelHeader title="Saved this session"/>
          {recent.length ? (<ul className="divide-y divide-border">
              {recent.map((r, i) => (<li key={i} className="flex items-center justify-between px-4 py-2 text-sm">
                  <span className="tabular font-medium">{r.jobcardno}</span>
                  <span className="text-xs text-muted-foreground">{r.at}</span>
                </li>))}
            </ul>) : (<p className="px-4 py-6 text-center text-sm text-muted-foreground">No entries yet.</p>)}
        </Panel>
      </div>
    </>);
}
