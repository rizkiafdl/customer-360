import { LayoutDashboardIcon, UsersIcon, type LucideIcon } from 'lucide-react'
import { Link, Outlet, useLocation } from 'react-router'
import { TooltipProvider } from '@/components/ui/tooltip'
import { snapshotLabel } from '@/lib/selectors/customer360'
import { cn } from '@/lib/utils'
import { CustomerSearch } from './CustomerSearch'
import { ThemeToggle } from './ThemeToggle'

const NAV: { to: string; label: string; icon: LucideIcon; isActive: (pathname: string) => boolean }[] = [
  { to: '/', label: 'Portfolio', icon: LayoutDashboardIcon, isActive: (p) => p === '/' },
  // The Customers list and each customer's page sit under "Customers".
  {
    to: '/customers',
    label: 'Customers',
    icon: UsersIcon,
    isActive: (p) => p === '/customers' || p.startsWith('/customers/'),
  },
]

/** Top bar (product name, nav, search, snapshot date, theme switch) and the routed page. */
export function AppShell() {
  const { pathname } = useLocation()

  return (
    <TooltipProvider>
      <header className="sticky top-0 z-10 border-b bg-card">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 md:px-6">
          <span className="font-heading text-base font-semibold">Customer 360</span>
          <nav aria-label="Main" className="flex self-stretch">
            {NAV.map((item) => {
              const active = item.isActive(pathname)
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    // Active: a brand red bottom bar and icon; the text keeps body contrast.
                    active
                      ? 'font-medium text-foreground shadow-[inset_0_-2px_0_var(--primary)] [&_svg]:text-primary'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <item.icon className="size-4" aria-hidden="true" />
                  {item.label}
                </Link>
              )
            })}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <CustomerSearch />
            <span className="text-sm text-muted-foreground tabular-nums">{snapshotLabel}</span>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl p-4 md:p-6">
        <Outlet />
      </main>
    </TooltipProvider>
  )
}
