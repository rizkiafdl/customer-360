import { describe, expect, it } from 'vitest'
import {
  AFFLUENT_MIN_AUM,
  CASH_HEAVY_MIN_SHARE,
  DEPOSIT_PRODUCT_PREFIX,
  INVESTMENT_GAP_MIN_AUM,
  KYC_NOTE_MAX_INCOME_RANK,
  KYC_NOTE_MIN_AUM,
  PRIORITY_MIN_AUM,
} from './thresholds'

// Pins every value to the user decisions of 2026-11-23 (spec section 4, ADR 0008).
// A change here must also change the spec, the ADR, and the contract tests.
describe('thresholds', () => {
  it('has the tier edges', () => {
    expect(AFFLUENT_MIN_AUM).toBe(1_000_000_000)
    expect(PRIORITY_MIN_AUM).toBe(5_000_000_000)
  })

  it('has the cash-heavy cut-off and the deposit prefix', () => {
    expect(CASH_HEAVY_MIN_SHARE).toBe(0.8)
    expect(DEPOSIT_PRODUCT_PREFIX).toBe('DEPO')
  })

  it('has the investment gap AUM floor', () => {
    expect(INVESTMENT_GAP_MIN_AUM).toBe(100_000_000)
  })

  it('has the KYC note limits', () => {
    expect(KYC_NOTE_MAX_INCOME_RANK).toBe(3)
    expect(KYC_NOTE_MIN_AUM).toBe(1_000_000_000)
  })
})
