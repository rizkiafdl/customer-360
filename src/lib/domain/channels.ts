/** Channel definitions (ADR 0006). */
import type { Transaction, TransactionMethod } from '@/types'
import { isCustomerInitiated } from './transactions'

/**
 * Methods that count as digital. User decision, 2026-11-23: cards count as
 * digital. Not digital: ATM, BRANCH, MERCHANT. The BANCA method is left out
 * of the share altogether (see `digitalShare`).
 */
export const DIGITAL_METHODS: readonly TransactionMethod[] = [
  'MOBILE BANKING',
  'INTERNET BANKING',
  'SMS BANKING',
  'QRIS',
  'VIRTUAL DEBIT CARD',
  'VELOCITY',
  'CREDIT CARD',
  'DEBIT CARD',
]

export function isDigital(method: TransactionMethod): boolean {
  return DIGITAL_METHODS.includes(method)
}

/**
 * The two counts behind `digitalShare`: digital rows, and all rows counted.
 * Counted = customer-initiated transactions with the BANCA method excluded:
 * 97 customers use it, also without a BANCA holding, so it says nothing
 * about channel preference (Part 2 analysis).
 */
export function digitalCounts(transactions: readonly Transaction[]): { digital: number; counted: number } {
  const counted = transactions.filter((t) => isCustomerInitiated(t) && t.transaction_method !== 'BANCA')
  return { digital: counted.filter((t) => isDigital(t.transaction_method)).length, counted: counted.length }
}

/** Digital count / counted (see `digitalCounts`). `null` when nothing is left to count. */
export function digitalShare(transactions: readonly Transaction[]): number | null {
  const { digital, counted } = digitalCounts(transactions)
  return counted === 0 ? null : digital / counted
}

export interface TopChannel {
  method: TransactionMethod
  /** Customer-initiated rows with this method. */
  count: number
  /** All customer-initiated rows. */
  total: number
}

/**
 * The method with the most customer-initiated rows (bank entries left out,
 * user decision 2026-11-24). A tie goes to the method name first in
 * alphabetical order. `null` when the customer has no customer-initiated row.
 */
export function topChannel(transactions: readonly Transaction[]): TopChannel | null {
  const rows = transactions.filter(isCustomerInitiated)
  const counts = new Map<TransactionMethod, number>()
  for (const t of rows) counts.set(t.transaction_method, (counts.get(t.transaction_method) ?? 0) + 1)
  const [top] = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  return top ? { method: top[0], count: top[1], total: rows.length } : null
}
