import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/utils/format';
const variants = {
    primary: 'border border-primary bg-primary text-primary-foreground shadow-[0_3px_10px_rgb(181_41_59/0.13)] hover:border-primary-hover hover:bg-primary-hover hover:shadow-[0_5px_14px_rgb(181_41_59/0.18)]',
    secondary: 'border border-primary/10 bg-primary-soft text-primary hover:bg-primary-soft/70',
    outline: 'border border-border bg-surface text-foreground hover:border-primary/40 hover:bg-primary-soft/50',
    ghost: 'text-foreground hover:bg-primary-soft/60',
    danger: 'bg-danger text-white hover:bg-danger/90',
};
const sizes = {
    sm: 'h-9 px-3 text-sm gap-1.5',
    md: 'h-10 px-4 text-sm gap-2',
    lg: 'h-12 px-5 text-base gap-2',
    icon: 'size-10',
};
export const Button = forwardRef(function Button({ className, variant = 'primary', size = 'md', loading, disabled, children, type = 'button', ...props }, ref) {
    return (<button ref={ref} type={type} aria-busy={loading || undefined} disabled={disabled || loading} className={cn('erp-action-button inline-flex shrink-0 items-center justify-center rounded-lg font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0', variants[variant], sizes[size], className)} {...props}>
      {loading && <Loader2 className="animate-spin" aria-hidden="true"/>}
      {children}
    </button>);
});
