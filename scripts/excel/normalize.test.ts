import { describe, expect, it } from 'vitest'
import {
  IngestError,
  SHEET_HEADERS,
  assertReferentialIntegrity,
  cellValue,
  parseDate,
  parseEnum,
  parseId,
  parseNullableNumber,
  parseText,
  readTable,
  toPortfolioItem,
  toProfile,
  toTransaction,
  type RawRow,
} from './normalize.ts'

const row = (rowNumber: number, ...values: unknown[]): RawRow => ({ rowNumber, values })

describe('cellValue', () => {
  it('unwraps formula results and rich text', () => {
    expect(cellValue({ formula: 'A1*2', result: 42 })).toBe(42)
    expect(cellValue({ richText: [{ text: 'GI' }, { text: 'RO' }] })).toBe('GIRO')
    expect(cellValue(undefined)).toBeNull()
  })
})

describe('readTable', () => {
  it('skips fully empty rows and keys cells by header', () => {
    const rows = [
      row(1, 'customer_id', 'gender', 'customer_income'),
      row(2, 1041, 'M', '>3 Juta - 5 Juta'),
      row(3, null, '  ', null),
      row(4, 1047, 'F', '>1 Juta - 3 Juta'),
    ]
    const table = readTable('profile', rows, SHEET_HEADERS.profile)
    expect(table.map((r) => r.rowNumber)).toEqual([2, 4])
    expect(table[0]?.cells).toEqual({ customer_id: 1041, gender: 'M', customer_income: '>3 Juta - 5 Juta' })
  })

  it('rejects an unexpected header', () => {
    expect(() => readTable('profile', [row(1, 'id', 'gender', 'income')], SHEET_HEADERS.profile)).toThrow(
      IngestError,
    )
  })

  it('rejects an empty sheet', () => {
    expect(() => readTable('profile', [], SHEET_HEADERS.profile)).toThrow(/sheet is empty/)
  })
})

describe('field parsers', () => {
  it('parseId accepts positive integers only', () => {
    expect(parseId(65, 'x')).toBe(65)
    expect(() => parseId('65', 'x')).toThrow(IngestError)
    expect(() => parseId(6.5, 'x')).toThrow(IngestError)
    expect(() => parseId(null, 'x')).toThrow(IngestError)
  })

  it('parseText trims and maps blanks to null', () => {
    expect(parseText('  TABUNGAN ', 'x')).toBe('TABUNGAN')
    expect(parseText('', 'x')).toBeNull()
    expect(parseText(null, 'x')).toBeNull()
  })

  it('parseEnum rejects values outside the allowed list', () => {
    expect(parseEnum('LOAN', ['LOAN', 'FUNDING'], 'x')).toBe('LOAN')
    expect(() => parseEnum('SAVINGS', ['LOAN', 'FUNDING'], 'porto row 9, column product_category')).toThrow(
      /porto row 9, column product_category/,
    )
  })

  it('parseNullableNumber keeps zero, negatives and decimals, and maps blanks to null', () => {
    expect(parseNullableNumber(0, 'x')).toBe(0)
    expect(parseNullableNumber(-32.5, 'x')).toBe(-32.5)
    expect(parseNullableNumber(null, 'x')).toBeNull()
    expect(() => parseNullableNumber('1.000', 'x')).toThrow(IngestError)
  })

  it('parseDate returns the UTC calendar date as YYYY-MM-DD', () => {
    expect(parseDate(new Date(Date.UTC(2024, 3, 6)), 'x')).toBe('2024-04-06')
    expect(() => parseDate(new Date(Date.UTC(2024, 3, 6, 13, 30)), 'x')).toThrow(/without time/)
    expect(() => parseDate('2024-04-06', 'x')).toThrow(IngestError)
    expect(() => parseDate(new Date('not a date'), 'x')).toThrow(IngestError)
  })
})

describe('row mappers', () => {
  it('toProfile keeps a missing gender as null', () => {
    expect(toProfile({ rowNumber: 2, cells: { customer_id: 4857, gender: null, customer_income: '>100 Juta' } })).toEqual(
      { customer_id: 4857, gender: null, customer_income: '>100 Juta' },
    )
  })

  it('toPortfolioItem renames customerid and keeps null product and amount', () => {
    expect(
      toPortfolioItem({
        rowNumber: 2,
        cells: { customerid: 1465, product: null, product_category: 'LOAN', amount: null },
      }),
    ).toEqual({ customer_id: 1465, product: null, product_category: 'LOAN', amount: null })
  })

  it('toTransaction renames customerid and formats the date', () => {
    expect(
      toTransaction({
        rowNumber: 2,
        cells: {
          activity_date: new Date(Date.UTC(2011, 0, 27)),
          customerid: 3985,
          transaction_method: 'CREDIT CARD',
          transaction_type: 'OTHERS',
          transaction_amount: -198336530,
        },
      }),
    ).toEqual({
      activity_date: '2011-01-27',
      customer_id: 3985,
      transaction_method: 'CREDIT CARD',
      transaction_type: 'OTHERS',
      transaction_amount: -198336530,
    })
  })
})

describe('assertReferentialIntegrity', () => {
  const profile = { customer_id: 1, gender: 'M', customer_income: 'sd. 1 Juta' } as const
  const trx = (customer_id: number) =>
    ({
      activity_date: '2024-04-01',
      customer_id,
      transaction_method: 'ATM',
      transaction_type: 'WITHDRAWAL',
      transaction_amount: 1,
    }) as const

  it('passes when every ID exists in profile', () => {
    expect(() => assertReferentialIntegrity([profile], [], [trx(1)])).not.toThrow()
  })

  it('fails on duplicate profile IDs', () => {
    expect(() => assertReferentialIntegrity([profile, profile], [], [])).toThrow(/duplicate customer_id 1/)
  })

  it('fails on transactions for unknown customers', () => {
    expect(() => assertReferentialIntegrity([profile], [], [trx(2)])).toThrow(/not in profile: 2/)
  })
})
