import { describe, expect, it } from 'vitest'
import {
  GENDERS,
  INCOME_BANDS,
  PRODUCT_CATEGORIES,
  TRANSACTION_METHODS,
  TRANSACTION_TYPES,
} from '@/types'
import { portfolio, profiles, transactions } from './index'

// Contract test for the committed output of `npm run data:build`.
describe('generated data', () => {
  it('has one record per non-empty source row', () => {
    expect(profiles).toHaveLength(100)
    expect(portfolio).toHaveLength(1576)
    expect(transactions).toHaveLength(5000)
  })

  it('links every portfolio and transaction row to a profile', () => {
    const ids = new Set(profiles.map((p) => p.customer_id))
    expect(ids.size).toBe(profiles.length)
    expect(portfolio.every((p) => ids.has(p.customer_id))).toBe(true)
    expect(transactions.every((t) => ids.has(t.customer_id))).toBe(true)
  })

  it('uses only known enum values', () => {
    expect(profiles.every((p) => p.gender === null || GENDERS.includes(p.gender))).toBe(true)
    expect(profiles.every((p) => INCOME_BANDS.includes(p.customer_income))).toBe(true)
    expect(portfolio.every((p) => PRODUCT_CATEGORIES.includes(p.product_category))).toBe(true)
    expect(transactions.every((t) => TRANSACTION_METHODS.includes(t.transaction_method))).toBe(true)
    expect(transactions.every((t) => TRANSACTION_TYPES.includes(t.transaction_type))).toBe(true)
  })

  it('stores dates as YYYY-MM-DD', () => {
    expect(transactions.every((t) => /^\d{4}-\d{2}-\d{2}$/.test(t.activity_date))).toBe(true)
  })
})
