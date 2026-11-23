import { describe, expect, it } from 'vitest'
import { KYC_NOTE, kycIncomeBandNote } from './kyc'
import { customer, row, rp } from './test-fixtures'

describe('kycIncomeBandNote', () => {
  it('has the note text with both thresholds', () => {
    expect(kycIncomeBandNote(customer([])).ruleText).toBe(
      rp('Income band >3 Juta - 5 Juta or below, and AUM is Rp 1.000.000.000 or more.'),
    )
  })

  it('fires at income rank 3 and AUM exactly Rp 1.000.000.000, with the exact text', () => {
    const result = kycIncomeBandNote(customer([row('FUNDING', 1_000_000_000)], '>3 Juta - 5 Juta'))
    expect(result.id).toBe('kyc-income-band')
    expect(result.fired).toBe(true)
    expect(result.reason).toBe(rp('Income band >3 Juta - 5 Juta. AUM Rp 1.000.000.000.'))
    expect(result.evidence).toEqual({ aum: 1_000_000_000, incomeBand: '>3 Juta - 5 Juta' })
  })

  it('fires at income rank 1', () => {
    expect(kycIncomeBandNote(customer([row('ORI', 2_000_000_000, 'ORI')], 'sd. 1 Juta')).fired).toBe(true)
  })

  it('does not fire at income rank 4', () => {
    expect(kycIncomeBandNote(customer([row('FUNDING', 5_000_000_000)], '>5 Juta - 10 Juta')).fired).toBe(false)
  })

  it('does not fire just below Rp 1.000.000.000', () => {
    const result = kycIncomeBandNote(customer([row('FUNDING', 999_999_999)], 'sd. 1 Juta'))
    expect(result.fired).toBe(false)
    expect(result.reason).toBeNull()
  })

  it('does not fire for no portfolio rows or AUM 0', () => {
    expect(kycIncomeBandNote(customer([], 'sd. 1 Juta')).fired).toBe(false)
    expect(kycIncomeBandNote(customer([row('LOAN', 9_000_000_000, 'KPR')], 'sd. 1 Juta')).fired).toBe(false)
  })

  it('counts a null amount as 0 and keeps a null-product FUNDING row in AUM', () => {
    const rows = [row('FUNDING', null), row('FUNDING', 1_000_000_000, null)]
    expect(kycIncomeBandNote(customer(rows, 'sd. 1 Juta')).fired).toBe(true)
  })
})

describe('KYC_NOTE', () => {
  it('names the note and its source', () => {
    expect(KYC_NOTE.id).toBe('kyc-income-band')
    expect(KYC_NOTE.label).toBe('KYC income band')
    expect(KYC_NOTE.source).toBe('User decision, 2026-11-23.')
  })
})
