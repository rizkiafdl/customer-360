/**
 * A small hand-made dataset for selector and UI tests. Each customer covers
 * cases from the F1 spec, section 5.4:
 *
 * - 1: full customer. High income, AUM Rp 1 M (62% FUNDING), a held LOAN, a
 *   zero BANCA row, a LOAN row with no product name and a `null` amount,
 *   one transaction before the detail window, and bank entries.
 * - 2: no portfolio rows, `null` gender, no earlier transactions.
 * - 3: AUM 0 with a held LOAN (like customer 786 in the real data).
 * - 4: no offer rule fires, but the KYC note does (F3): income rank 2,
 *   AUM Rp 1 Bn, cash 10%, every investment category held.
 *
 * The latest date is 2024-04-26, so the as-of date matches the real data.
 */
import type { Dataset } from '@/lib/selectors/dataset'
import type { Transaction } from '@/types'

function trx(
  customer_id: number,
  activity_date: string,
  transaction_method: Transaction['transaction_method'],
  transaction_type: Transaction['transaction_type'],
  transaction_amount: number,
): Transaction {
  return { customer_id, activity_date, transaction_method, transaction_type, transaction_amount }
}

export const fixtureDataset: Dataset = {
  profiles: [
    { customer_id: 1, gender: 'F', customer_income: '>10 Juta - 25 Juta' },
    { customer_id: 2, gender: null, customer_income: 'sd. 1 Juta' },
    { customer_id: 3, gender: 'M', customer_income: '>3 Juta - 5 Juta' },
    { customer_id: 4, gender: 'F', customer_income: '>1 Juta - 3 Juta' },
  ],
  portfolio: [
    { customer_id: 1, product: 'TABUNGAN', product_category: 'FUNDING', amount: 620_000_000 },
    { customer_id: 1, product: 'ORI', product_category: 'ORI', amount: 200_000_000 },
    { customer_id: 1, product: 'REKSADANA', product_category: 'REKSA', amount: 180_000_000 },
    { customer_id: 1, product: 'BANCA', product_category: 'BANCA', amount: 0 },
    { customer_id: 1, product: 'KPR', product_category: 'LOAN', amount: 250_000_000 },
    { customer_id: 1, product: null, product_category: 'LOAN', amount: null },
    { customer_id: 3, product: 'PERSONAL LOAN', product_category: 'LOAN', amount: 23_800_000 },
    { customer_id: 4, product: 'DEPOSITO12', product_category: 'FUNDING', amount: 600_000_000 },
    { customer_id: 4, product: 'TABUNGAN', product_category: 'FUNDING', amount: 100_000_000 },
    { customer_id: 4, product: 'ORI', product_category: 'ORI', amount: 100_000_000 },
    { customer_id: 4, product: 'BANCA', product_category: 'BANCA', amount: 100_000_000 },
    { customer_id: 4, product: 'REKSADANA', product_category: 'REKSA', amount: 100_000_000 },
  ],
  transactions: [
    trx(1, '2024-04-24', 'MOBILE BANKING', 'TRANSFER', 1_500_000),
    trx(1, '2024-04-10', 'QRIS', 'PAYMENT', 75_000),
    trx(1, '2024-03-04', 'ATM', 'CASH WITHDRAWAL', 500_000),
    trx(1, '2024-03-01', 'BRANCH', 'SETOR TUNAI', 2_000_000),
    trx(1, '2024-03-15', 'BANCA', 'OTHERS', 1_000_000),
    trx(1, '2023-05-02', 'DEBIT CARD', 'RETAIL TRANSACTION', 250_000),
    trx(1, '2024-03-31', 'BRANCH', 'BUNGA', 12_345.67),
    trx(1, '2024-04-26', 'BRANCH', 'BUNGA', 10_000),
    trx(1, '2024-03-31', 'BRANCH', 'PAJAK', 2_469),
    trx(2, '2024-04-25', 'ATM', 'WITHDRAWAL', 100_000),
    trx(2, '2024-03-10', 'MOBILE BANKING', 'TRANSFER', 50_000),
    trx(3, '2024-04-20', 'MOBILE BANKING', 'INSTALMENT', 2_000_000),
    trx(4, '2024-04-20', 'MOBILE BANKING', 'TRANSFER', 1_000_000),
  ],
}
