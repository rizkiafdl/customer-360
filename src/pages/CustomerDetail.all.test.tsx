import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { getCustomer360, getCustomerOptions } from '@/lib/selectors/customer360'
import { CustomerDetail } from './CustomerDetail'

// jsdom has no layout, so every Recharts container measures 0 x 0 and warns.
// That warning is the only console message this test allows.
const ZERO_SIZE_CHART = /^The width\(0\) and height\(0\) of chart should be greater than 0,/

// 100 full renders take about 1 s locally, but more than the 5 s default
// on the CI runner with coverage on.
const ALL_CUSTOMERS_TIMEOUT_MS = 30_000

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

  it('renders all 100 customers with no console error or warning', () => {
    const ids = getCustomerOptions().map((option) => option.id)
    expect(ids).toHaveLength(100)
    for (const id of ids) {
      const vm = getCustomer360(id)
      if (!vm) throw new Error(`customer ${id} did not build`)
      render(
        <TooltipProvider>
          <CustomerDetail vm={vm} />
        </TooltipProvider>,
      )
      expect(screen.getByRole('heading', { level: 1, name: `Customer ${id}` })).toBeInTheDocument()
      cleanup()
    }
    expect(messages.filter((message) => !ZERO_SIZE_CHART.test(message))).toEqual([])
  }, ALL_CUSTOMERS_TIMEOUT_MS)
})
