/**
 * The dataset every selector reads. Selectors are pure functions of a
 * `Dataset`, plus thin exports bound to `dataset` (ADR 0004).
 */
import { portfolio, profiles, transactions } from '@/data'
import type { PortfolioItem, Profile, Transaction } from '@/types'

export interface Dataset {
  profiles: readonly Profile[]
  portfolio: readonly PortfolioItem[]
  transactions: readonly Transaction[]
}

/** The committed JSON from `src/data`. */
export const dataset: Dataset = { profiles, portfolio, transactions }
