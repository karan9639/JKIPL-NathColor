import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/services';
import { errorMessage } from '@/lib/api';
import { pickString } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { DataTable } from '@/components/ui/data-table';
import { Dialog } from '@/components/ui/dialog';
import { Badge, PageHeader, Stat } from '@/components/ui/panel';
const columns = [
    { key: 'FabricName', label: 'Stock name', render: (r) => <span className="font-medium">{pickString(r, 'FabricName', 'FABRICNAME')}</span> },
    { key: 'ERP_Name', label: 'ERP name', render: (r) => pickString(r, 'ERP_Name') || <Badge tone="warning">Unmapped</Badge> },
];
export default function FabricMappingPage() {
    const qc = useQueryClient();
    const mappings = useQuery({ queryKey: ['fabric-mappings'], queryFn: api.fabricMappings });
    const erpNames = useQuery({ queryKey: ['erp-names'], queryFn: api.erpGreigeNames, staleTime: 10 * 60_000 });
    const [selected, setSelected] = useState(null);
    const [erp, setErp] = useState('');
    const rows = mappings.data ?? [];
    const unmapped = rows.filter((r) => !pickString(r, 'ERP_Name')).length;
    const save = useMutation({
        mutationFn: () => api.saveFabricMapping(pickString(selected, 'FabricName', 'FABRICNAME'), erp.trim()),
        onSuccess: (res) => {
            toast.success(String(res?.message ?? 'Mapping saved'));
            qc.invalidateQueries({ queryKey: ['fabric-mappings'] });
            setSelected(null);
        },
        onError: (e) => toast.error(errorMessage(e)),
    });
    return (<>
      <PageHeader title="Fabric Name Mapping" description="Link greige stock fabric names to their ERP item names. Click a row to edit."/>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Stat label="Stock names" value={rows.length}/>
        <Stat label="Unmapped" value={unmapped} tone="accent"/>
        <Stat label="ERP items" value={erpNames.data?.length ?? '…'}/>
      </div>
      <DataTable rows={rows} columns={columns} isLoading={mappings.isLoading} error={mappings.error ? errorMessage(mappings.error) : null} onRetry={() => mappings.refetch()} exportName="fabric-mapping" onRowClick={(r) => {
            setSelected(r);
            setErp(pickString(r, 'ERP_Name'));
        }}/>
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)} title="Map fabric" description={pickString(selected, 'FabricName', 'FABRICNAME')} footer={<>
            <Button variant="outline" onClick={() => setSelected(null)}>
              Cancel
            </Button>
            <Button type="submit" form="mapping-form" disabled={!erp.trim()} loading={save.isPending}>
              Save mapping
            </Button>
          </>}>
        <form id="mapping-form" onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
        }}>
          <Field label="ERP item name" htmlFor="erp-name" hint="Start typing to pick from ERP greige names.">
            <Input id="erp-name" list="erp-names" autoFocus value={erp} onChange={(e) => setErp(e.target.value)}/>
          </Field>
          <datalist id="erp-names">
            {erpNames.data?.map((n) => (<option key={n} value={n}/>))}
          </datalist>
        </form>
      </Dialog>
    </>);
}
