/**
 * The Customers list at `/customers` (redesign v2 spec, sections 4.3 and
 * 5.3): one row per customer in the default order, the URL filters, pages,
 * and the prev/next neighbours for Customer 360.
 */
import type { RuleId } from '@/lib/insights'
import type { ProductCategory } from '@/types'

/** The categories a customer can lack. LOAN is not one: no rule offers it. */
export type LacksCategory = Extract<ProductCategory, 'FUNDING' | 'ORI' | 'BANCA' | 'REKSA'>

export interface CustomerFilters {
  rule: RuleId | null
  /** Income rank 1–8 (`incomeRank`). */
  band: number | null
  /** The KYC income-band note fired (`true`) or not (`false`). */
  kyc: boolean | null
  lacks: LacksCategory | null
  /** Digits only: the ID contains them. */
  q: string | null
  /** 1 or more. */
  page: number
}

/** The URL query for a set of filters: `''` or `?rule=…&band=…&kyc=…&lacks=…&q=…&page=…`, page only above 1. */
export function customersQuery(filters: Partial<CustomerFilters>): string {
  const params = new URLSearchParams()
  if (filters.rule) params.set('rule', filters.rule)
  if (filters.band != null) params.set('band', String(filters.band))
  if (filters.kyc != null) params.set('kyc', filters.kyc ? 'yes' : 'no')
  if (filters.lacks) params.set('lacks', filters.lacks)
  if (filters.q) params.set('q', filters.q)
  if (filters.page != null && filters.page > 1) params.set('page', String(filters.page))
  const query = params.toString()
  return query ? `?${query}` : ''
}
