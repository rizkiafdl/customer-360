/** Selectors over the whole book of customers. */
import { daysSince, firstActivityDate, isCustomerInitiated, latestActivityDate, loanExposure } from '@/lib/domain'
import { cashAmount, evaluateCustomer, type CustomerEvaluation } from '@/lib/insights'
import type { Transaction } from '@/types'
import type { PortfolioItem, Profile } from '@/types'
import { dataset, type Dataset } from './dataset'
import { groupByCustomer } from './grouping'

/** One customer as the Customers list and the Portfolio page see it. */
export interface BookCustomer {
  profile: Profile
  portfolio: PortfolioItem[]
  evaluation: CustomerEvaluation
  /** LOAN total. Never added to `evaluation.aum`. */
  loanExposure: number
  /** The latest customer-initiated row and its days before the book as-of date; `null` with no such row. */
  lastActive: { days: number; date: string } | null
  /** The earliest row, bank entries included (`YYYY-MM-DD`); `null` with no rows. */
  firstTransaction: string | null
  /** Cash amount (`cashAmount`), the basis of the cash-heavy rule. */
  cash: number
}

function lastActiveOf(transactions: readonly Transaction[], asOf: string | null): BookCustomer['lastActive'] {
  const initiated = transactions.filter(isCustomerInitiated)
  if (asOf === null || initiated.length === 0) return null
  const date = latestActivityDate(initiated)
  return { days: daysSince(date, asOf), date }
}

/**
 * One entry per profile, in profile order, over the shared grouping. Recency
 * is measured against the as-of date of the whole dataset (ADR 0005).
 */
export function bookCustomersOf(data: Dataset): BookCustomer[] {
  const asOf = data.transactions.length > 0 ? asOfDateOf(data) : null
  return [...groupByCustomer(data).values()].map(({ profile, portfolio, transactions }) => ({
    profile,
    portfolio,
    evaluation: evaluateCustomer({ profile, portfolio }),
    loanExposure: loanExposure(portfolio),
    lastActive: lastActiveOf(transactions, asOf),
    firstTransaction: transactions.length > 0 ? firstActivityDate(transactions) : null,
    cash: cashAmount(portfolio),
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
