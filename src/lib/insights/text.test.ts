import { describe, expect, it } from 'vitest'
import { formatSharePercent, formatWholePercent, incomeBandAtRank } from './text'

describe('formatWholePercent', () => {
  it.each([
    [80, 100, '80%'],
    [57, 100, '57%'], // 0.57 * 100 is 56.99... in floating point; the helper must not show 56%
    [2, 3, '66%'],
    [999, 1000, '99%'],
    [1, 1, '100%'],
    [0, 5, '0%'],
    [1_273_464_000, 1_384_200_000, '92%'],
  ])('%d of %d is %s, rounded down', (part, whole, text) => {
    expect(formatWholePercent(part, whole)).toBe(text)
  })

  it('throws a RangeError when the whole is not above 0', () => {
    expect(() => formatWholePercent(1, 0)).toThrow(RangeError)
  })
})

describe('formatSharePercent', () => {
  it.each([
    [0.8, '80%'],
    [0.57, '57%'], // 0.57 * 100 is 56.99999999999999 in floating point
    [0.29, '29%'], // 0.29 * 100 is 28.999999999999996 in floating point
  ])('share %d is %s', (share, text) => {
    expect(formatSharePercent(share)).toBe(text)
  })
})

describe('incomeBandAtRank', () => {
  it('returns the band for a rank', () => {
    expect(incomeBandAtRank(1)).toBe('sd. 1 Juta')
    expect(incomeBandAtRank(3)).toBe('>3 Juta - 5 Juta')
    expect(incomeBandAtRank(5)).toBe('>10 Juta - 25 Juta')
  })

  it('throws a RangeError for a rank outside 1 to 8', () => {
    expect(() => incomeBandAtRank(0)).toThrow(RangeError)
    expect(() => incomeBandAtRank(9)).toThrow(RangeError)
  })
})
