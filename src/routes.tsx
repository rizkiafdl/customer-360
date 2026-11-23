import type { RouteObject } from 'react-router'
import { AppShell } from '@/components/AppShell'
import { CustomerPage } from '@/pages/CustomerPage'
import { HomePage } from '@/pages/HomePage'
import { NotFoundPage } from '@/pages/NotFoundPage'

export const routes: RouteObject[] = [
  {
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'customers/:id', element: <CustomerPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
