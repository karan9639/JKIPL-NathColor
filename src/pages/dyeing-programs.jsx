import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';
import { api } from '@/lib/services';
import { errorMessage } from '@/lib/api';
import { formatNumber, pickString, toNumber } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { DataTable } from '@/components/ui/data-table';
import { Dialog } from '@/components/ui/dialog';
import { Badge, PageHeader, Stat } from '@/components/ui/panel';
const issueSchema = z.object({
    LOT_NO: z.string().trim().min(1, 'Lot number is required'),
    KGS_Issued: z.coerce.number().positive('Enter a quantity above 0'),
    LOT_Remarks: z.string().trim().max(200),
});
function balance(r) {
    return toNumber(r.REQ_KGS) - toNumber(r.GREIGE_ISSUED_KGS);
}
const columns = [
    { key: 'GREQ_DATE', label: 'Req date' },
    { key: 'ORDERNUMBER', label: 'Order', render: (r) => <span className="font-medium text-primary">{pickString(r, 'ORDERNUMBER', 'ORDERID')}</span> },
    { key: 'CUSTOMERNAME', label: 'Customer', className: 'max-w-52 truncate' },
    { key: 'UPPERFABRICNAME', label: 'Fabric', className: 'max-w-60 truncate' },
    { key: 'UPPERCOLOR', label: 'Color' },
    { key: 'GPRIORITY', label: 'Priority', align: 'right' },
    { key: 'REQ_KGS', label: 'Req kg', align: 'right', render: (r) => formatNumber(r.REQ_KGS) },
    { key: 'GREIGE_ISSUED_KGS', label: 'Issued kg', align: 'right', render: (r) => formatNumber(r.GREIGE_ISSUED_KGS) },
    {
        key: 'BAL',
        label: 'Pending kg',
        align: 'right',
        sortValue: balance,
        render: (r) => {
            const b = balance(r);
            return <span className={b > 0 ? 'font-semibold text-accent' : 'text-success'}>{formatNumber(b)}</span>;
        },
    },
    { key: 'GREMARKS', label: 'Remarks', render: (r) => (pickString(r, 'GREMARKS') ? <Badge tone="warning">{pickString(r, 'GREMARKS')}</Badge> : '—') },
];
export default function DyeingProgramsPage() {
    const qc = useQueryClient();
    const [filter, setFilter] = useState('pending');
    const [selected, setSelected] = useState(null);
    const query = useQuery({ queryKey: ['dyeing-programs'], queryFn: api.dyeingPrograms });
    const all = query.data ?? [];
    const rows = useMemo(() => (filter === 'pending' ? all.filter((r) => balance(r) > 0) : all), [all, filter]);
    const totalPending = all.reduce((s, r) => s + Math.max(0, balance(r)), 0);
    const form = useForm({ resolver: zodResolver(issueSchema), defaultValues: { LOT_NO: '', KGS_Issued: '', LOT_Remarks: '' } });
    const mutation = useMutation({
        mutationFn: (values) => api.updateDyeingProgram({ OrderID: selected?.ORDERID ?? selected?.OrderID, REQ_DATE: selected?.GREQ_DATE ?? selected?.REQ_DATE, ...values }),
        onSuccess: (res) => {
            toast.success(String(res?.message ?? 'Lot issue recorded'));
            qc.invalidateQueries({ queryKey: ['dyeing-programs'] });
            setSelected(null);
        },
        onError: (e) => toast.error(errorMessage(e)),
    });
    const open = (row) => {
        setSelected(row);
        form.reset({ LOT_NO: '', KGS_Issued: String(Math.max(0, balance(row)) || ''), LOT_Remarks: '' });
    };
    return (<>
      <PageHeader title="Dyeing Programs" description="Greige requisitions awaiting lot issue. Click a row to record a lot." actions={<Button variant="outline" onClick={() => query.refetch()} loading={query.isRefetching}>
            <RefreshCw aria-hidden="true"/>
            Refresh
          </Button>}/>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Requisitions" value={all.length}/>
        <Stat label="Pending" value={all.filter((r) => balance(r) > 0).length} tone="accent"/>
        <Stat label="Pending kg" value={formatNumber(totalPending, 0)} tone="primary"/>
        <Stat label="Requested kg" value={formatNumber(all.reduce((s, r) => s + toNumber(r.REQ_KGS), 0), 0)}/>
      </div>
      <DataTable rows={rows} columns={columns} isLoading={query.isLoading} error={query.error ? errorMessage(query.error) : null} onRetry={() => query.refetch()} exportName="dyeing-programs" onRowClick={open} toolbar={<>
            <label htmlFor="dp-filter" className="sr-only">
              Show
            </label>
            <Select id="dp-filter" value={filter} onChange={(e) => setFilter(e.target.value)} className="h-9 w-36">
              <option value="pending">Pending only</option>
              <option value="all">All</option>
            </Select>
          </>}/>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)} title="Issue greige lot" description={selected ? `${pickString(selected, 'ORDERNUMBER')} · ${pickString(selected, 'UPPERFABRICNAME')} · ${pickString(selected, 'UPPERCOLOR')}` : undefined} footer={<>
            <Button variant="outline" onClick={() => setSelected(null)}>
              Cancel
            </Button>
            <Button type="submit" form="issue-form" loading={mutation.isPending}>
              Save issue
            </Button>
          </>}>
        <form id="issue-form" className="flex flex-col gap-4" onSubmit={form.handleSubmit((v) => mutation.mutate(v))} noValidate>
          {selected && (<dl className="grid grid-cols-3 gap-3 rounded-md bg-muted px-3 py-2 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Requested</dt>
                <dd className="tabular font-medium">{formatNumber(selected.REQ_KGS)} kg</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Issued</dt>
                <dd className="tabular font-medium">{formatNumber(selected.GREIGE_ISSUED_KGS)} kg</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Pending</dt>
                <dd className="tabular font-semibold text-accent">{formatNumber(balance(selected))} kg</dd>
              </div>
            </dl>)}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Lot number" htmlFor="LOT_NO" error={form.formState.errors.LOT_NO?.message}>
              <Input id="LOT_NO" autoFocus aria-invalid={!!form.formState.errors.LOT_NO} {...form.register('LOT_NO')}/>
            </Field>
            <Field label="Kg issued" htmlFor="KGS_Issued" error={form.formState.errors.KGS_Issued?.message}>
              <Input id="KGS_Issued" type="number" inputMode="decimal" step="0.01" aria-invalid={!!form.formState.errors.KGS_Issued} {...form.register('KGS_Issued')}/>
            </Field>
          </div>
          <Field label="Remarks" htmlFor="LOT_Remarks" error={form.formState.errors.LOT_Remarks?.message}>
            <Textarea id="LOT_Remarks" rows={2} {...form.register('LOT_Remarks')}/>
          </Field>
        </form>
      </Dialog>
    </>);
}
