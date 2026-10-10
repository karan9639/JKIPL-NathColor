import { useState } from 'react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocation, useNavigate } from 'react-router';
import { Eye, EyeOff, Palette } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { errorMessage } from '@/lib/api';
import { session } from '@/lib/session';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
const schema = z.object({
    username: z.string().trim().email('Enter a valid email address'),
    password: z.string().min(1, 'Enter your password'),
    remember: z.boolean(),
});
const APP_NAME = 'Nathcolor+';
const API_BASE_URL = (import.meta.env.VITE_PUBLIC_API_BASE_URL ?? '').trim();
const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true' || API_BASE_URL === '';
export function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [showPassword, setShowPassword] = useState(false);
    const [serverError, setServerError] = useState(null);
    const remembered = session.getRememberedUsername();
    const { register, handleSubmit, formState } = useForm({
        resolver: zodResolver(schema),
        defaultValues: { username: remembered, password: '', remember: !!remembered },
    });
    const onSubmit = handleSubmit(async (values) => {
        setServerError(null);
        try {
            await login(values.username, values.password, values.remember);
            toast.success('Signed in successfully.');
            const from = location.state?.from;
            navigate(from && from !== '/login' ? from : '/', { replace: true });
        }
        catch (e) {
            setServerError(errorMessage(e));
            toast.error(errorMessage(e), { id: 'login-error' });
        }
    });
    return (<main className="flex min-h-dvh flex-col lg:flex-row">
      <section className="flex flex-col justify-between bg-primary px-6 py-8 text-primary-foreground lg:w-[44%] lg:px-12 lg:py-12">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-md bg-primary-foreground/15">
            <Palette className="size-5" aria-hidden="true"/>
          </span>
          <span className="text-lg font-semibold">{APP_NAME}</span>
        </div>
        <div className="mt-10 hidden max-w-md lg:block">
          <h1 className="text-balance text-3xl font-semibold leading-tight">Every order, lot and job card in one place.</h1>
          <p className="mt-3 text-pretty text-primary-foreground/80">
            Track greige requisitions, dyeing programs, stock levels and production stages from the shop floor to dispatch.
          </p>
          <dl className="mt-10 grid grid-cols-3 gap-4 border-t border-primary-foreground/20 pt-6 text-sm">
            <div>
              <dt className="text-primary-foreground/70">Orders</dt>
              <dd className="mt-1 font-medium">Search & status</dd>
            </div>
            <div>
              <dt className="text-primary-foreground/70">Production</dt>
              <dd className="mt-1 font-medium">Jet to stenter</dd>
            </div>
            <div>
              <dt className="text-primary-foreground/70">Stock</dt>
              <dd className="mt-1 font-medium">Greige & yarn</dd>
            </div>
          </dl>
        </div>
        <p className="mt-6 hidden text-xs text-primary-foreground/60 lg:block">Authorised personnel only. Please keep your sign-in details secure.</p>
      </section>

      <section className="flex flex-1 items-center justify-center px-6 py-10">
        <form onSubmit={onSubmit} noValidate className="flex w-full max-w-sm flex-col gap-5">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
            <p className="mt-1 text-sm text-muted-foreground">Use your Nathcolor+ email and password.</p>
          </div>

          {serverError && (<div role="alert" className="rounded-md border border-danger/20 bg-danger-soft px-3 py-2 text-sm text-danger">
              {serverError}
            </div>)}

          <Field label="Email" htmlFor="username" error={formState.errors.username?.message}>
            <Input id="username" autoComplete="username" autoCapitalize="none" autoFocus={!remembered} aria-invalid={!!formState.errors.username} {...register('username')}/>
          </Field>

          <Field label="Password" htmlFor="password" error={formState.errors.password?.message}>
            <div className="relative">
              <Input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" autoFocus={!!remembered} aria-invalid={!!formState.errors.password} className="pr-10" {...register('password')}/>
              <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? <EyeOff className="size-4"/> : <Eye className="size-4"/>}
              </button>
            </div>
          </Field>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="size-4 accent-primary" {...register('remember')}/>
            Remember my email
          </label>

          <Button type="submit" size="lg" loading={formState.isSubmitting}>
            Sign in
          </Button>

          {USE_MOCK_API && (<p className="rounded-md bg-accent-soft px-3 py-2 text-xs text-accent">
              Demo mode: sign in with any email (try <span className="font-mono font-medium">ap</span> for full access) and any password.
            </p>)}
        </form>
      </section>
    </main>);
}
