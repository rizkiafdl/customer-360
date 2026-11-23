import { describe, expect, it } from 'vitest'
import { daysSince } from './dates'

describe('daysSince', () => {
  it('counts whole days to the as-of date', () => {
    expect(daysSince('2024-04-19', '2024-04-26')).toBe(7)
  })

  it('is 0 on the as-of date', () => {
    expect(daysSince('2024-04-26', '2024-04-26')).toBe(0)
  })

  it('crosses a leap day', () => {
    expect(daysSince('2024-02-28', '2024-03-01')).toBe(2)
  })

  it('crosses a daylight-saving change in March without a fraction', () => {
    expect(daysSince('2024-03-01', '2024-04-26')).toBe(56)
  })

  it('is negative for a date after the as-of date', () => {
    expect(daysSince('2024-04-27', '2024-04-26')).toBe(-1)
  })

  it.each(['2024-02-30', '2024-4-1', '2024-13-01', '', 'not a date', '2024-04-26T00:00'])(
    'throws a RangeError for %j',
    (bad) => {
      expect(() => daysSince(bad, '2024-04-26')).toThrow(RangeError)
      expect(() => daysSince('2024-04-26', bad)).toThrow(RangeError)
    },
  )
})
