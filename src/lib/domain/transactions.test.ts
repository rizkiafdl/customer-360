import { describe, expect, it } from 'vitest'
import { TRANSACTION_TYPES, type Transaction, type TransactionType } from '@/types'
import {
  BANK_ENTRY_TYPES,
  OTHER_LABEL,
  bankEntrySummary,
  countBy,
  firstActivityDate,
  isBankEntry,
  isCustomerInitiated,
  latestActivityDate,
  topWithOther,
} from './transactions'

function trx(transaction_type: TransactionType, activity_date = '2024-04-01'): Transaction {
  return {
    activity_date,
    customer_id: 1,
    transaction_method: 'MOBILE BANKING',
    transaction_type,
    transaction_amount: 1000,
  }
}

describe('BANK_ENTRY_TYPES', () => {
  it('is BUNGA, BIAYA, PAJAK, and DENDA', () => {
    expect([...BANK_ENTRY_TYPES].sort()).toEqual(['BIAYA', 'BUNGA', 'DENDA', 'PAJAK'])
  })
})

describe('isBankEntry and isCustomerInitiated', () => {
  it.each(['BUNGA', 'BIAYA', 'PAJAK', 'DENDA'] as const)('%s is a bank entry', (type) => {
    expect(isBankEntry(trx(type))).toBe(true)
    expect(isCustomerInitiated(trx(type))).toBe(false)
  })

  it('TRANSFER is customer-initiated', () => {
    expect(isBankEntry(trx('TRANSFER'))).toBe(false)
    expect(isCustomerInitiated(trx('TRANSFER'))).toBe(true)
  })

  it.each(TRANSACTION_TYPES)('exactly one is true for %s', (type) => {
    expect(isBankEntry(trx(type))).not.toBe(isCustomerInitiated(trx(type)))
  })
})

describe('latestActivityDate', () => {
  it('returns the latest date', () => {
    const rows = [trx('TRANSFER', '2024-03-01'), trx('TRANSFER', '2024-04-26'), trx('TRANSFER', '2011-01-27')]
    expect(latestActivityDate(rows)).toBe('2024-04-26')
  })

  it('throws a RangeError for no transactions', () => {
    expect(() => latestActivityDate([])).toThrow(RangeError)
  })
})

function row(
  transaction_type: TransactionType,
  transaction_method: Transaction['transaction_method'],
  transaction_amount = 1000,
): Transaction {
  return { activity_date: '2024-04-01', customer_id: 1, transaction_method, transaction_type, transaction_amount }
}

describe('countBy', () => {
  it('counts per key, most first, ties by name', () => {
    const rows = [row('TRANSFER', 'QRIS'), row('PAYMENT', 'ATM'), row('TRANSFER', 'ATM'), row('OTHERS', 'BRANCH')]
    expect(countBy(rows, (t) => t.transaction_method)).toEqual([
      { label: 'ATM', count: 2 },
      { label: 'BRANCH', count: 1 },
      { label: 'QRIS', count: 1 },
    ])
  })

  it('is empty for no rows', () => {
    expect(countBy([], (t: Transaction) => t.transaction_type)).toEqual([])
  })
})

describe('topWithOther', () => {
  const entries = [
    { label: 'A', count: 5 },
    { label: 'B', count: 4 },
    { label: 'C', count: 3 },
  ]

  it('keeps the first n and folds the rest into Other', () => {
    expect(topWithOther(entries, 2)).toEqual([
      { label: 'A', count: 5 },
      { label: 'B', count: 4 },
      { label: OTHER_LABEL, count: 3 },
    ])
  })

  it('has no Other when nothing is left over', () => {
    expect(topWithOther(entries, 3)).toEqual(entries)
  })

  it('names the bucket Other', () => {
    expect(OTHER_LABEL).toBe('Other')
  })
})

describe('bankEntrySummary', () => {
  it('gives count and amount per bank-entry type, in BANK_ENTRY_TYPES order', () => {
    const rows = [
      row('PAJAK', 'BRANCH', 20),
      row('BUNGA', 'BRANCH', 100),
      row('BUNGA', 'BRANCH', 50.5),
      row('TRANSFER', 'QRIS', 9999),
    ]
    expect(bankEntrySummary(rows)).toEqual([
      { type: 'BUNGA', count: 2, amount: 150.5 },
      { type: 'PAJAK', count: 1, amount: 20 },
    ])
  })

  it('is empty when there are no bank entries', () => {
    expect(bankEntrySummary([row('TRANSFER', 'QRIS')])).toEqual([])
  })
})

describe('firstActivityDate', () => {
  it('is the earliest date over all rows, bank entries included', () => {
    expect(firstActivityDate([trx('TRANSFER', '2024-04-01'), trx('BUNGA', '2011-01-27'), trx('TRANSFER', '2020-05-05')])).toBe(
      '2011-01-27',
    )
  })

  it('throws a RangeError on an empty array', () => {
    expect(() => firstActivityDate([])).toThrow(RangeError)
  })
})
