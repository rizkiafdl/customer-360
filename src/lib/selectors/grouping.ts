/** The one per-customer grouping that every selector builds on. */
import type { PortfolioItem, Profile, Transaction } from '@/types'
import type { Dataset } from './dataset'

/** One customer's profile and only that customer's rows. */
export interface CustomerRows {
  profile: Profile
  portfolio: PortfolioItem[]
  transactions: Transaction[]
}

/**
 * Rows per customer, built in one pass over each dataset. Keys are in
 * profile order. Rows keep their source order. A row whose customer has no
 * profile is dropped; the converter already rejects such rows.
 */
export function groupByCustomer(data: Dataset): Map<number, CustomerRows> {
  const rows = new Map<number, CustomerRows>()
  for (const profile of data.profiles) rows.set(profile.customer_id, { profile, portfolio: [], transactions: [] })
  for (const item of data.portfolio) rows.get(item.customer_id)?.portfolio.push(item)
  for (const trx of data.transactions) rows.get(trx.customer_id)?.transactions.push(trx)
  return rows
}
