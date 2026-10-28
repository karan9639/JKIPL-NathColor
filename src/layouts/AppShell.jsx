import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import { navigationChanged } from '@/state/store';
import { NavLink, Outlet, useLocation } from 'react-router';
import { LogOut, Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { BrandLogo, BrandMark } from '@/components/brand/brand-logo';
import { useAuth } from '@/hooks/useAuth';
import { NAV_GROUPS, findNavItem } from '@/constants/navigation';
import { cn } from '@/utils/format';
import { Sheet } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { config } from '@/config/env';
const APP_NAME = config.appName;
const USE_MOCK_API = config.useMockApi;
function Brand() {
    return (<div className="flex flex-col gap-1.5 px-4 py-4">
      <BrandLogo markClassName="h-9" wordmarkClassName="h-5"/>
      <p className="text-xs text-muted-foreground">{APP_NAME} · Dyeing operations</p>
    </div>);
}
function NavList({ onNavigate, collapsed = false }) {
    const { can } = useAuth();
    return (<nav aria-label="Main" className="flex-1 overflow-y-auto px-2 pb-4">
      {NAV_GROUPS.map((group) => {
            const items = group.items.filter(can);
            if (!items.length)
                return null;
            return (<div key={group.label} className="mt-4 first:mt-0">
            <p className={cn('px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground', collapsed && 'sr-only')}>{group.label}</p>
            <ul className="flex flex-col gap-0.5">
              {items.map((item) => (<li key={item.path}>
                  <NavLink to={item.path} end={item.path === '/'} onClick={onNavigate} title={collapsed ? item.title : undefined} aria-label={collapsed ? item.title : undefined} className={({ isActive }) => cn('flex min-h-10 items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors duration-150', collapsed && 'justify-center px-2', isActive ? 'bg-primary-soft font-medium text-primary' : 'text-foreground/80 hover:bg-muted hover:text-foreground')}>
                    <item.icon className="size-4 shrink-0" aria-hidden="true"/>
                    <span className={collapsed ? 'sr-only' : 'truncate'}>{item.title}</span>
                  </NavLink>
                </li>))}
            </ul>
          </div>);
        })}
    </nav>);
}
function UserFooter() {
    const { username, user, role } = useAuth();
    const displayName = user?.fullname || username || 'Account';
    return (<div className="flex items-center gap-2 border-t border-border px-4 py-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold uppercase">{displayName.slice(0, 2)}</span>
      <div className="min-w-0 leading-tight">
        <p className="truncate text-sm font-medium">{displayName}</p>
        <p className="text-xs text-muted-foreground">{role ? `${role.charAt(0).toUpperCase()}${role.slice(1)} · ` : ''}{USE_MOCK_API ? 'Demo data' : 'Live'}</p>
      </div>
    </div>);
}
export function AppShell() {
    const { logout, isLoggingOut } = useAuth();
    const [collapsed, setCollapsed] = useState(false);
    const mainScrollRef = useRef(null);
    const dispatch = useDispatch();
    const open = useSelector((state) => state.ui.navigationOpen);
    const setOpen = (value) => dispatch(navigationChanged(value));
    const location = useLocation();
    const current = findNavItem(location.pathname);
    // The SPA owns scroll restoration; browser document-level restoration can
    // jump when a navigation changes between collapsed/expanded sidebar widths.
    useEffect(() => {
        const previous = window.history.scrollRestoration;
        window.history.scrollRestoration = 'manual';
        return () => { window.history.scrollRestoration = previous; };
    }, []);
    // Reset only on route navigation, never when toggling the sidebar.
    // Layout effect runs before paint so restored document offsets do not flash.
    useLayoutEffect(() => {
        if (mainScrollRef.current) {
            mainScrollRef.current.scrollTop = 0;
            mainScrollRef.current.scrollLeft = 0;
        }
        // Recover the document from a previously saved browser scroll position.
        window.scrollTo(0, 0);
    }, [location.pathname, location.search]);
    return (
      <div className="app-shell-root flex min-h-0 w-full overflow-hidden">
<a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-3 focus:text-white">Skip to content</a>
        <aside className={cn('no-print hidden h-full min-h-0 shrink-0 flex-col overflow-hidden border-r border-border bg-surface transition-[width] duration-200 lg:flex', collapsed ? 'w-16' : 'w-60')}>
          {collapsed ? <div className="flex h-16 items-center justify-center"><BrandMark className="h-8" /></div> : <Brand />}
          <NavList collapsed={collapsed} />
          {!collapsed && <UserFooter />}
        </aside>

        <Sheet open={open} onOpenChange={setOpen} title="Navigation">
          <Brand />
          <NavList onNavigate={() => setOpen(false)} />
          <UserFooter />
        </Sheet>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <header className="no-print relative z-30 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border bg-surface/95 px-3 backdrop-blur sm:px-4">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(true)}
                aria-label="Open navigation"
                aria-expanded={open}
                aria-haspopup="dialog"
                className="lg:hidden"
              >
                <Menu aria-hidden="true" />
              </Button>
              <Button variant="ghost" size="icon" className="hidden lg:inline-flex" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!collapsed} onClick={() => setCollapsed(value => !value)}>{collapsed ? <PanelLeftOpen aria-hidden="true" /> : <PanelLeftClose aria-hidden="true" />}</Button>
              <p className="truncate text-sm font-semibold">
                {current?.title ?? APP_NAME}
              </p>
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
              <Button
                variant="outline"
                size="sm"
                loading={isLoggingOut}
                disabled={isLoggingOut}
                onClick={async () => {
                  try {
                    await logout();
                    toast.success("Signed out successfully.");
                  } catch (error) {
                    toast.error("Unable to log out. Please try again.");
                  }
                }}
                aria-label="Log out"
                className={cn(
                  "h-9 gap-2 rounded-lg border-red-200",
                  "bg-red-50 px-3.5 font-medium text-red-600",
                  "shadow-none transition-all duration-200",
                  "hover:border-red-600 hover:bg-red-600 hover:text-white",
                  "focus-visible:ring-2 focus-visible:ring-red-500/30",
                  "disabled:cursor-not-allowed disabled:opacity-60",
                )}
              >
                <LogOut className="size-4 shrink-0" aria-hidden="true" />
                <span>Logout</span>
              </Button>
            </div>
          </header>
          {USE_MOCK_API && (
            <div className="no-print border-b border-accent/20 bg-accent-soft px-4 py-1.5 text-center text-xs text-accent">
              Demo mode — showing sample data. Set{" "}
              <code className="font-mono">VITE_PUBLIC_API_BASE_URL</code> in
              your .env file to connect to the live server.
            </div>
          )}
          <main ref={mainScrollRef} id="main-content" tabIndex={-1} className="app-content-scroll flex min-h-0 w-full min-w-0 flex-1 flex-col gap-5 overflow-x-hidden overflow-y-auto overscroll-contain p-3 [&>*]:shrink-0 sm:p-5 xl:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    );
}
