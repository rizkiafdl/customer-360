import { describe, expect, it } from 'vitest'
import { formatDate, formatDayMonth, formatIDR, formatIDRShort, formatMonthYear, formatPercent } from './format'

// Intl puts a no-break space (U+00A0) between "Rp" and the number.
const rp = (s: string) => s.replace(' ', ' ')

describe('formatIDR', () => {
  it('formats whole amounts with dot thousand separators and no decimals', () => {
    expect(formatIDR(1_500_000)).toBe(rp('Rp 1.500.000'))
    expect(formatIDR(241_137_116_476)).toBe(rp('Rp 241.137.116.476'))
  })

  it('keeps up to 2 decimals with a comma separator', () => {
    expect(formatIDR(7.9)).toBe(rp('Rp 7,9'))
    expect(formatIDR(928_000.39)).toBe(rp('Rp 928.000,39'))
  })

  it('formats negative amounts with a leading minus', () => {
    expect(formatIDR(-198_336_530)).toBe(rp('-Rp 198.336.530'))
  })

  it('formats zero and negative zero the same way', () => {
    expect(formatIDR(0)).toBe(rp('Rp 0'))
    expect(formatIDR(-0)).toBe(rp('Rp 0'))
  })
})

// Short form: every space is a no-break space, so "Rp 1,2 M" never wraps.
const nb = (s: string) => s.replaceAll(' ', '\u00a0')

describe('formatIDRShort', () => {
  it.each([
    [350_000_000, 'Rp 350 jt'],
    [1_200_000_000, 'Rp 1,2 M'],
    [811_749_876_893, 'Rp 811,7 M'],
    [1_500, 'Rp 1,5 rb'],
    [1_000, 'Rp 1 rb'],
    [23_800_000, 'Rp 23,8 jt'],
    [2_000_000_000_000, 'Rp 2 T'],
  ])('formats %d as %s', (amount, expected) => {
    expect(formatIDRShort(amount)).toBe(nb(expected))
  })

  it('drops a trailing ,0', () => {
    expect(formatIDRShort(5_000_000)).toBe(nb('Rp 5 jt'))
    expect(formatIDRShort(5_040_000)).toBe(nb('Rp 5 jt'))
  })

  it('uses the full form below 1,000', () => {
    expect(formatIDRShort(999)).toBe(nb('Rp 999'))
    expect(formatIDRShort(7.9)).toBe(nb('Rp 7,9'))
  })

  it('moves up a unit when rounding reaches 1,000 of a unit', () => {
    expect(formatIDRShort(999_960_000)).toBe(nb('Rp 1 M'))
    expect(formatIDRShort(999_950)).toBe(nb('Rp 1 jt'))
    expect(formatIDRShort(999_940)).toBe(nb('Rp 999,9 rb'))
  })

  it('keeps the sign of a negative amount', () => {
    expect(formatIDRShort(-1_200_000)).toBe(nb('-Rp 1,2 jt'))
    expect(formatIDRShort(-500)).toBe(nb('-Rp 500'))
  })

  it('shows 0 and -0 as Rp 0', () => {
    expect(formatIDRShort(0)).toBe(nb('Rp 0'))
    expect(formatIDRShort(-0)).toBe(nb('Rp 0'))
  })
})

describe('formatDate and formatDayMonth', () => {
  it('writes a day, a short English month, and the year', () => {
    expect(formatDate('2024-04-26')).toBe('26 Apr 2024')
    expect(formatDate('2011-01-07')).toBe('7 Jan 2011')
  })

  it('writes a day and a month without the year', () => {
    expect(formatDayMonth('2024-02-26')).toBe('26 Feb')
  })

  it.each(['2024-4-26', '2024-13-01', 'x'])('throws a RangeError for %j', (bad) => {
    expect(() => formatDate(bad)).toThrow(RangeError)
  })
})

describe('formatPercent', () => {
  it('rounds a share to a whole percent', () => {
    expect(formatPercent(0.784)).toBe('78%')
    expect(formatPercent(0.625)).toBe('63%')
    expect(formatPercent(1)).toBe('100%')
    expect(formatPercent(0)).toBe('0%')
  })
})

describe('formatMonthYear', () => {
  it('shows the month name and the year', () => {
    expect(formatMonthYear('2014-07-03')).toBe('Jul 2014')
  })

  it('rejects a value that is not a YYYY-MM-DD date', () => {
    expect(() => formatMonthYear('2014-13-01')).toThrow(RangeError)
  })
})
