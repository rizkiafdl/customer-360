/** Text helpers for the fixed templates. Money goes through `formatIDR()`, not here. */
import { INCOME_BANDS, type IncomeBand } from '@/types'

/**
 * `part / whole` as a whole percent, rounded down, e.g. `92%`. Rounding
 * down means a reason never shows more than the data holds. Computed as
 * `part * 100 / whole` so `57 / 100` gives `57%`, not `56%`.
 */
export function formatWholePercent(part: number, whole: number): string {
  if (!(whole > 0)) throw new RangeError(`A percent needs a whole above 0, got ${whole}`)
  return `${Math.floor((part * 100) / whole)}%`
}

/** The income band at a rank (1 = `sd. 1 Juta`, 8 = `>100 Juta`). */
export function incomeBandAtRank(rank: number): IncomeBand {
  const band = INCOME_BANDS[rank - 1]
  if (band === undefined) throw new RangeError(`No income band at rank ${rank}`)
  return band
}
