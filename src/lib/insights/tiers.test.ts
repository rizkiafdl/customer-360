import { describe, expect, it } from 'vitest'
import { VALUE_TIERS, valueTier } from './tiers'

describe('VALUE_TIERS', () => {
  it('lists the tiers from lowest to highest', () => {
    expect(VALUE_TIERS).toEqual(['No AUM', 'Mass', 'Affluent', 'Priority'])
  })
})

describe('valueTier', () => {
  it.each([
    [0, 'No AUM'],
    [1, 'Mass'],
    [999_999_999, 'Mass'],
    [1_000_000_000, 'Affluent'],
    [4_999_999_999, 'Affluent'],
    [5_000_000_000, 'Priority'],
    [50_000_000_000, 'Priority'],
  ] as const)('AUM %d is %s', (aum, tier) => {
    expect(valueTier(aum)).toBe(tier)
  })

  it('throws a RangeError for a negative AUM, which has no tier', () => {
    expect(() => valueTier(-1)).toThrow(RangeError)
  })
})
