import { render } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { RECENT_CUSTOMERS_KEY } from '@/lib/recent-customers'
import { routes } from '@/routes'

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
  return router
}

describe('CustomerPage', () => {
  it('records a real customer', () => {
    renderAt('/customers/4857')
    expect(localStorage.getItem(RECENT_CUSTOMERS_KEY)).toBe('[4857]')
  })

  it('moves a revisited customer to the front', () => {
    localStorage.setItem(RECENT_CUSTOMERS_KEY, '[2759,4857]')
    renderAt('/customers/4857')
    expect(localStorage.getItem(RECENT_CUSTOMERS_KEY)).toBe('[4857,2759]')
  })

  it('records nothing for Customer not found', () => {
    renderAt('/customers/99999')
    expect(localStorage.getItem(RECENT_CUSTOMERS_KEY)).toBeNull()
  })
})
