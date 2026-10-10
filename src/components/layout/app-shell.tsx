import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { LogOut, Menu, Palette } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { NAV_GROUPS, findNavItem } from '@/lib/navigation'
import { cn } from '@/lib/utils'
import { Sheet } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

const APP_NAME = 'Nathcolor+'
const API_BASE_URL = (import.meta.env.VITE_PUBLIC_API_BASE_URL ?? '').trim()
const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true' || API_BASE_URL === ''

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-4 py-4">
      <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <Palette className="size-4" aria-hidden="true" />
      </span>
      <div className="leading-tight">
        <p className="text-sm font-semibold">{APP_NAME}</p>
        <p className="text-xs text-muted-foreground">Dyeing operations</p>
      </div>
    </div>
  )
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const { can } = useAuth()
  return (
    <nav aria-label="Main" className="flex-1 overflow-y-auto px-2 pb-4">
      {NAV_GROUPS.map((group) => {
        const items = group.items.filter(can)
        if (!items.length) return null
        return (
          <div key={group.label} className="mt-4 first:mt-0">
            <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{group.label}</p>
            <ul className="flex flex-col gap-0.5">
              {items.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    end={item.path === '/'}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors',
                        isActive ? 'bg-primary-soft font-medium text-primary' : 'text-foreground/80 hover:bg-muted hover:text-foreground',
                      )
                    }
                  >
                    <item.icon className="size-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{item.title}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </nav>
  )
}

function UserFooter() {
  const { username, logout } = useAuth()
  return (
    <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
      <div className="flex min-w-0 items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-semibold uppercase">{username.slice(0, 2)}</span>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-medium">{username}</p>
          <p className="text-xs text-muted-foreground">{USE_MOCK_API ? 'Demo data' : 'Live'}</p>
        </div>
      </div>
      <Button variant="ghost" size="icon" onClick={logout} aria-label="Sign out" className="size-8">
        <LogOut aria-hidden="true" />
      </Button>
    </div>
  )
}

export function AppShell() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const current = findNavItem(location.pathname)

  return (
    <div className="flex min-h-dvh">
      <aside className="no-print sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-surface lg:flex">
        <Brand />
        <NavList />
        <UserFooter />
      </aside>

      <Sheet open={open} onOpenChange={setOpen} title="Navigation">
        <Brand />
        <NavList onNavigate={() => setOpen(false)} />
        <UserFooter />
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-surface/95 px-4 backdrop-blur lg:hidden">
          <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="Open navigation">
            <Menu aria-hidden="true" />
          </Button>
          <p className="truncate text-sm font-semibold">{current?.title ?? APP_NAME}</p>
        </header>
        {USE_MOCK_API && (
          <div className="no-print border-b border-accent/20 bg-accent-soft px-4 py-1.5 text-center text-xs text-accent">
            Demo mode — showing sample data. Set <code className="font-mono">VITE_PUBLIC_API_BASE_URL</code> in your .env file to connect to the live server.
          </div>
        )}
        <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-5 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
