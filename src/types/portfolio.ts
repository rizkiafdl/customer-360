/** Values seen in the `product_category` column of the `porto` sheet. */
export const PRODUCT_CATEGORIES = ['FUNDING', 'LOAN', 'ORI', 'BANCA', 'REKSA'] as const
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number]

/** One row of `src/data/portfolio.json` (source sheet: `porto`). */
export interface PortfolioItem {
  customer_id: number
  /** Product name, e.g. `TABUNGAN`. `null` when the source cell is empty (1 row). */
  product: string | null
  /**
   * Category as written in the source. Some products (GIRO, GIROSYARIAH,
   * MULTI CURRENCY) appear under both FUNDING and LOAN.
   */
  product_category: ProductCategory
  /** Amount in IDR, as in the source. `null` when the cell is empty (5 rows). Can be 0. */
  amount: number | null
}
