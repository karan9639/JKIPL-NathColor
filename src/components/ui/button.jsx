import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/utils/format';
const variants = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary-hover',
    secondary: 'bg-primary-soft text-primary hover:bg-primary-soft/70',
    outline: 'border border-border bg-surface text-foreground hover:bg-muted',
    ghost: 'text-foreground hover:bg-muted',
    danger: 'bg-danger text-white hover:bg-danger/90',
};
const sizes = {
    sm: 'h-9 px-3 text-sm gap-1.5',
    md: 'h-10 px-4 text-sm gap-2',
    lg: 'h-12 px-5 text-base gap-2',
    icon: 'size-10',
};
export const Button = forwardRef(function Button({ className, variant = 'primary', size = 'md', loading, disabled, children, type = 'button', ...props }, ref) {
    return (<button ref={ref} type={type} aria-busy={loading || undefined} disabled={disabled || loading} className={cn('inline-flex shrink-0 items-center justify-center rounded-md font-medium whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0', variants[variant], sizes[size], className)} {...props}>
      {loading && <Loader2 className="animate-spin" aria-hidden="true"/>}
      {children}
    </button>);
});
