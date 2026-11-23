/** Transaction definitions (ADR 0006) and the as-of date (ADR 0005). */
import type { Transaction, TransactionType } from '@/types'

/** Types posted by the bank, not made by the customer. */
export const BANK_ENTRY_TYPES: readonly TransactionType[] = ['BUNGA', 'BIAYA', 'PAJAK', 'DENDA']

export function isBankEntry(trx: Transaction): boolean {
  return BANK_ENTRY_TYPES.includes(trx.transaction_type)
}

/** Every transaction that is not a bank entry. */
export function isCustomerInitiated(trx: Transaction): boolean {
  return !isBankEntry(trx)
}

/**
 * The latest `activity_date`. `YYYY-MM-DD` strings compare in date order.
 * Throws a `RangeError` on an empty array: there is then no as-of date.
 */
export function latestActivityDate(transactions: readonly Transaction[]): string {
  if (transactions.length === 0) throw new RangeError('No transactions, so no as-of date.')
  return transactions.reduce(
    (latest, trx) => (trx.activity_date > latest ? trx.activity_date : latest),
    '',
  )
}
