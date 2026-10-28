import { useState } from 'react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocation, useNavigate } from 'react-router';
import {
  AlertCircle,
  Boxes,
  ClipboardList,
  Eye,
  EyeOff,
  Factory,
  Lock,
  Mail,
  ShieldCheck,
} from 'lucide-react';
import { BrandLogo } from '@/components/brand/brand-logo';
import { useAuth } from '@/hooks/useAuth';
import { errorMessage } from '@/services/http/client';
import { session } from '@/services/auth/session';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';

const APP_NAME = 'NathColor+';

const schema = z.object({
  email: z.string().trim().min(1, 'Enter your email address').email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
  remember: z.boolean(),
});

const FEATURES = [
  { icon: ClipboardList, title: 'Orders', description: 'Search orders and follow status from requisition to dispatch.' },
  { icon: Factory, title: 'Production', description: 'Record every stage from jet dyeing to stenter finishing.' },
  { icon: Boxes, title: 'Stock', description: 'Live greige, yarn and job card lot balances.' },
];

function BrandPanel() {
  return (
    <aside
      aria-label={`${APP_NAME} overview`}
      className="relative isolate flex auth-brand-panel min-h-[84px] w-full shrink-0 items-center overflow-hidden px-4 py-3 text-primary-foreground sm:px-6 lg:sticky lg:top-0 lg:h-dvh lg:min-h-0 lg:flex-col lg:items-stretch lg:justify-between lg:gap-6 lg:overflow-y-auto lg:px-8 lg:py-8 xl:px-12 xl:py-10"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.08] [background-image:radial-gradient(currentColor_1px,transparent_1px)] [background-size:22px_22px]"
      />
      <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-32 -z-10 size-96 rounded-full bg-primary-foreground/5 blur-2xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -left-24 -z-10 size-[28rem] rounded-full bg-brand/10 blur-3xl" />

      <div className="relative z-10 flex w-full min-w-0 shrink-0 items-center lg:py-0">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <span className="inline-flex shrink-0 items-center rounded-xl bg-white px-2.5 py-2 shadow-md ring-1 ring-black/5 sm:px-3">
            <BrandLogo markClassName="h-7 sm:h-8 lg:h-10" wordmarkClassName="h-4 lg:h-5" />
          </span>
          <span aria-hidden="true" className="hidden h-8 w-px shrink-0 bg-primary-foreground/25 sm:block" />
          <span className="hidden min-w-0 truncate text-sm font-semibold tracking-tight sm:block sm:text-base lg:text-lg">
            {APP_NAME}
          </span>
        </div>
      </div>

      <div className="relative z-10 hidden w-full max-w-lg shrink-0 lg:block lg:py-6 xl:py-10">
        <p className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-3 py-1 text-xs font-medium tracking-wide text-primary-foreground/90 ring-1 ring-primary-foreground/15">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-brand" />
          Textile production &amp; inventory
        </p>
        <h1 className="mt-5 text-balance text-3xl font-semibold leading-[1.15] tracking-tight xl:text-[2.75rem]">
          Every order, lot and job card in one place.
        </h1>
        <p className="mt-4 max-w-md text-pretty leading-relaxed text-primary-foreground/75">
          Track greige requisitions, dyeing programs, stock levels and production stages from the shop floor to dispatch.
        </p>
        <ul className="mt-8 flex flex-col gap-3 xl:mt-10">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <li
              key={title}
              className="flex items-start gap-4 rounded-xl bg-primary-foreground/[0.06] p-4 ring-1 ring-primary-foreground/10"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/10 ring-1 ring-primary-foreground/15">
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block font-medium">{title}</span>
                <span className="mt-0.5 block text-sm leading-relaxed text-primary-foreground/70">
                  {description}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="relative z-10 hidden w-full shrink-0 items-start gap-2 text-xs leading-relaxed text-primary-foreground/70 lg:flex">
        <ShieldCheck aria-hidden="true" className="size-4 shrink-0" />
        Authorised personnel only. Please keep your sign-in details secure.
      </p>
    </aside>
  );
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
    toast.dismiss();
    setServerError(null);
    try {
      await login(values.email, values.password, values.remember);
      toast.success('Signed in successfully.');
      const from = location.state?.from;
      navigate(from && from !== '/login' ? from : '/', { replace: true });
    } catch (error) {
      setServerError(errorMessage(error));
    }
  });

  return (
    <main className="auth-page-scroll h-dvh w-full overflow-x-clip overflow-y-auto overscroll-contain bg-background lg:grid lg:grid-cols-[minmax(350px,43%)_minmax(0,1fr)]">
      <BrandPanel />

      <section className="auth-form-panel flex min-h-[calc(100dvh-84px)] min-w-0 flex-col lg:min-h-dvh">
        <div className="flex w-full flex-1 items-center justify-center px-4 py-7 sm:px-6 sm:py-10 lg:px-7 lg:py-8 xl:px-10">
          <div className="mx-auto w-full max-w-[448px] min-w-0">
            <form
              onSubmit={onSubmit}
              noValidate
              aria-describedby={serverError ? 'login-error' : undefined}
              className="auth-form-card relative flex w-full min-w-0 flex-col gap-5 overflow-hidden rounded-2xl border border-border bg-surface p-5 min-[380px]:p-6 sm:p-8 xl:p-9"
            >
              <span aria-hidden="true" className="absolute inset-x-0 top-0 flex h-1">
                <span className="flex-[3] bg-brand" />
                <span className="flex-1 bg-rose-mist" />
              </span>

              <div>
                <p className="text-sm font-medium text-primary">Welcome back</p>
                <h2 className="mt-1 text-balance text-[1.45rem] font-semibold leading-tight tracking-tight sm:text-[1.75rem]">
                  Sign in to {APP_NAME}
                </h2>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Use the email and password issued by your administrator.
                </p>
              </div>

              {serverError && (
                <div id="login-error" role="alert" className="flex items-start gap-2 rounded-lg border border-danger/20 bg-danger-soft px-3 py-2.5 text-sm text-danger">
                  <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                  <span>{serverError}</span>
                </div>
              )}

              <Field label="Email" required htmlFor="email" error={formState.errors.email?.message}>
                <div className="relative">
                  <Mail aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder="name@company.com"
                    autoFocus={!remembered}
                    aria-invalid={!!formState.errors.email}
                    className="pl-9"
                    {...register('email')}
                  />
                </div>
              </Field>

              <Field label="Password" required htmlFor="password" error={formState.errors.password?.message}>
                <div className="relative">
                  <Lock aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    autoFocus={!!remembered}
                    aria-invalid={!!formState.errors.password}
                    className="pl-9 pr-11"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-pressed={showPassword}
                    aria-controls="password"
                    className="absolute right-0.5 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
                  </button>
                </div>
              </Field>

              <label className="flex w-fit cursor-pointer items-center gap-2.5 text-sm select-none">
                <input type="checkbox" className="size-4 cursor-pointer rounded accent-primary" {...register('remember')} />
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
              <ShieldCheck aria-hidden="true" className="size-4 shrink-0" />
              Authorised personnel only.
            </p>
          </div>
        </div>

        <footer className="w-full shrink-0 px-4 pb-5 pt-2 text-center text-xs text-muted-foreground sm:pb-6">
          © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
        </footer>
      </section>
    </main>
  );
}
