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
