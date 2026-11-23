/** Values seen in the `transaction_method` column of the `transaction` sheet. */
export const TRANSACTION_METHODS = [
  'ATM',
  'BANCA',
  'BRANCH',
  'CREDIT CARD',
  'DEBIT CARD',
  'INTERNET BANKING',
  'MERCHANT',
  'MOBILE BANKING',
  'QRIS',
  'SMS BANKING',
  'VELOCITY',
  'VIRTUAL DEBIT CARD',
] as const
export type TransactionMethod = (typeof TRANSACTION_METHODS)[number]

/** Values seen in the `transaction_type` column of the `transaction` sheet. */
export const TRANSACTION_TYPES = [
  'BIAYA',
  'BUNGA',
  'CASH WITHDRAWAL',
  'DENDA',
  'INSTALMENT',
  'NON DIGITAL',
  'OTHER VELO TRX',
  'OTHERS',
  'PAJAK',
  'PAYMENT',
  'RETAIL TRANSACTION',
  'SETOR TUNAI',
  'TRANSFER',
  'WITHDRAWAL',
] as const
export type TransactionType = (typeof TRANSACTION_TYPES)[number]

/** One row of `src/data/transactions.json` (source sheet: `transaction`). */
export interface Transaction {
  /** Calendar date as `YYYY-MM-DD`. The source has no time part. */
  activity_date: string
  customer_id: number
  transaction_method: TransactionMethod
  transaction_type: TransactionType
  /** Amount in IDR, as in the source. Can be negative, zero, or have decimals. */
  transaction_amount: number
}
