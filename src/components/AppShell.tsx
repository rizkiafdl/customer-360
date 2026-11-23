import { ChartColumnIcon, UsersIcon, type LucideIcon } from 'lucide-react'
import { Link, Outlet, useLocation } from 'react-router'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { asOfLabel } from '@/lib/selectors/customer360'
import { CustomerSearch } from './CustomerSearch'
import { ThemeToggle } from './ThemeToggle'

const NAV: { to: string; label: string; icon: LucideIcon; isActive: (pathname: string) => boolean }[] = [
  // The worklist and each customer's page sit under "Customers".
  { to: '/', label: 'Customers', icon: UsersIcon, isActive: (p) => p === '/' || p.startsWith('/customers/') },
  { to: '/overview', label: 'Overview', icon: ChartColumnIcon, isActive: (p) => p === '/overview' },
]

/** Sidebar, top bar (search, as-of date, theme toggle), and the routed page. */
export function AppShell() {
  const { pathname } = useLocation()

  return (
    <TooltipProvider>
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader className="px-4 py-3 text-sm font-semibold">Customer 360</SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <nav aria-label="Main">
                  <SidebarMenu>
                    {NAV.map((item) => {
                      const active = item.isActive(pathname)
                      return (
                        <SidebarMenuItem key={item.to}>
                          <SidebarMenuButton
                            asChild
                            isActive={active}
                            // Active: a brand red bar and icon; the text keeps body contrast.
                            className={active ? 'shadow-[inset_3px_0_0_var(--primary)] [&_svg]:text-primary' : ''}
                          >
                            <Link to={item.to} aria-current={active ? 'page' : undefined}>
                              <item.icon />
                              <span>{item.label}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      )
                    })}
                  </SidebarMenu>
                </nav>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
        <SidebarInset>
          <header className="sticky top-0 z-10 flex h-12 items-center gap-3 border-b bg-background px-4">
            <SidebarTrigger aria-label="Toggle sidebar" />
            <CustomerSearch />
            <span className="ml-auto text-sm text-muted-foreground tabular-nums">{asOfLabel}</span>
            <ThemeToggle />
          </header>
          <div className="mx-auto w-full max-w-7xl p-4 md:p-6">
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
