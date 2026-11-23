import { describe, expect, it } from 'vitest'
import { DETAIL_WINDOW_START, daysSince, earlierRows, isoWeekStart, weeklyCounts } from './dates'

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

describe('DETAIL_WINDOW_START', () => {
  it('is 2024-03-01, where 87% of the rows start', () => {
    expect(DETAIL_WINDOW_START).toBe('2024-03-01')
  })
})

describe('isoWeekStart', () => {
  it('is the Monday of a week that crosses a month', () => {
    expect(isoWeekStart('2024-03-01')).toBe('2024-02-26')
    expect(isoWeekStart('2024-02-29')).toBe('2024-02-26')
  })

  it('maps a Sunday to the Monday before it', () => {
    expect(isoWeekStart('2024-03-31')).toBe('2024-03-25')
  })

  it('maps a Monday to itself', () => {
    expect(isoWeekStart('2024-04-01')).toBe('2024-04-01')
  })

  it('crosses a year end', () => {
    expect(isoWeekStart('2025-01-01')).toBe('2024-12-30')
  })
})

describe('weeklyCounts', () => {
  const at = (activity_date: string) => ({ activity_date })

  it('has one bucket per week from the first to the last week, empty weeks kept', () => {
    const rows = [at('2024-03-01'), at('2024-03-03'), at('2024-03-20')]
    expect(weeklyCounts(rows, '2024-03-01', '2024-03-20')).toEqual([
      { weekStart: '2024-02-26', count: 2 },
      { weekStart: '2024-03-04', count: 0 },
      { weekStart: '2024-03-11', count: 0 },
      { weekStart: '2024-03-18', count: 1 },
    ])
  })

  it('counts only rows inside from..to, also in a partial first week', () => {
    const rows = [at('2024-02-27'), at('2024-03-01'), at('2024-03-05')]
    expect(weeklyCounts(rows, '2024-03-01', '2024-03-03')).toEqual([{ weekStart: '2024-02-26', count: 1 }])
  })
})

describe('earlierRows', () => {
  const at = (activity_date: string) => ({ activity_date })

  it('counts rows before the date and gives the earliest one', () => {
    expect(earlierRows([at('2024-03-01'), at('2023-05-02'), at('2011-01-27')], '2024-03-01')).toEqual({
      count: 2,
      earliest: '2011-01-27',
    })
  })

  it('is 0 and null when no row is earlier', () => {
    expect(earlierRows([at('2024-03-01')], '2024-03-01')).toEqual({ count: 0, earliest: null })
  })
})
