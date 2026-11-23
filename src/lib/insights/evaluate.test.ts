import { describe, expect, expectTypeOf, it } from 'vitest'
import { evaluateCustomer } from './evaluate'
import { customer, row, rp } from './test-fixtures'
import type { FiredInsight, RuleId } from './types'

describe('evaluateCustomer', () => {
  it('returns fired rules in RULE_ORDER, with the AUM', () => {
    const result = evaluateCustomer(customer([row('FUNDING', 2_000_000_000, 'TABSYA')], '>100 Juta'))
    expect(result.customer_id).toBe(1)
    expect(result.aum).toBe(2_000_000_000)
    expect(result.insights.map((insight) => insight.id)).toEqual([
      'cash-heavy',
      'investment-gap-reksa',
      'investment-gap-ori',
      'investment-gap-banca',
      'high-income-no-banca',
    ])
    expect(result.insights.every((insight) => insight.fired)).toBe(true)
    expect(result.insights[0]?.reason).toBe(
      rp('100% of AUM in cash. AUM Rp 2.000.000.000, cash Rp 2.000.000.000.'),
    )
    expect(result.kycNote).toBeNull()
  })

  it('keeps the KYC note apart from the rules', () => {
    const rows = [
      row('FUNDING', 1_000_000_000, 'DEPOSITO01'),
      row('ORI', 1, 'ORI'),
      row('REKSA', 1, 'REKSA'),
      row('BANCA', 1, 'BANCA'),
    ]
    const result = evaluateCustomer(customer(rows, 'sd. 1 Juta'))
    expect(result.insights).toEqual([])
    expect(result.kycNote?.id).toBe('kyc-income-band')
    expect(result.kycNote?.reason).toBe(rp('Income band sd. 1 Juta. AUM Rp 1.000.000.003.'))
  })

  it('fires no AUM for a customer with no portfolio rows', () => {
    const result = evaluateCustomer(customer([]))
    expect(result.aum).toBe(0)
    expect(result.insights.map((insight) => insight.id)).toEqual(['no-aum'])
    expect(result.kycNote).toBeNull()
  })

  it('puts no AUM before high income without BANCA', () => {
    const result = evaluateCustomer(customer([], '>50 Juta - 100 Juta'))
    expect(result.insights.map((insight) => insight.id)).toEqual(['no-aum', 'high-income-no-banca'])
  })
})

describe('CustomerEvaluation.insights', () => {
  it('is read-only, so no caller can reorder the shared top reason', () => {
    const result = evaluateCustomer(customer([]))
    expectTypeOf(result.insights).toEqualTypeOf<readonly FiredInsight<RuleId>[]>()
  })
})
