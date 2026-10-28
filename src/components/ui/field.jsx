import { createContext, forwardRef, useContext, useId } from 'react';
import { cn } from '@/utils/format';
const FieldContext = createContext(null);
const control = 'w-full min-w-0 rounded-lg border border-border bg-surface px-3 shadow-[0_1px_2px_rgb(91_28_42/0.015)] text-foreground placeholder:text-muted-foreground/70 transition-colors duration-150 focus:border-primary focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground aria-[invalid=true]:border-danger';
function useFieldProps(props) {
  const field = useContext(FieldContext);
  if (!field || props['aria-label'] || (props.id && props.id !== field.id)) return props;
  return { id: field.id, required: field.required, ...props, 'aria-invalid': props['aria-invalid'] ?? (field.error ? true : undefined), 'aria-describedby': [props['aria-describedby'], field.description].filter(Boolean).join(' ') || undefined };
}
export const Input = forwardRef(function Input({ className, ...props }, ref) {
  const attributes = useFieldProps(props);
  return <input ref={ref} className={cn(control, 'h-10', className)} {...attributes}/>;
});
export const Select = forwardRef(function Select({ className, children, ...props }, ref) {
  const attributes = useFieldProps(props);
  return <select ref={ref} className={cn(control, 'h-10 pr-8', className)} {...attributes}>{children}</select>;
});
export const Textarea = forwardRef(function Textarea({ className, ...props }, ref) {
  const attributes = useFieldProps(props);
  return <textarea ref={ref} className={cn(control, 'min-h-24 py-2', className)} {...attributes}/>;
});
export function Field({ label, htmlFor, error, hint, required, children, className }) {
  const generatedId = useId();
  const id = htmlFor || generatedId;
  const description = error || hint ? `${id}-description` : undefined;
  return <FieldContext.Provider value={{ id, error, description, required }}>
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-foreground">{label}{required && <span className="ml-1 text-danger" aria-hidden="true">*</span>}</label>
      {children}
      {error ? <p id={description} className="text-sm text-danger" role="alert">{error}</p> : hint ? <p id={description} className="text-xs leading-relaxed text-muted-foreground">{hint}</p> : null}
    </div>
  </FieldContext.Provider>;
}
