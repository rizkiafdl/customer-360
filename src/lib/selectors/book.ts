/** Selectors over the whole book of customers. */
import { latestActivityDate, loanExposure } from '@/lib/domain'
import { evaluateCustomer, type CustomerEvaluation } from '@/lib/insights'
import type { PortfolioItem, Profile } from '@/types'
import { dataset, type Dataset } from './dataset'
import { groupByCustomer } from './grouping'

/** One customer as the worklist (F4) and the overview (F5) see it. */
export interface BookCustomer {
  profile: Profile
  portfolio: PortfolioItem[]
  evaluation: CustomerEvaluation
  /** LOAN total. Never added to `evaluation.aum`. */
  loanExposure: number
}

/** One entry per profile, in profile order, over the shared grouping. */
export function bookCustomersOf(data: Dataset): BookCustomer[] {
  return [...groupByCustomer(data).values()].map(({ profile, portfolio }) => ({
    profile,
    portfolio,
    evaluation: evaluateCustomer({ profile, portfolio }),
    loanExposure: loanExposure(portfolio),
  }))
}

export function customerCount(data: Dataset): number {
  return data.profiles.length
}

/** The as-of date for all recency values: the latest `activity_date` (ADR 0005). */
export function asOfDateOf(data: Dataset): string {
  return latestActivityDate(data.transactions)
}

export function getCustomerCount(): number {
  return customerCount(dataset)
}

/** Computed once at module load. `2024-04-26` for the committed data. */
export const asOfDate: string = asOfDateOf(dataset)
