import type { RouteObject } from 'react-router'
import { AppShell } from '@/components/AppShell'
import { CustomerPage } from '@/pages/CustomerPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { OverviewPage } from '@/pages/OverviewPage'
import { WorklistPage } from '@/pages/WorklistPage'

export const routes: RouteObject[] = [
  {
    element: <AppShell />,
    children: [
      { index: true, element: <WorklistPage /> },
      { path: 'overview', element: <OverviewPage /> },
      { path: 'customers/:id', element: <CustomerPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
