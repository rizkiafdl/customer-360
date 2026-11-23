import { describe, expect, it } from 'vitest'
import type { PortfolioItem } from '@/types'
import type { Dataset } from './dataset'
import {
  customerEvaluations,
  customerInputsOf,
  evaluationsOf,
  getCustomerEvaluation,
  getKycNoteCount,
  getRuleFireCounts,
  kycNoteCount,
  ruleFireCounts,
} from './insights'

function item(
  customer_id: number,
  product_category: PortfolioItem['product_category'],
  amount: number,
  product = 'TABSYA',
): PortfolioItem {
  return { customer_id, product, product_category, amount }
}

const fixture: Dataset = {
  profiles: [
    { customer_id: 1, gender: 'F', customer_income: 'sd. 1 Juta' },
    { customer_id: 2, gender: 'M', customer_income: '>100 Juta' },
    { customer_id: 3, gender: null, customer_income: '>5 Juta - 10 Juta' },
  ],
  portfolio: [
    item(1, 'FUNDING', 1_500_000_000, 'DEPOSITO01'),
    item(2, 'FUNDING', 6_000_000_000),
    item(1, 'ORI', 10, 'ORI'),
    item(2, 'BANCA', 1, 'BANCA'),
  ],
  transactions: [],
}

describe('customerInputsOf', () => {
  it('gives each profile its own rows, in profile order', () => {
    const inputs = customerInputsOf(fixture)
    expect(inputs.map((input) => input.profile.customer_id)).toEqual([1, 2, 3])
    expect(inputs[0]?.portfolio).toHaveLength(2)
    expect(inputs[0]?.portfolio.every((row) => row.customer_id === 1)).toBe(true)
    expect(inputs[2]?.portfolio).toEqual([])
  })
})

describe('counts over evaluations', () => {
  const evaluations = evaluationsOf(fixture)

  it('counts each rule, with 0 for rules that never fire', () => {
    expect(ruleFireCounts(evaluations)).toEqual({
      'cash-heavy': 1,
      'investment-gap-reksa': 2,
      'investment-gap-ori': 1,
      'investment-gap-banca': 1,
      'no-aum': 1,
      'high-income-no-banca': 0,
    })
  })

  it('counts the KYC note', () => {
    expect(kycNoteCount(evaluations)).toBe(1)
  })
})

// Contract tests on the committed JSON (spec section 5, ADR 0008).
// Counts measured on 2026-11-23. A change here is a change to the spec and the ADR.
describe('insight selectors on the real data', () => {
  it('evaluates every customer', () => {
    expect(customerEvaluations).toHaveLength(100)
  })

  it('pins the fire count of every rule', () => {
    expect(getRuleFireCounts()).toEqual({
      'cash-heavy': 12,
      'investment-gap-reksa': 29,
      'investment-gap-ori': 37,
      'investment-gap-banca': 29,
      'no-aum': 16,
      'high-income-no-banca': 6,
    })
  })

  it('pins the KYC note count', () => {
    expect(getKycNoteCount()).toBe(43)
  })

  it('finds one customer by id, and nothing for an unknown id', () => {
    expect(getCustomerEvaluation(4857)?.customer_id).toBe(4857)
    expect(getCustomerEvaluation(-1)).toBeUndefined()
  })
})
