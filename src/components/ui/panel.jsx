import { AlertTriangle, Inbox, Loader2 } from 'lucide-react';
import { cn } from '@/utils/format';
import { Button } from './button';
export function Panel({ className, children }) {
    return <section className={cn('min-w-0 rounded-xl border border-border bg-surface shadow-[0_3px_16px_rgb(88_26_44/0.035)]', className)}>{children}</section>;
}
export function PanelHeader({ title, description, actions }) {
    return (<div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>);
}
export function PageHeader({ title, description, actions }) {
    return (<header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-balance text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 text-pretty text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="no-print flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>);
}
export function Stat({ label, value, tone = 'default', hint }) {
    return (<div className={cn('min-w-0 rounded-xl border px-3 py-4 sm:px-4', tone === 'primary' && 'border-primary/15 bg-primary-soft', tone === 'accent' && 'border-accent/20 bg-accent-soft', tone === 'default' && 'border-border bg-surface')}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn('tabular mt-1 text-xl font-semibold', tone === 'primary' && 'text-primary', tone === 'accent' && 'text-accent')}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>);
}
export function Badge({ children, tone = 'neutral' }) {
    return (<span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap', tone === 'neutral' && 'bg-muted text-muted-foreground', tone === 'success' && 'bg-success-soft text-success', tone === 'warning' && 'bg-accent-soft text-accent', tone === 'danger' && 'bg-danger-soft text-danger', tone === 'primary' && 'bg-primary-soft text-primary')}>
      {children}
    </span>);
}
export function LoadingState({ label = 'Loading…' }) {
    return (<div className="space-y-4 px-4 py-8 text-sm text-muted-foreground" role="status" aria-live="polite" aria-busy="true">
      <div className="flex items-center justify-center gap-2"><Loader2 className="size-4 animate-spin" aria-hidden="true"/>{label}</div>
      <div className="mx-auto grid w-full max-w-3xl gap-3 motion-safe:animate-pulse" aria-hidden="true">{[0, 1, 2].map(index => <div key={index} className="flex gap-3"><span className="h-3 w-1/4 rounded bg-muted"/><span className="h-3 flex-1 rounded bg-muted"/><span className="h-3 w-1/6 rounded bg-muted"/></div>)}</div>
    </div>);
}
export function EmptyState({ title, description, action }) {
    return (<div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <Inbox className="size-8 text-muted-foreground/60" aria-hidden="true"/>
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action}
    </div>);
}
export function ErrorState({ message, onRetry }) {
    return (<div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center" role="alert">
      <AlertTriangle className="size-8 text-danger" aria-hidden="true"/>
      <p className="max-w-md text-sm text-foreground">{message}</p>
      {onRetry && (<Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>)}
    </div>);
}
