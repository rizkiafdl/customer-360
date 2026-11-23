/**
 * The deposit / cash split of FUNDING, used by the cash-heavy rule.
 * User decision, 2026-11-23 (ADR 0008).
 */
import type { PortfolioItem } from '@/types'
import { DEPOSIT_PRODUCT_PREFIX } from './thresholds'

/** A FUNDING row whose product name starts with `DEPO`. */
export function isDepositProduct(item: PortfolioItem): boolean {
  return (
    item.product_category === 'FUNDING' &&
    item.product !== null &&
    item.product.startsWith(DEPOSIT_PRODUCT_PREFIX)
  )
}

/**
 * Every other FUNDING row with a product name: savings, giro, multi
 * currency. A `null` product is not cash. LOAN rows are never cash, even
 * when named GIRO or MULTI CURRENCY.
 */
export function isCashProduct(item: PortfolioItem): boolean {
  return item.product_category === 'FUNDING' && item.product !== null && !isDepositProduct(item)
}

/** Sum of `amount` over cash rows. `null` counts as 0. */
export function cashAmount(items: readonly PortfolioItem[]): number {
  return items.filter(isCashProduct).reduce((total, item) => total + (item.amount ?? 0), 0)
}
