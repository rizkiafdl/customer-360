/**
 * Reads `data/raw/AE Test_1126.xlsx` (read-only) and writes one typed JSON
 * file per data sheet to `src/data/`. Run with `npm run data:build`.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import ExcelJS from 'exceljs'
import {
  SHEET_HEADERS,
  IngestError,
  assertReferentialIntegrity,
  readTable,
  toPortfolioItem,
  toProfile,
  toTransaction,
  type RawRow,
} from './excel/normalize.ts'

const SOURCE = fileURLToPath(new URL('../data/raw/AE Test_1126.xlsx', import.meta.url))
const OUT_DIR = fileURLToPath(new URL('../src/data/', import.meta.url))

function rawRows(workbook: ExcelJS.Workbook, sheet: keyof typeof SHEET_HEADERS): RawRow[] {
  const worksheet = workbook.getWorksheet(sheet)
  if (!worksheet) throw new IngestError(`sheet "${sheet}" not found`)
  const width = SHEET_HEADERS[sheet].length
  const rows: RawRow[] = []
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    rows.push({ rowNumber, values: Array.from({ length: width }, (_, i) => row.getCell(i + 1).value) })
  })
  return rows
}

async function writeJson(file: string, rows: readonly unknown[]): Promise<void> {
  await writeFile(`${OUT_DIR}${file}`, `${JSON.stringify(rows, null, 2)}\n`)
  console.log(`  src/data/${file}: ${rows.length} rows`)
}

async function main(): Promise<void> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(SOURCE)

  const profiles = readTable('profile', rawRows(workbook, 'profile'), SHEET_HEADERS.profile).map(toProfile)
  const portfolio = readTable('porto', rawRows(workbook, 'porto'), SHEET_HEADERS.porto).map(toPortfolioItem)
  const transactions = readTable('transaction', rawRows(workbook, 'transaction'), SHEET_HEADERS.transaction).map(
    toTransaction,
  )
  assertReferentialIntegrity(profiles, portfolio, transactions)

  await mkdir(OUT_DIR, { recursive: true })
  console.log('data:build wrote:')
  await writeJson('profiles.json', profiles)
  await writeJson('portfolio.json', portfolio)
  await writeJson('transactions.json', transactions)
}

main().catch((error: unknown) => {
  console.error(error instanceof IngestError ? `data:build failed: ${error.message}` : error)
  process.exitCode = 1
})
