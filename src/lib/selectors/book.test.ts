import { describe, expect, it } from 'vitest'
import { customerAum } from '@/lib/domain'
import type { PortfolioItem } from '@/types'
import { asOfDate, asOfDateOf, bookCustomersOf, customerCount, getCustomerCount } from './book'
import { fixtureDataset } from '@/test/fixtures'
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

describe('bookCustomersOf', () => {
  const withRows: Dataset = {
    ...fixture,
    portfolio: [
      { customer_id: 2, product: 'TABSYA', product_category: 'FUNDING', amount: 300 },
      { customer_id: 2, product: 'KPR', product_category: 'LOAN', amount: 700 },
      { customer_id: 2, product: 'KPR', product_category: 'LOAN', amount: null },
    ],
  }

  it('gives one entry per profile, in profile order, with that customer rows only', () => {
    const book = bookCustomersOf(withRows)
    expect(book.map((c) => c.profile.customer_id)).toEqual([1, 2])
    expect(book[0]?.portfolio).toEqual([])
    expect(book[1]?.portfolio).toHaveLength(3)
  })

  it('keeps loan exposure apart from AUM', () => {
    const second = bookCustomersOf(withRows)[1]
    expect(second?.evaluation.aum).toBe(300)
    expect(second?.loanExposure).toBe(700)
  })

  it('carries the evaluation of each customer', () => {
    const first = bookCustomersOf(withRows)[0]
    expect(first?.evaluation.customer_id).toBe(1)
    expect(first?.evaluation.insights.map((i) => i.id)).toEqual(['no-aum'])
  })
})

describe('bookCustomersOf: recency, first transaction, and cash', () => {
  const book = bookCustomersOf(fixtureDataset)
  const first = book[0]

  it('takes last active from customer-initiated rows only, against the book as-of date', () => {
    // Customer 1 has a BUNGA row on 2024-04-26; the latest customer-initiated row is 2024-04-24.
    expect(first?.lastActive).toEqual({ days: 2, date: '2024-04-24' })
  })

  it('has no last active date when every row is a bank entry', () => {
    const bankOnly: Dataset = {
      ...fixtureDataset,
      transactions: fixtureDataset.transactions.map((t) =>
        t.customer_id === 2 ? { ...t, transaction_type: 'BUNGA' as const } : t,
      ),
    }
    expect(bookCustomersOf(bankOnly)[1]?.lastActive).toBeNull()
  })

  it('takes the first transaction over all rows, bank entries included', () => {
    const early: Dataset = {
      ...fixtureDataset,
      transactions: [
        ...fixtureDataset.transactions,
        { activity_date: '2011-01-27', customer_id: 1, transaction_method: 'BRANCH', transaction_type: 'BUNGA', transaction_amount: 1 },
      ],
    }
    expect(first?.firstTransaction).toBe('2023-05-02')
    expect(bookCustomersOf(early)[0]?.firstTransaction).toBe('2011-01-27')
  })

  it('has no first transaction and no last active date for a customer with no rows', () => {
    const [noRows] = bookCustomersOf({ ...fixtureDataset, transactions: [] })
    expect(noRows?.firstTransaction).toBeNull()
    expect(noRows?.lastActive).toBeNull()
  })

  it('carries the cash amount', () => {
    expect(first?.cash).toBe(620_000_000)
    expect(book[3]?.cash).toBe(100_000_000)
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
