import { describe, expect, it } from 'vitest'
import {
  TRANSACTION_METHODS,
  type Transaction,
  type TransactionMethod,
  type TransactionType,
} from '@/types'
import { DIGITAL_METHODS, digitalShare, isDigital } from './channels'

function trx(transaction_method: TransactionMethod, transaction_type: TransactionType = 'TRANSFER'): Transaction {
  return {
    activity_date: '2024-04-01',
    customer_id: 1,
    transaction_method,
    transaction_type,
    transaction_amount: 1000,
  }
}

describe('DIGITAL_METHODS', () => {
  it('is the user list of 2026-11-23, cards included', () => {
    expect([...DIGITAL_METHODS].sort()).toEqual([
      'CREDIT CARD',
      'DEBIT CARD',
      'INTERNET BANKING',
      'MOBILE BANKING',
      'QRIS',
      'SMS BANKING',
      'VELOCITY',
      'VIRTUAL DEBIT CARD',
    ])
  })

  it.each(['ATM', 'BRANCH', 'MERCHANT', 'BANCA'] as const)('%s is not digital', (method) => {
    expect(isDigital(method)).toBe(false)
  })

  it('covers only known methods', () => {
    for (const method of DIGITAL_METHODS) expect(TRANSACTION_METHODS).toContain(method)
  })
})

describe('digitalShare', () => {
  it('is null when there is nothing to count', () => {
    expect(digitalShare([])).toBeNull()
  })

  it('is digital count over customer-initiated count', () => {
    expect(digitalShare([trx('MOBILE BANKING'), trx('QRIS'), trx('ATM'), trx('BRANCH')])).toBe(0.5)
  })

  it('leaves out bank entries', () => {
    expect(digitalShare([trx('MOBILE BANKING'), trx('ATM', 'BIAYA'), trx('BRANCH', 'BUNGA')])).toBe(1)
  })

  it('leaves out the BANCA method', () => {
    expect(digitalShare([trx('ATM'), trx('BANCA'), trx('BANCA')])).toBe(0)
  })

  it('is null when only bank entries and BANCA rows exist', () => {
    expect(digitalShare([trx('BANCA'), trx('ATM', 'PAJAK')])).toBeNull()
  })
})
