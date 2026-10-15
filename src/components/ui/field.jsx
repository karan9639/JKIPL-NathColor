import { forwardRef } from 'react';
import { cn } from '@/utils/format';
const control = 'w-full rounded-md border border-border bg-surface px-3 text-foreground placeholder:text-muted-foreground/70 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-muted aria-[invalid=true]:border-danger';
export const Input = forwardRef(function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(control, 'h-10', className)} {...props}/>;
});
export const Select = forwardRef(function Select({ className, children, ...props }, ref) {
    return (<select ref={ref} className={cn(control, 'h-10 pr-8', className)} {...props}>
      {children}
    </select>);
});
export const Textarea = forwardRef(function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={cn(control, 'min-h-24 py-2', className)} {...props}/>;
});
export function Field({ label, htmlFor, error, hint, children, className }) {
    return (<div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
      {error ? (<p className="text-sm text-danger" role="alert">
          {error}
        </p>) : hint ? (<p className="text-xs text-muted-foreground">{hint}</p>) : null}
    </div>);
}
