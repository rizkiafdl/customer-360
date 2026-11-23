/** Value tier by AUM, a classification used to filter and rank (ADR 0008). */
import { AFFLUENT_MIN_AUM, PRIORITY_MIN_AUM } from './thresholds'

/** Tiers from lowest to highest. */
export const VALUE_TIERS = ['No AUM', 'Mass', 'Affluent', 'Priority'] as const
export type ValueTier = (typeof VALUE_TIERS)[number]

/**
 * No AUM = 0; Mass below Rp 1 Bn; Affluent from Rp 1 Bn to below Rp 5 Bn;
 * Priority from Rp 5 Bn. Throws a `RangeError` for a negative AUM: the data
 * has none, and no tier is defined for it.
 */
export function valueTier(aum: number): ValueTier {
  if (aum < 0) throw new RangeError(`No value tier for a negative AUM: ${aum}`)
  if (aum === 0) return 'No AUM'
  if (aum < AFFLUENT_MIN_AUM) return 'Mass'
  if (aum < PRIORITY_MIN_AUM) return 'Affluent'
  return 'Priority'
}
