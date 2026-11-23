import { describe, expect, it } from 'vitest'
import { cashAmount, isCashProduct, isDepositProduct } from './cash'
import { row } from './test-fixtures'

describe('isDepositProduct and isCashProduct', () => {
  it.each(['DEPOSITO01', 'DEPO14H', 'DEPOHAR 21-31', 'DEPOSITO TREASURY NKK', 'DEPOSITO03SYA'])(
    'FUNDING %s is a deposit, not cash',
    (product) => {
      expect(isDepositProduct(row('FUNDING', 1, product))).toBe(true)
      expect(isCashProduct(row('FUNDING', 1, product))).toBe(false)
    },
  )

  it.each([
    'Tabungan TANDA & TABHAR',
    'TABSYA',
    'TANDA360',
    'TAB_MDHRBHSYA',
    'TAKA',
    'TAKABUNGA',
    'TAKASYA',
    'GIRO',
    'GIRO KND',
    'GIROSYARIAH',
    'MULTI CURRENCY',
    'MULTI CURRENCY SYA',
  ])('FUNDING %s is cash, not a deposit', (product) => {
    expect(isCashProduct(row('FUNDING', 1, product))).toBe(true)
    expect(isDepositProduct(row('FUNDING', 1, product))).toBe(false)
  })

  it('a FUNDING row with a null product is neither', () => {
    expect(isCashProduct(row('FUNDING', 1, null))).toBe(false)
    expect(isDepositProduct(row('FUNDING', 1, null))).toBe(false)
  })

  it('GIRO and MULTI CURRENCY under LOAN are not cash', () => {
    expect(isCashProduct(row('LOAN', 1, 'GIRO'))).toBe(false)
    expect(isCashProduct(row('LOAN', 1, 'MULTI CURRENCY'))).toBe(false)
  })

  it('rows outside FUNDING are neither', () => {
    expect(isCashProduct(row('REKSA', 1, 'REKSA'))).toBe(false)
    expect(isDepositProduct(row('ORI', 1, 'ORI'))).toBe(false)
  })
})

describe('cashAmount', () => {
  it('is 0 for no rows', () => {
    expect(cashAmount([])).toBe(0)
  })

  it('sums cash rows only, with null as 0', () => {
    const rows = [
      row('FUNDING', 100, 'TABSYA'),
      row('FUNDING', null, 'TAKA'),
      row('FUNDING', 50, 'DEPOSITO01'),
      row('FUNDING', 30, null),
      row('LOAN', 999, 'GIRO'),
      row('REKSA', 7, 'REKSA'),
    ]
    expect(cashAmount(rows)).toBe(100)
  })
})
