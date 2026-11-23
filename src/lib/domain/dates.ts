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
