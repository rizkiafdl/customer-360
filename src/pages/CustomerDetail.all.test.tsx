import { cleanup, render, screen } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CUSTOMER_TABS, getCustomerOptions } from '@/lib/selectors/customer360'
import { routes } from '@/routes'

// jsdom has no layout, so every Recharts container measures 0 x 0 and warns.
// That warning is the only console message this test allows.
const ZERO_SIZE_CHART = /^The width\(0\) and height\(0\) of chart should be greater than 0,/

// 500 full renders (100 customers x 5 tabs) take a few seconds locally, and
// more on the CI runner with coverage on.
const ALL_CUSTOMERS_TIMEOUT_MS = 120_000

describe('CustomerDetail: every real customer', () => {
  const messages: string[] = []
  const record = (...args: unknown[]) => {
    messages.push(args.map(String).join(' '))
  }

  beforeEach(() => {
    messages.length = 0
    vi.spyOn(console, 'error').mockImplementation(record)
    vi.spyOn(console, 'warn').mockImplementation(record)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders all 100 customers at every tab with no console error or warning', () => {
    const ids = getCustomerOptions().map((option) => option.id)
    expect(ids).toHaveLength(100)
    for (const id of ids) {
      for (const tab of CUSTOMER_TABS) {
        const router = createMemoryRouter(routes, { initialEntries: [`/customers/${id}?tab=${tab}`] })
        render(<RouterProvider router={router} />)
        expect(screen.getByRole('heading', { level: 1, name: `Customer ${id}` })).toBeInTheDocument()
        cleanup()
      }
    }
    expect(messages.filter((message) => !ZERO_SIZE_CHART.test(message))).toEqual([])
  }, ALL_CUSTOMERS_TIMEOUT_MS)
})
