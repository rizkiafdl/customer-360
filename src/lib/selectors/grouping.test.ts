import { describe, expect, it } from 'vitest'
import type { PortfolioItem, Transaction } from '@/types'
import type { Dataset } from './dataset'
import { groupByCustomer } from './grouping'

const holding = (customer_id: number, amount: number): PortfolioItem => ({
  customer_id,
  product: 'TABUNGAN',
  product_category: 'FUNDING',
  amount,
})

const trx = (customer_id: number, activity_date: string): Transaction => ({
  customer_id,
  activity_date,
  transaction_method: 'ATM',
  transaction_type: 'WITHDRAWAL',
  transaction_amount: 100_000,
})

const data: Dataset = {
  profiles: [
    { customer_id: 30, gender: 'F', customer_income: 'sd. 1 Juta' },
    { customer_id: 10, gender: 'M', customer_income: '>100 Juta' },
    { customer_id: 20, gender: null, customer_income: '>5 Juta - 10 Juta' },
  ],
  portfolio: [holding(10, 1), holding(30, 2), holding(10, 3), holding(99, 4)],
  transactions: [trx(20, '2024-04-01'), trx(10, '2024-04-02'), trx(20, '2024-04-03')],
}

describe('groupByCustomer', () => {
  it('keys the customers in profile order', () => {
    expect([...groupByCustomer(data).keys()]).toEqual([30, 10, 20])
  })

  it('gives each customer its own rows, in source order', () => {
    const rows = groupByCustomer(data)
    expect(rows.get(10)).toEqual({
      profile: data.profiles[1],
      portfolio: [holding(10, 1), holding(10, 3)],
      transactions: [trx(10, '2024-04-02')],
    })
    expect(rows.get(20)?.transactions).toEqual([trx(20, '2024-04-01'), trx(20, '2024-04-03')])
  })

  it('gives empty lists to a customer with no rows', () => {
    const rows = groupByCustomer(data)
    expect(rows.get(20)?.portfolio).toEqual([])
    expect(rows.get(30)?.transactions).toEqual([])
  })

  it('drops rows whose customer has no profile', () => {
    const rows = groupByCustomer(data)
    expect(rows.has(99)).toBe(false)
    expect([...rows.values()].flatMap((r) => r.portfolio)).toHaveLength(3)
  })
})
