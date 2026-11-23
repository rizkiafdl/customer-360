import { describe, expect, it } from 'vitest'
import { RULE_ORDER } from '@/lib/insights'
import type { PortfolioItem } from '@/types'
import type { Dataset } from './dataset'
import {
  buildWorklist,
  filterWorklist,
  getWorklist,
  parseWorklistFilters,
  toIdQuery,
  worklistSummary,
  type WorklistFilters,
} from './worklist'

function item(
  customer_id: number,
  product_category: PortfolioItem['product_category'],
  amount: number,
  product = 'TABSYA',
): PortfolioItem {
  return { customer_id, product, product_category, amount }
}

/** Intl puts a no-break space (U+00A0) after "Rp"; tests write a plain space. */
const rp = (text: string) => text.replaceAll('Rp ', 'Rp ')

/**
 * - 10: KYC note, no fired rule (low income, AUM Rp 1,2 M in deposits, holds ORI, REKSA, BANCA).
 * - 20: 4 rules (cash-heavy, no REKSA, no ORI, no BANCA), plus a LOAN.
 * - 30: 1 rule (no ORI), AUM Rp 200 jt.
 * - 40: 1 rule (no AUM), no portfolio rows.
 * - 50: no rule, AUM Rp 50 jt (below the gap floor).
 */
const fixture: Dataset = {
  profiles: [
    { customer_id: 50, gender: 'F', customer_income: '>5 Juta - 10 Juta' },
    { customer_id: 40, gender: 'M', customer_income: 'sd. 1 Juta' },
    { customer_id: 30, gender: 'F', customer_income: '>5 Juta - 10 Juta' },
    { customer_id: 20, gender: 'M', customer_income: '>5 Juta - 10 Juta' },
    { customer_id: 10, gender: null, customer_income: 'sd. 1 Juta' },
  ],
  portfolio: [
    item(10, 'FUNDING', 1_200_000_000, 'DEPOSITO01'),
    item(10, 'ORI', 1, 'ORI'),
    item(10, 'REKSA', 1, 'REKSA'),
    item(10, 'BANCA', 1, 'BANCA'),
    item(20, 'FUNDING', 500_000_000),
    item(20, 'LOAN', 300_000_000, 'KPR'),
    item(30, 'FUNDING', 200_000_000, 'DEPOSITO01'),
    item(30, 'REKSA', 10, 'REKSA'),
    item(30, 'BANCA', 10, 'BANCA'),
    item(50, 'ORI', 50_000_000, 'ORI'),
  ],
  transactions: [],
}

const rows = buildWorklist(fixture)
const noFilters: WorklistFilters = { rule: null, q: null }

describe('buildWorklist', () => {
  it('orders rows by fired rules, then AUM, then customer_id, with rank 1..n', () => {
    expect(rows.map((r) => r.customerId)).toEqual([20, 30, 40, 10, 50])
    expect(rows.map((r) => r.rank)).toEqual([1, 2, 3, 4, 5])
  })

  it('links each row to the customer page', () => {
    expect(rows[0]?.href).toBe('/customers/20')
  })

  it('keeps AUM and loan exposure as two numbers', () => {
    expect(rows[0]).toMatchObject({ aum: 500_000_000, loanExposure: 300_000_000 })
  })

  it('lists the fired rules in RULE_ORDER, with the first one as the top reason', () => {
    expect(rows[0]).toMatchObject({
      firedCount: 4,
      ruleIds: ['cash-heavy', 'investment-gap-reksa', 'investment-gap-ori', 'investment-gap-banca'],
      topReason: rp('100% of AUM in cash. AUM Rp 500.000.000, cash Rp 500.000.000.'),
      topReasonOrder: 0,
    })
    expect(rows[1]).toMatchObject({
      topReason: rp('No ORI. AUM Rp 200.000.020.'),
      topReasonOrder: RULE_ORDER.indexOf('investment-gap-ori'),
    })
  })

  it('gives a customer with the KYC note and no fired rule no top reason and keeps its rank', () => {
    expect(rows[3]).toMatchObject({
      customerId: 10,
      rank: 4,
      firedCount: 0,
      ruleIds: [],
      topReason: null,
      topReasonOrder: null,
      kycNote: rp('Income band sd. 1 Juta. AUM Rp 1.200.000.003.'),
    })
  })

  it('has no KYC note for a customer without one', () => {
    expect(rows[0]?.kycNote).toBeNull()
  })
})

describe('toIdQuery', () => {
  it('keeps only the digits of what was typed or pasted', () => {
    expect(toIdQuery('44a 2')).toBe('442')
    expect(toIdQuery(' 4426 ')).toBe('4426')
    expect(toIdQuery('abc')).toBe('')
  })
})

describe('parseWorklistFilters', () => {
  it('reads a known rule and a digit-only ID', () => {
    expect(parseWorklistFilters(new URLSearchParams('rule=investment-gap-ori&q=44'))).toEqual({
      rule: 'investment-gap-ori',
      q: '44',
    })
  })

  it.each(['rule=nope', 'rule=INVESTMENT-GAP-ORI', 'q=12a', 'q=', 'rule=', ''])('ignores %j', (search) => {
    expect(parseWorklistFilters(new URLSearchParams(search))).toEqual(noFilters)
  })
})

describe('filterWorklist', () => {
  it('returns every row with no filter', () => {
    expect(filterWorklist(rows, noFilters)).toEqual(rows)
  })

  it('matches a rule at any position, not only the top reason', () => {
    const ids = filterWorklist(rows, { rule: 'investment-gap-ori', q: null }).map((r) => r.customerId)
    expect(ids).toEqual([20, 30])
  })

  it('matches the ID as text that contains q', () => {
    expect(filterWorklist(rows, { rule: null, q: '0' })).toHaveLength(5)
    expect(filterWorklist(rows, { rule: null, q: '3' }).map((r) => r.customerId)).toEqual([30])
  })

  it('combines the filters with AND', () => {
    expect(filterWorklist(rows, { rule: 'investment-gap-ori', q: '2' }).map((r) => r.customerId)).toEqual([20])
    expect(filterWorklist(rows, { rule: 'no-aum', q: '2' })).toEqual([])
  })
})

describe('worklistSummary', () => {
  it('counts the customers with no filter', () => {
    expect(worklistSummary(100, 100, noFilters)).toBe('100 customers.')
  })

  it('names the opportunity type with a rule filter', () => {
    expect(worklistSummary(37, 100, { rule: 'investment-gap-ori', q: null })).toBe(
      '37 of 100 customers. Opportunity: No ORI.',
    )
  })

  it('names the ID text with an ID filter', () => {
    expect(worklistSummary(2, 100, { rule: 'cash-heavy', q: '44' })).toBe(
      '2 of 100 customers. Opportunity: Cash-heavy AUM. ID contains 44.',
    )
  })

  it('says so when nothing matches', () => {
    expect(worklistSummary(0, 100, { rule: null, q: '999' })).toBe('No customers match these filters.')
  })
})

// Contract tests on the committed JSON (spec section 7).
describe('worklist on the real data', () => {
  const real = getWorklist()

  it('has 100 rows, first 8797 and last 7969', () => {
    expect(real).toHaveLength(100)
    expect(real[0]).toMatchObject({ customerId: 8797, firedCount: 4 })
    expect(real[99]).toMatchObject({ customerId: 7969, firedCount: 0, aum: 400_835_303 })
  })

  it('spreads the fired-rule counts 16 / 49 / 26 / 8 / 1', () => {
    const spread = [0, 1, 2, 3, 4].map((n) => real.filter((r) => r.firedCount === n).length)
    expect(spread).toEqual([16, 49, 26, 8, 1])
  })

  it('has the top reason counts per rule from spec section 7', () => {
    const count = (order: number | null) => real.filter((r) => r.topReasonOrder === order).length
    expect({
      cash: count(0),
      reksa: count(1),
      ori: count(2),
      banca: count(3),
      noAum: count(4),
      highIncome: count(5),
      none: count(null),
    }).toEqual({ cash: 12, reksa: 23, ori: 23, banca: 10, noAum: 16, highIncome: 0, none: 16 })
  })

  it('shows 37 customers for ?rule=investment-gap-ori', () => {
    const filters = parseWorklistFilters(new URLSearchParams('rule=investment-gap-ori'))
    expect(filterWorklist(real, filters)).toHaveLength(37)
  })

  it('gives 3569 (KYC note, no fired rule) no top reason', () => {
    expect(real.find((r) => r.customerId === 3569)).toMatchObject({ topReason: null })
    expect(real.find((r) => r.customerId === 3569)?.kycNote).not.toBeNull()
  })
})
