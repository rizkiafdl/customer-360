import { Navigate, type RouteObject } from 'react-router'
import { AppShell } from '@/components/AppShell'
import { CustomerPage } from '@/pages/CustomerPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { PortfolioPage } from '@/pages/PortfolioPage'
import { CustomersPage } from '@/pages/CustomersPage'

export const routes: RouteObject[] = [
  {
    element: <AppShell />,
    children: [
      { index: true, element: <PortfolioPage /> },
      { path: 'customers', element: <CustomersPage /> },
      { path: 'customers/:id', element: <CustomerPage /> },
      // The F5 overview became the Portfolio home page (ADR 0009).
      { path: 'overview', element: <Navigate to="/" replace /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
