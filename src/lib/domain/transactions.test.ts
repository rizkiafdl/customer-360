import { describe, expect, it } from 'vitest'
import { TRANSACTION_TYPES, type Transaction, type TransactionType } from '@/types'
import {
  BANK_ENTRY_TYPES,
  isBankEntry,
  isCustomerInitiated,
  latestActivityDate,
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
