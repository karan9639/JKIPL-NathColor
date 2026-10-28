import { useState } from 'react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocation, useNavigate } from 'react-router';
import { AlertCircle, Boxes, ClipboardList, Eye, EyeOff, Factory, Lock, Mail, ShieldCheck } from 'lucide-react';
import { BrandLogo } from '@/components/brand/brand-logo';
import { useAuth } from '@/hooks/useAuth';
import { errorMessage } from '@/services/http/client';
import { session } from '@/services/auth/session';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';

const schema = z.object({
    email: z
        .string()
        .trim()
        .min(1, 'Enter your email address')
        .email('Enter a valid email address'),
    password: z.string().min(1, 'Enter your password'),
    remember: z.boolean(),
});

const APP_NAME = 'Nathcolor+';

const FEATURES = [
    { icon: ClipboardList, title: 'Orders', description: 'Search orders and follow status from requisition to dispatch.' },
    { icon: Factory, title: 'Production', description: 'Record every stage from jet dyeing to stenter finishing.' },
    { icon: Boxes, title: 'Stock', description: 'Live greige, yarn and job card lot balances.' },
];

function BrandPanel() {
    return (<section aria-label={`${APP_NAME} overview`} className="relative isolate overflow-hidden bg-primary text-primary-foreground lg:flex lg:w-[46%] lg:flex-col lg:justify-between lg:px-12 lg:py-10 xl:px-16">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 opacity-[0.08] [background-image:radial-gradient(currentColor_1px,transparent_1px)] [background-size:22px_22px]"/>
      <div aria-hidden="true" className="pointer-events-none absolute -top-32 -right-32 -z-10 size-96 rounded-full bg-primary-foreground/5 blur-2xl"/>
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -left-24 -z-10 size-[28rem] rounded-full bg-brand/10 blur-3xl"/>

      <div className="flex items-center justify-between gap-3 px-5 py-4 lg:p-0">
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex shrink-0 rounded-xl bg-surface px-3 py-2 shadow-lg shadow-black/10 ring-1 ring-black/5">
            <BrandLogo markClassName="h-8 lg:h-10" wordmarkClassName="h-4 lg:h-5"/>
          </span>
          <span aria-hidden="true" className="hidden h-8 w-px bg-primary-foreground/25 sm:block"/>
          <span className="hidden truncate text-base font-semibold tracking-tight sm:block lg:text-lg">{APP_NAME}</span>
        </div>
      </div>

      <div className="hidden max-w-lg py-12 lg:block">
        <p className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-3 py-1 text-xs font-medium tracking-wide text-primary-foreground/90 ring-1 ring-primary-foreground/15">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-brand"/>
          Textile production &amp; inventory
        </p>
        <h1 className="mt-5 text-balance text-4xl font-semibold leading-[1.15] tracking-tight xl:text-[2.75rem]">
          Every order, lot and job card in one place.
        </h1>
        <p className="mt-4 max-w-md text-pretty leading-relaxed text-primary-foreground/75">
          Track greige requisitions, dyeing programs, stock levels and production stages from the shop floor to dispatch.
        </p>

        <ul className="mt-10 flex flex-col gap-3">
          {FEATURES.map(({ icon: Icon, title, description }) => (<li key={title} className="flex items-start gap-4 rounded-xl bg-primary-foreground/[0.06] p-4 ring-1 ring-primary-foreground/10">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/10 ring-1 ring-primary-foreground/15">
                <Icon aria-hidden="true" className="size-5"/>
              </span>
              <span className="min-w-0">
                <span className="block font-medium">{title}</span>
                <span className="mt-0.5 block text-sm leading-relaxed text-primary-foreground/70">{description}</span>
              </span>
            </li>))}
        </ul>
      </div>

      <p className="hidden items-center gap-2 text-xs text-primary-foreground/60 lg:flex">
        <ShieldCheck aria-hidden="true" className="size-4 shrink-0"/>
        Authorised personnel only. Please keep your sign-in details secure.
      </p>
    </section>);
}

export function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [showPassword, setShowPassword] = useState(false);
    const [serverError, setServerError] = useState(null);
    const remembered = session.getRememberedEmail();
    const { register, handleSubmit, formState } = useForm({
        resolver: zodResolver(schema),
        defaultValues: { email: remembered, password: '', remember: !!remembered },
    });
    const onSubmit = handleSubmit(async (values) => {
        toast.dismiss(); // Dismiss a stale expired-session toast from a previous page.
        setServerError(null);
        try {
            await login(values.email, values.password, values.remember);
            toast.success('Signed in successfully.');
            const from = location.state?.from;
            navigate(from && from !== '/login' ? from : '/', { replace: true });
        }
        catch (e) {
            setServerError(errorMessage(e));
            // The inline field-level alert is sufficient; avoid duplicate toast banners.
        }
    });
    const year = new Date().getFullYear();

    return (<main className="flex h-dvh min-h-0 flex-col overflow-x-hidden overflow-y-auto overscroll-contain lg:flex-row">
      <BrandPanel />

      <section className="flex flex-1 flex-col">
        <div className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
          <div className="w-full max-w-md">
            <form onSubmit={onSubmit} noValidate aria-describedby={serverError ? 'login-error' : undefined} className="relative flex flex-col gap-5 overflow-hidden rounded-2xl border border-border bg-surface p-6 shadow-[0_1px_2px_rgb(23_32_26/0.04),0_12px_40px_rgb(23_32_26/0.06)] sm:p-9">
              <span aria-hidden="true" className="absolute inset-x-0 top-0 flex h-1">
                <span className="flex-[3] bg-primary"/>
                <span className="flex-1 bg-brand"/>
              </span>

              <div>
                <p className="text-sm font-medium text-primary">Welcome back</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-[1.75rem]">Sign in to {APP_NAME}</h2>
                <p className="mt-1.5 text-sm text-muted-foreground">Use the email and password issued by your administrator.</p>
              </div>

              {serverError && (<div id="login-error" role="alert" className="flex items-start gap-2 rounded-lg border border-danger/20 bg-danger-soft px-3 py-2.5 text-sm text-danger">
                  <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0"/>
                  <span>{serverError}</span>
                </div>)}

              <Field label="Email" required htmlFor="email" error={formState.errors.email?.message}>
                <div className="relative">
                  <Mail aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"/>
                  <Input id="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} placeholder="name@company.com" autoFocus={!remembered} aria-invalid={!!formState.errors.email} className="pl-9" {...register('email')}/>
                </div>
              </Field>

              <Field label="Password" required htmlFor="password" error={formState.errors.password?.message}>
                <div className="relative">
                  <Lock aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"/>
                  <Input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" autoFocus={!!remembered} aria-invalid={!!formState.errors.password} className="pr-11 pl-9" {...register('password')}/>
                  <button type="button" onClick={() => setShowPassword((s) => !s)} aria-pressed={showPassword} aria-controls="password" className="absolute top-1/2 right-0.5 flex size-10 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? <EyeOff aria-hidden="true" className="size-4"/> : <Eye aria-hidden="true" className="size-4"/>}
                  </button>
                </div>
              </Field>

              <label className="flex w-fit cursor-pointer items-center gap-2.5 text-sm select-none">
                <input type="checkbox" className="size-4 cursor-pointer rounded accent-primary" {...register('remember')}/>
                Remember my email on this device
              </label>

              <Button type="submit" size="lg" loading={formState.isSubmitting} className="w-full">
                Sign in
              </Button>

              <p className="border-t border-border pt-4 text-center text-xs leading-relaxed text-muted-foreground">
                Forgot your password or need access? Contact your system administrator.
              </p>
            </form>

            <p className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground lg:hidden">
              <ShieldCheck aria-hidden="true" className="size-4 shrink-0"/>
              Authorised personnel only.
            </p>
          </div>
        </div>

        <footer className="px-4 pb-6 text-center text-xs text-muted-foreground">
          {'\u00A9'} {year} {APP_NAME}. All rights reserved.
        </footer>
      </section>
    </main>);
}
