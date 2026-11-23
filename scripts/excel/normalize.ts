/**
 * Pure functions that turn raw worksheet rows into typed records.
 *
 * Scope: shape cleaning only (skip empty rows, trim text, rename columns,
 * ISO dates, check allowed values and IDs). Business cleaning (what a null
 * amount or a negative transaction means) belongs in `src/lib/`.
 */
import {
  GENDERS,
  INCOME_BANDS,
  PRODUCT_CATEGORIES,
  TRANSACTION_METHODS,
  TRANSACTION_TYPES,
  type PortfolioItem,
  type Profile,
  type Transaction,
} from '../../src/types/index.ts'

export class IngestError extends Error {
  override name = 'IngestError'
}

/** One worksheet row: its 1-based row number and its cell values in column order. */
export interface RawRow {
  rowNumber: number
  values: readonly unknown[]
}

/** A data row with cells keyed by header name. */
export interface TableRow {
  rowNumber: number
  cells: Record<string, unknown>
}

export const SHEET_HEADERS = {
  profile: ['customer_id', 'gender', 'customer_income'],
  porto: ['customerid', 'product', 'product_category', 'amount'],
  transaction: [
    'activity_date',
    'customerid',
    'transaction_method',
    'transaction_type',
    'transaction_amount',
  ],
} as const

/** Unwraps exceljs cell objects (formula, rich text, hyperlink) to a plain value. */
export function cellValue(value: unknown): unknown {
  if (value === null || value === undefined) return null
  if (value instanceof Date) return value
  if (typeof value === 'object') {
    if ('result' in value) return cellValue(value.result)
    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText.map((part: { text?: string }) => part.text ?? '').join('')
    }
    if ('text' in value) return cellValue(value.text)
  }
  return value
}

function isBlank(value: unknown): boolean {
  return value === null || value === undefined || (typeof value === 'string' && value.trim() === '')
}

/**
 * Checks the header row, drops fully empty rows (the raw sheets carry ~100k
 * empty trailing rows), and keys each remaining row by header name.
 */
export function readTable(sheet: string, rows: readonly RawRow[], header: readonly string[]): TableRow[] {
  const nonEmpty = rows.filter((row) => !row.values.every(isBlank))
  const [headerRow, ...dataRows] = nonEmpty
  if (!headerRow) throw new IngestError(`${sheet}: sheet is empty`)

  const actual = header.map((_, i) => cellValue(headerRow.values[i]))
  if (actual.some((name, i) => name !== header[i])) {
    throw new IngestError(
      `${sheet}: unexpected header ${JSON.stringify(actual)}, expected ${JSON.stringify(header)}`,
    )
  }

  return dataRows.map((row) => ({
    rowNumber: row.rowNumber,
    cells: Object.fromEntries(header.map((name, i) => [name, cellValue(row.values[i])])),
  }))
}

function where(sheet: string, row: TableRow, column: string): string {
  return `${sheet} row ${row.rowNumber}, column ${column}`
}

export function parseId(value: unknown, at: string): number {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) return value
  throw new IngestError(`${at}: expected a positive integer customer ID, got ${JSON.stringify(value)}`)
}

export function parseText(value: unknown, at: string): string | null {
  if (isBlank(value)) return null
  if (typeof value === 'string') return value.trim()
  throw new IngestError(`${at}: expected text, got ${JSON.stringify(value)}`)
}

export function parseEnum<T extends string>(value: unknown, allowed: readonly T[], at: string): T {
  const text = parseText(value, at)
  if (text !== null && (allowed as readonly string[]).includes(text)) return text as T
  throw new IngestError(`${at}: ${JSON.stringify(value)} is not one of ${JSON.stringify(allowed)}`)
}

export function parseNullableEnum<T extends string>(value: unknown, allowed: readonly T[], at: string): T | null {
  return isBlank(value) ? null : parseEnum(value, allowed, at)
}

export function parseNumber(value: unknown, at: string): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  throw new IngestError(`${at}: expected a number, got ${JSON.stringify(value)}`)
}

export function parseNullableNumber(value: unknown, at: string): number | null {
  return isBlank(value) ? null : parseNumber(value, at)
}

/**
 * Converts a cell to a `YYYY-MM-DD` string. exceljs reads Excel date serials
 * as UTC midnight, so the UTC calendar fields are the source calendar date.
 */
export function parseDate(value: unknown, at: string): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    if (value.getUTCHours() || value.getUTCMinutes() || value.getUTCSeconds()) {
      throw new IngestError(`${at}: expected a date without time, got ${value.toISOString()}`)
    }
    return value.toISOString().slice(0, 10)
  }
  throw new IngestError(`${at}: expected a date, got ${JSON.stringify(value)}`)
}

export function toProfile(row: TableRow): Profile {
  const s = 'profile'
  return {
    customer_id: parseId(row.cells.customer_id, where(s, row, 'customer_id')),
    gender: parseNullableEnum(row.cells.gender, GENDERS, where(s, row, 'gender')),
    customer_income: parseEnum(row.cells.customer_income, INCOME_BANDS, where(s, row, 'customer_income')),
  }
}

export function toPortfolioItem(row: TableRow): PortfolioItem {
  const s = 'porto'
  return {
    customer_id: parseId(row.cells.customerid, where(s, row, 'customerid')),
    product: parseText(row.cells.product, where(s, row, 'product')),
    product_category: parseEnum(row.cells.product_category, PRODUCT_CATEGORIES, where(s, row, 'product_category')),
    amount: parseNullableNumber(row.cells.amount, where(s, row, 'amount')),
  }
}

export function toTransaction(row: TableRow): Transaction {
  const s = 'transaction'
  return {
    activity_date: parseDate(row.cells.activity_date, where(s, row, 'activity_date')),
    customer_id: parseId(row.cells.customerid, where(s, row, 'customerid')),
    transaction_method: parseEnum(row.cells.transaction_method, TRANSACTION_METHODS, where(s, row, 'transaction_method')),
    transaction_type: parseEnum(row.cells.transaction_type, TRANSACTION_TYPES, where(s, row, 'transaction_type')),
    transaction_amount: parseNumber(row.cells.transaction_amount, where(s, row, 'transaction_amount')),
  }
}

/** Fails if a profile ID repeats or a portfolio/transaction row points to an unknown customer. */
export function assertReferentialIntegrity(
  profiles: readonly Profile[],
  portfolio: readonly PortfolioItem[],
  transactions: readonly Transaction[],
): void {
  const ids = new Set<number>()
  for (const p of profiles) {
    if (ids.has(p.customer_id)) throw new IngestError(`profile: duplicate customer_id ${p.customer_id}`)
    ids.add(p.customer_id)
  }
  const orphans = (rows: readonly { customer_id: number }[]) =>
    [...new Set(rows.map((r) => r.customer_id).filter((id) => !ids.has(id)))]
  const orphanPorto = orphans(portfolio)
  if (orphanPorto.length) throw new IngestError(`porto: customer IDs not in profile: ${orphanPorto.join(', ')}`)
  const orphanTrx = orphans(transactions)
  if (orphanTrx.length) throw new IngestError(`transaction: customer IDs not in profile: ${orphanTrx.join(', ')}`)
}
