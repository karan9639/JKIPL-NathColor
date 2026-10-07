import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useLocation, useNavigate } from 'react-router'
import { Eye, EyeOff, Palette } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { config } from '@/lib/config'
import { errorMessage } from '@/lib/api'
import { session } from '@/lib/session'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'

const schema = z.object({
  username: z.string().trim().min(1, 'Enter your username'),
  password: z.string().min(1, 'Enter your password'),
  remember: z.boolean(),
})
type FormValues = z.infer<typeof schema>

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const remembered = session.getRememberedUsername()

  const { register, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: remembered, password: '', remember: !!remembered },
  })

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null)
    try {
      await login(values.username, values.password, values.remember)
      const from = (location.state as { from?: string } | null)?.from
      navigate(from && from !== '/login' ? from : '/', { replace: true })
    } catch (e) {
      setServerError(errorMessage(e))
    }
  })

  return (
    <main className="flex min-h-dvh flex-col lg:flex-row">
      <section className="flex flex-col justify-between bg-primary px-6 py-8 text-primary-foreground lg:w-[44%] lg:px-12 lg:py-12">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-md bg-primary-foreground/15">
            <Palette className="size-5" aria-hidden="true" />
          </span>
          <span className="text-lg font-semibold">{config.appName}</span>
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
        <p className="mt-6 hidden text-xs text-primary-foreground/60 lg:block">Authorised personnel only. Activity is logged per device.</p>
      </section>

      <section className="flex flex-1 items-center justify-center px-6 py-10">
        <form onSubmit={onSubmit} noValidate className="flex w-full max-w-sm flex-col gap-5">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
            <p className="mt-1 text-sm text-muted-foreground">Use your Nathcolor+ credentials.</p>
          </div>

          {serverError && (
            <div role="alert" className="rounded-md border border-danger/20 bg-danger-soft px-3 py-2 text-sm text-danger">
              {serverError}
            </div>
          )}

          <Field label="Username" htmlFor="username" error={formState.errors.username?.message}>
            <Input id="username" autoComplete="username" autoCapitalize="none" autoFocus={!remembered} aria-invalid={!!formState.errors.username} {...register('username')} />
          </Field>

          <Field label="Password" htmlFor="password" error={formState.errors.password?.message}>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                autoFocus={!!remembered}
                aria-invalid={!!formState.errors.password}
                className="pr-10"
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </Field>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="size-4 accent-primary" {...register('remember')} />
            Remember my username
          </label>

          <Button type="submit" size="lg" loading={formState.isSubmitting}>
            Sign in
          </Button>

          {config.useMockApi && (
            <p className="rounded-md bg-accent-soft px-3 py-2 text-xs text-accent">
              Demo mode: sign in with any username (try <span className="font-mono font-medium">ap</span> for full access) and any password.
            </p>
          )}
        </form>
      </section>
    </main>
  )
}
