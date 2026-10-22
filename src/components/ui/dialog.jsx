import { Dialog as RadixDialog } from 'radix-ui';
import { X } from 'lucide-react';
import { cn } from '@/utils/format';
export function Dialog({ open, onOpenChange, title, description, children, footer, className }) {
    return (<RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-50 bg-foreground/40 data-[state=open]:animate-in"/>
        <RadixDialog.Content className={cn('fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] sm:max-h-[calc(100dvh-3rem)] sm:w-[calc(100vw-3rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col rounded-lg border border-border bg-surface shadow-xl', className)} {...(description ? {} : { 'aria-describedby': undefined })}>
          <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
            <div>
              <RadixDialog.Title className="text-base font-semibold">{title}</RadixDialog.Title>
              {description && <RadixDialog.Description className="mt-0.5 text-sm text-muted-foreground">{description}</RadixDialog.Description>}
            </div>
            <RadixDialog.Close className="flex size-10 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close">
              <X className="size-4"/>
            </RadixDialog.Close>
          </div>
          <div className="min-h-0 min-w-0 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">{children}</div>
          {footer && <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-border bg-muted/30 px-4 py-3 sm:px-5">{footer}</div>}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>);
}
export function Sheet({ open, onOpenChange, title, children }) {
    return (<RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-50 bg-foreground/40"/>
        <RadixDialog.Content className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-surface shadow-xl" aria-describedby={undefined}>
          <RadixDialog.Title className="sr-only">{title}</RadixDialog.Title>
          <RadixDialog.Close aria-label="Close navigation" className="absolute right-2 top-3 flex size-10 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"><X className="size-4" aria-hidden="true" /></RadixDialog.Close>
          {children}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>);
}
