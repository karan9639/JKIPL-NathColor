import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import { ArrowRight } from 'lucide-react';
import { api } from '@/lib/services';
import { useAuth } from '@/lib/auth';
import { NAV_GROUPS } from '@/lib/navigation';
import { formatDate, parseLooseDate, toNumber } from '@/lib/utils';
import { Badge, PageHeader, Panel, PanelHeader, Stat, LoadingState } from '@/components/ui/panel';
const SERIES = [
    { key: 'Jet', color: 'var(--color-primary)' },
    { key: 'HeatS', color: 'var(--color-accent)' },
    { key: 'Finish', color: '#64748b' },
];
function freshness(value) {
    const date = parseLooseDate(value);
    if (!date)
        return { label: 'Unknown', tone: 'neutral' };
    const hours = (Date.now() - date.getTime()) / 36e5;
    if (hours < 24)
        return { label: 'Fresh', tone: 'success' };
    if (hours < 72)
        return { label: `${Math.floor(hours / 24)}d old`, tone: 'warning' };
    return { label: `${Math.floor(hours / 24)}d old`, tone: 'danger' };
}
export default function DashboardPage() {
    const { username, user, can } = useAuth();
    const records = useQuery({ queryKey: ['records'], queryFn: api.records });
    const lud = useQuery({ queryKey: ['lud'], queryFn: api.lud });
    const rows = [...(records.data ?? [])].sort((a, b) => String(a.Date).localeCompare(String(b.Date)));
    const latest = rows.at(-1);
    const chartData = rows.slice(-10).map((r) => ({ ...r, label: formatDate(r.Date).slice(0, 6) }));
    const quickLinks = NAV_GROUPS.filter((g) => ['Orders', 'Production', 'Inventory'].includes(g.label)).flatMap((g) => g.items).filter(can).slice(0, 8);
    const shortName = (username ?? '').split('@')[0];
    const displayName = user?.fullname || (shortName.charAt(0).toUpperCase() + shortName.slice(1));
    return (<>


      <PageHeader title={`Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, ${displayName}`} description={latest ? `Production activity for ${formatDate(latest.Date)}` : 'Production activity overview'}/>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        {[
            ['Greige req.', 'GREQ'],
            ['Job cards', 'JobCards'],
            ['Recipes', 'Recipe'],
            ['Dyes issued', 'Dyes'],
            ['Jet loaded', 'Jet'],
            ['Heat set', 'HeatS'],
            ['Finished', 'Finish'],
        ].map(([label, key], i) => (<Stat key={key} label={label} value={records.isLoading ? '…' : toNumber(latest?.[key]).toLocaleString('en-IN')} tone={i === 4 ? 'primary' : 'default'}/>))}
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Panel className="xl:col-span-2">
          <PanelHeader title="Stage throughput" description="Job cards processed per day, last 10 days"/>
          <div className="h-72 p-4">
            {records.isLoading ? (<LoadingState />) : (<ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)"/>
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12}/>
                  <YAxis tickLine={false} axisLine={false} fontSize={12}/>
                  <Tooltip cursor={{ fill: 'var(--color-muted)' }} contentStyle={{ borderRadius: 8, border: '1px solid var(--color-border)', fontSize: 12 }}/>
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }}/>
                  {SERIES.map((s) => (<Bar key={s.key} dataKey={s.key} fill={s.color} radius={[3, 3, 0, 0]} maxBarSize={18}/>))}
                </BarChart>
              </ResponsiveContainer>)}
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Data freshness" description="Last update of each source" actions={<Link to="/reports/lud" className="text-xs font-medium text-primary hover:underline">View all</Link>}/>
          {lud.isLoading ? (<LoadingState />) : (<ul className="divide-y divide-border">
              {(lud.data ?? []).map((r) => {
                const f = freshness(r.LUD);
                return (<li key={String(r.Report)} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{String(r.Report)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(r.LUD, true)} · {String(r.USERNAME ?? '')}
                      </p>
                    </div>
                    <Badge tone={f.tone}>{f.label}</Badge>
                  </li>);
            })}
            </ul>)}
        </Panel>
      </div>

      <Panel>
        <PanelHeader title="Quick access"/>
        <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
          {quickLinks.map((item) => (<Link key={item.path} to={item.path} className="group flex items-center gap-3 bg-surface px-4 py-3 hover:bg-muted">
              <span className="flex size-9 items-center justify-center rounded-md bg-primary-soft text-primary">
                <item.icon className="size-4" aria-hidden="true"/>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{item.title}</span>
                <span className="block truncate text-xs text-muted-foreground">{item.description}</span>
              </span>
              <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true"/>
            </Link>))}
        </div>
      </Panel>
    </>);
}
