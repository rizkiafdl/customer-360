/** Date helpers. All dates are `YYYY-MM-DD` strings and are read in UTC. */

const MS_PER_DAY = 24 * 60 * 60 * 1000
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

/** Milliseconds at UTC midnight. Throws a `RangeError` if `date` is not a real `YYYY-MM-DD` date. */
function utcMidnight(date: string): number {
  const match = ISO_DATE.exec(date)
  if (match) {
    const [, y, m, d] = match.map(Number) as [number, number, number, number]
    const ms = Date.UTC(y, m - 1, d)
    const parsed = new Date(ms)
    // Date.UTC rolls over invalid parts (Feb 30 becomes Mar 1); a round trip catches it.
    if (parsed.getUTCFullYear() === y && parsed.getUTCMonth() === m - 1 && parsed.getUTCDate() === d) {
      return ms
    }
  }
  throw new RangeError(`Not a YYYY-MM-DD date: ${JSON.stringify(date)}`)
}

/** Whole days from `date` to `asOf`. Negative when `date` is after `asOf`. */
export function daysSince(date: string, asOf: string): number {
  return (utcMidnight(asOf) - utcMidnight(date)) / MS_PER_DAY
}

/**
 * First day of the detail window for activity views. 87% of transactions
 * fall in March and April 2024 (product spec, section 3); the window runs
 * from here to the as-of date (ADR 0005).
 */
export const DETAIL_WINDOW_START = '2024-03-01'

function toIsoDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

/** The Monday that starts the ISO week of `date`. */
export function isoWeekStart(date: string): string {
  const ms = utcMidnight(date)
  const daysFromMonday = (new Date(ms).getUTCDay() + 6) % 7
  return toIsoDate(ms - daysFromMonday * MS_PER_DAY)
}

/**
 * Row count per ISO week (Monday start), for every week from the week of
 * `from` to the week of `to`, empty weeks included. Only rows with
 * `from <= activity_date <= to` count, so a first week that starts before
 * `from` holds only the days inside the range.
 */
export function weeklyCounts(
  rows: readonly { activity_date: string }[],
  from: string,
  to: string,
): { weekStart: string; count: number }[] {
  const counts = new Map<string, number>()
  for (let ms = utcMidnight(isoWeekStart(from)); ms <= utcMidnight(to); ms += 7 * MS_PER_DAY) {
    counts.set(toIsoDate(ms), 0)
  }
  for (const row of rows) {
    if (row.activity_date < from || row.activity_date > to) continue
    const week = isoWeekStart(row.activity_date)
    counts.set(week, (counts.get(week) ?? 0) + 1)
  }
  return [...counts].map(([weekStart, count]) => ({ weekStart, count }))
}

/** Rows dated before `date`: how many, and the earliest date (`null` when none). */
export function earlierRows(
  rows: readonly { activity_date: string }[],
  date: string,
): { count: number; earliest: string | null } {
  const earlier = rows.filter((row) => row.activity_date < date).map((row) => row.activity_date)
  return { count: earlier.length, earliest: earlier.length ? earlier.reduce((a, b) => (b < a ? b : a)) : null }
}
