/** Small hand-made fixtures for insight tests (ADR 0004: no real data below selectors). */
import type { IncomeBand, PortfolioItem, ProductCategory, Profile } from '@/types'
import type { CustomerInput } from './types'

export function row(
  product_category: ProductCategory,
  amount: number | null,
  product: string | null = 'TABUNGAN',
): PortfolioItem {
  return { customer_id: 1, product, product_category, amount }
}

export function customer(
  portfolio: readonly PortfolioItem[],
  customer_income: IncomeBand = '>5 Juta - 10 Juta',
): CustomerInput {
  const profile: Profile = { customer_id: 1, gender: 'F', customer_income }
  return { profile, portfolio }
}

/** Intl puts a no-break space (U+00A0) after "Rp"; tests write a plain space. */
export function rp(text: string): string {
  return text.replaceAll('Rp ', 'Rp ')
}
