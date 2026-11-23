/** Values seen in the `gender` column of the `profile` sheet. */
export const GENDERS = ['M', 'F'] as const
export type Gender = (typeof GENDERS)[number]

/** Monthly income bands from the `customer_income` column, lowest to highest. */
export const INCOME_BANDS = [
  'sd. 1 Juta',
  '>1 Juta - 3 Juta',
  '>3 Juta - 5 Juta',
  '>5 Juta - 10 Juta',
  '>10 Juta - 25 Juta',
  '>25 Juta - 50 Juta',
  '>50 Juta - 100 Juta',
  '>100 Juta',
] as const
export type IncomeBand = (typeof INCOME_BANDS)[number]

/** One row of `src/data/profiles.json` (source sheet: `profile`). */
export interface Profile {
  customer_id: number
  /** `null` when the source cell is empty (1 row in the raw data). */
  gender: Gender | null
  customer_income: IncomeBand
}
