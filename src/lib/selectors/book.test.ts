import { describe, expect, it } from 'vitest'
import { customerAum } from '@/lib/domain'
import type { PortfolioItem } from '@/types'
import { asOfDate, asOfDateOf, customerCount, getCustomerCount } from './book'
import { dataset, type Dataset } from './dataset'

const fixture: Dataset = {
  profiles: [
    { customer_id: 1, gender: 'F', customer_income: 'sd. 1 Juta' },
    { customer_id: 2, gender: null, customer_income: '>100 Juta' },
  ],
  portfolio: [],
  transactions: [
    {
      activity_date: '2024-01-05',
      customer_id: 1,
      transaction_method: 'ATM',
      transaction_type: 'WITHDRAWAL',
      transaction_amount: 50_000,
    },
    {
      activity_date: '2024-02-10',
      customer_id: 2,
      transaction_method: 'QRIS',
      transaction_type: 'PAYMENT',
      transaction_amount: 20_000,
    },
  ],
}

describe('customerCount', () => {
  it('counts profiles', () => {
    expect(customerCount(fixture)).toBe(2)
  })
})

describe('asOfDateOf', () => {
  it('is the latest transaction date', () => {
    expect(asOfDateOf(fixture)).toBe('2024-02-10')
  })
})

// Contract tests on the committed JSON. Only the selectors layer may load it (ADR 0004).
describe('book selectors on the real data', () => {
  it('has 100 customers', () => {
    expect(getCustomerCount()).toBe(100)
  })

  it('pins the as-of date to 2024-04-26 (ADR 0005)', () => {
    expect(asOfDate).toBe('2024-04-26')
  })

  it('agrees with the book-level AUM when summed per customer (ADR 0006)', () => {
    const byCustomer = new Map<number, PortfolioItem[]>()
    for (const item of dataset.portfolio) {
      byCustomer.set(item.customer_id, [...(byCustomer.get(item.customer_id) ?? []), item])
    }
    const total = [...byCustomer.values()].reduce((sum, rows) => sum + customerAum(rows), 0)
    // Sum of `amount` (null = 0) over every non-LOAN row of portfolio.json, measured 2026-11-23.
    expect(total).toBe(811_749_876_893)
  })
})
