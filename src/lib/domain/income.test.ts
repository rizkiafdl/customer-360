import { describe, expect, it } from 'vitest'
import { INCOME_BANDS } from '@/types'
import { HIGH_INCOME_MIN_RANK, incomeRank, isHighIncome } from './income'

describe('incomeRank', () => {
  it('is 1 for the lowest band and 8 for the highest', () => {
    expect(incomeRank('sd. 1 Juta')).toBe(1)
    expect(incomeRank('>100 Juta')).toBe(8)
  })

  it('follows the order of INCOME_BANDS', () => {
    expect(INCOME_BANDS.map(incomeRank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
  })
})

describe('isHighIncome', () => {
  it('uses rank 5 as the floor', () => {
    expect(HIGH_INCOME_MIN_RANK).toBe(5)
  })

  it('is false just below the floor', () => {
    expect(isHighIncome('>5 Juta - 10 Juta')).toBe(false)
  })

  it('is true at the floor', () => {
    expect(isHighIncome('>10 Juta - 25 Juta')).toBe(true)
  })
})
