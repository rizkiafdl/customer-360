/** Income definitions reused from Part 2 (ADR 0006). */
import { INCOME_BANDS, type IncomeBand } from '@/types'

/** High income starts at rank 5, `>10 Juta - 25 Juta` per month. */
export const HIGH_INCOME_MIN_RANK = 5

/** 1 for `sd. 1 Juta` up to 8 for `>100 Juta`, the order of `INCOME_BANDS`. */
export function incomeRank(band: IncomeBand): number {
  return INCOME_BANDS.indexOf(band) + 1
}

export function isHighIncome(band: IncomeBand): boolean {
  return incomeRank(band) >= HIGH_INCOME_MIN_RANK
}
