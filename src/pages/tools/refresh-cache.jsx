import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';
import { toolsService } from '@/services/tools.service';
import { errorMessage } from '@/services/http/client';
import { Button } from '@/components/ui/button';
import { PageHeader, Panel } from '@/components/ui/panel';
export default function RefreshCachePage() {
    const qc = useQueryClient();
    const flush = useMutation({
        mutationFn: toolsService.flushCache,
        onSuccess: (res) => {
            qc.invalidateQueries();
            toast.success(String(res?.message ?? 'Cache cleared'));
        },
        onError: (e) => toast.error(errorMessage(e)),
    });
    return (<>
      <PageHeader title="Refresh Data" description="Refresh locally cached API data after a completed ERP import."/>
      <Panel className="max-w-xl">
        <div className="flex flex-col items-start gap-4 p-6">
          <p className="text-sm text-pretty text-muted-foreground">
            Use this after an import if a report still shows old figures. This clears your browser query cache. It does not change any ERP or MongoDB records.
          </p>
          <Button size="lg" loading={flush.isPending} onClick={() => flush.mutate()}>
            <RefreshCw aria-hidden="true"/>
            Refresh now
          </Button>
          {flush.isSuccess && <p className="text-sm text-success" role="status">Data refreshed at {new Date().toLocaleTimeString('en-GB')}.</p>}
        </div>
      </Panel>
    </>);
}
