/**
 * Portfolio definitions reused from Part 2 (ADR 0006).
 *
 * Every function takes one customer's rows. None of them filters by
 * `customer_id`; that is the selectors' job (ADR 0004).
 */
import { PRODUCT_CATEGORIES, type PortfolioItem, type ProductCategory } from '@/types'

/** Categories that count toward AUM. LOAN is excluded. */
export const AUM_CATEGORIES: readonly ProductCategory[] = ['FUNDING', 'ORI', 'BANCA', 'REKSA']

/**
 * One color token per category, for charts, dots, and badges (ADR 0007).
 * The AUM categories take --chart-1..4. LOAN takes --chart-5, a neutral hue,
 * because it is never part of AUM. No category is red.
 */
export const CATEGORY_COLORS: Readonly<Record<ProductCategory, string>> = {
  FUNDING: 'var(--chart-1)',
  ORI: 'var(--chart-2)',
  BANCA: 'var(--chart-3)',
  REKSA: 'var(--chart-4)',
  LOAN: 'var(--chart-5)',
}

/** A customer holds a product when its amount is above 0. `null` and 0 are not held. */
export function isHeld(item: PortfolioItem): boolean {
  return item.amount !== null && item.amount > 0
}

/** The customer holds at least one row of the category (`isHeld`, amount above 0). */
export function holdsCategory(items: readonly PortfolioItem[], category: ProductCategory): boolean {
  return items.some((item) => item.product_category === category && isHeld(item))
}

/** Number of rows the customer holds (`isHeld`), any category. */
export function heldCount(items: readonly PortfolioItem[]): number {
  return items.filter(isHeld).length
}

function sumAmounts(items: readonly PortfolioItem[]): number {
  return items.reduce((total, item) => total + (item.amount ?? 0), 0)
}

/** Sum of `amount` over FUNDING, ORI, BANCA, and REKSA. `null` counts as 0. */
export function customerAum(items: readonly PortfolioItem[]): number {
  return sumAmounts(items.filter((item) => AUM_CATEGORIES.includes(item.product_category)))
}

/** Sum of `amount` over LOAN. `null` counts as 0. Never part of AUM. */
export function loanExposure(items: readonly PortfolioItem[]): number {
  return sumAmounts(items.filter((item) => item.product_category === 'LOAN'))
}

/**
 * One total per category, all five present. Groups by category, never by
 * product name: GIRO under FUNDING and GIRO under LOAN stay apart.
 */
export function amountByCategory(
  items: readonly PortfolioItem[],
): Record<ProductCategory, number> {
  const totals = Object.fromEntries(PRODUCT_CATEGORIES.map((c) => [c, 0])) as Record<
    ProductCategory,
    number
  >
  for (const item of items) totals[item.product_category] += item.amount ?? 0
  return totals
}
