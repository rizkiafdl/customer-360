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

export interface LabelCount {
  label: string
  count: number
}

/** Row count per key, most first; ties sort by label. */
export function countBy<T>(rows: readonly T[], key: (row: T) => string): LabelCount[] {
  const counts = new Map<string, number>()
  for (const row of rows) {
    const k = key(row)
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  return [...counts]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}

/** Label of the bucket that holds every entry after the first n. */
export const OTHER_LABEL = 'Other'

/** The first `n` entries, plus one `Other` entry with the rest when any are left. */
export function topWithOther(entries: readonly LabelCount[], n: number): LabelCount[] {
  const rest = entries.slice(n).reduce((sum, e) => sum + e.count, 0)
  const top = entries.slice(0, n)
  return rest > 0 ? [...top, { label: OTHER_LABEL, count: rest }] : top
}

export interface BankEntryTotal {
  type: TransactionType
  count: number
  /** Sum of `transaction_amount`: volume per type, not a flow (ADR 0006). */
  amount: number
}

/** Count and amount per bank-entry type, in `BANK_ENTRY_TYPES` order. Types with no rows are left out. */
export function bankEntrySummary(transactions: readonly Transaction[]): BankEntryTotal[] {
  return BANK_ENTRY_TYPES.map((type) => {
    const rows = transactions.filter((t) => t.transaction_type === type)
    return { type, count: rows.length, amount: rows.reduce((sum, t) => sum + t.transaction_amount, 0) }
  }).filter((total) => total.count > 0)
}
