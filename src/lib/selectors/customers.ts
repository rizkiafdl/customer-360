/**
 * The Customers list at `/customers` (redesign v2 spec, sections 4.3 and
 * 5.3): one row per customer in the default order, the URL filters, pages,
 * and the prev/next neighbours for Customer 360.
 */
import { AUM_CATEGORIES, holdsCategory, incomeRank, isHighIncome, topChannel } from '@/lib/domain'
import { formatDate, formatMonthYear } from '@/lib/format'
import {
  RULES,
  RULE_ORDER,
  compareWorklist,
  formatWholePercent,
  productOffers,
  ruleChip,
  type ProductOffer,
  type RuleId,
} from '@/lib/insights'
import { INCOME_BANDS, type Gender, type IncomeBand, type ProductCategory, type Transaction } from '@/types'
import { bookCustomersOf, type BookCustomer } from './book'
import { dataset, type Dataset } from './dataset'
import { groupByCustomer } from './grouping'

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

/** What the preview panel shows for one row. Every text comes from a fixed template. */
export interface CustomerPreview {
  gender: Gender | null
  incomeBand: IncomeBand
  highIncome: boolean
  /** `First transaction Jul 2014`, or `null` with no rows. */
  firstTransaction: string | null
  /** The first two `productOffers` cards. */
  offers: ProductOffer[]
  channelText: string | null
  lastActiveText: string | null
}

export interface CustomerRow {
  /** 1 to n, the position in the default order. */
  rank: number
  customerId: number
  aum: number
  /** Never added to `aum`. */
  loanExposure: number
  /** `ruleChip` of the first fired rule, or `null` when no rule fired. */
  chip: string | null
  /** Fired rules after the first. */
  moreCount: number
  lastActive: { days: number; date: string; label: string } | null
  /** The KYC income-band note fired. */
  kyc: boolean
  incomeRank: number
  /** AUM categories with no held row, in `AUM_CATEGORIES` order. */
  lacks: LacksCategory[]
  /** Fired rules, in `RULE_ORDER`. */
  ruleIds: RuleId[]
  preview: CustomerPreview
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** `Today`, `1 day ago`, `N days ago`. */
export function lastActiveLabel(days: number): string {
  return days === 0 ? 'Today' : `${plural(days, 'day', 'days')} ago`
}

/** `Last active 2 days ago, 24 Apr 2024`; `Last active today, …`; `null` with no customer-initiated row. */
export function lastActiveText(lastActive: { days: number; date: string } | null): string | null {
  if (lastActive === null) return null
  const label = lastActive.days === 0 ? 'today' : lastActiveLabel(lastActive.days)
  return `Last active ${label}, ${formatDate(lastActive.date)}`
}

/**
 * `Top channel: MOBILE BANKING, 11 of 29 customer-initiated transactions (37%)`.
 * Bank entries are left out (user decision, 2026-11-24). `null` with no
 * customer-initiated row.
 */
export function channelText(transactions: readonly Transaction[]): string | null {
  const top = topChannel(transactions)
  if (top === null) return null
  const share = formatWholePercent(top.count, top.total)
  return `Top channel: ${top.method}, ${top.count} of ${plural(top.total, 'customer-initiated transaction', 'customer-initiated transactions')} (${share})`
}

function rowOf(customer: BookCustomer, transactions: readonly Transaction[], index: number): CustomerRow {
  const { profile, evaluation, lastActive, firstTransaction } = customer
  const [top, ...rest] = evaluation.insights
  return {
    rank: index + 1,
    customerId: profile.customer_id,
    aum: evaluation.aum,
    loanExposure: customer.loanExposure,
    chip: top ? ruleChip(top) : null,
    moreCount: rest.length,
    lastActive: lastActive && { ...lastActive, label: lastActiveLabel(lastActive.days) },
    kyc: evaluation.kycNote !== null,
    incomeRank: incomeRank(profile.customer_income),
    lacks: AUM_CATEGORIES.filter((c): c is LacksCategory => !holdsCategory(customer.portfolio, c)),
    ruleIds: evaluation.insights.map((insight) => insight.id),
    preview: {
      gender: profile.gender,
      incomeBand: profile.customer_income,
      highIncome: isHighIncome(profile.customer_income),
      firstTransaction: firstTransaction && `First transaction ${formatMonthYear(firstTransaction)}`,
      offers: productOffers(evaluation).slice(0, 2),
      channelText: channelText(transactions),
      lastActiveText: lastActiveText(lastActive),
    },
  }
}

/** Every customer, in the worklist order (`compareWorklist`: fired rules, then AUM, then ID). */
export function buildCustomerRows(data: Dataset): CustomerRow[] {
  const groups = groupByCustomer(data)
  return bookCustomersOf(data)
    .sort((a, b) => compareWorklist(a.evaluation, b.evaluation))
    .map((customer, index) => rowOf(customer, groups.get(customer.profile.customer_id)?.transactions ?? [], index))
}

const LACKS: readonly string[] = AUM_CATEGORIES

function isRuleId(value: string | null): value is RuleId {
  return (RULE_ORDER as readonly (string | null)[]).includes(value)
}

/** The filters from the URL. A bad value is ignored (`null`); a bad page is 1. A page above the page count is left to `paginate`. */
export function parseCustomerFilters(params: URLSearchParams): CustomerFilters {
  const rule = params.get('rule')
  const band = params.get('band')
  const kyc = params.get('kyc')
  const lacks = params.get('lacks')
  const q = params.get('q')
  const page = params.get('page')
  return {
    rule: isRuleId(rule) ? rule : null,
    band: band !== null && new RegExp(`^[1-${INCOME_BANDS.length}]$`).test(band) ? Number(band) : null,
    kyc: kyc === 'yes' ? true : kyc === 'no' ? false : null,
    lacks: lacks !== null && LACKS.includes(lacks) ? (lacks as LacksCategory) : null,
    q: q !== null && /^\d+$/.test(q) ? q : null,
    page: page !== null && /^\d+$/.test(page) && Number(page) >= 1 ? Number(page) : 1,
  }
}

/** The rows that match every set filter (AND). The page is not a filter. */
export function filterCustomers(rows: readonly CustomerRow[], filters: CustomerFilters): CustomerRow[] {
  const { rule, band, kyc, lacks, q } = filters
  return rows.filter(
    (row) =>
      (rule === null || row.ruleIds.includes(rule)) &&
      (band === null || row.incomeRank === band) &&
      (kyc === null || row.kyc === kyc) &&
      (lacks === null || row.lacks.includes(lacks)) &&
      (q === null || String(row.customerId).includes(q)),
  )
}

/** Rows per page on the Customers list. */
export const PAGE_SIZE = 25

/** One page of rows. A page out of range is page 1 (spec 4.3). */
export function paginate<T>(
  rows: readonly T[],
  page: number,
  size = PAGE_SIZE,
): { rows: T[]; page: number; pageCount: number; label: string } {
  const pageCount = Math.max(1, Math.ceil(rows.length / size))
  const current = Number.isInteger(page) && page >= 1 && page <= pageCount ? page : 1
  const start = (current - 1) * size
  const shown = rows.slice(start, start + size)
  const label =
    shown.length === 0 ? `Showing 0 of ${rows.length}` : `Showing ${start + 1}–${start + shown.length} of ${rows.length}`
  return { rows: shown, page: current, pageCount, label }
}

function ruleLabel(id: RuleId): string {
  return RULES.find((rule) => rule.id === id)?.label ?? id
}

/** The line above the table, from fixed templates. */
export function customerSummary(shown: number, total: number, filters: CustomerFilters): string {
  if (shown === 0) return 'No customers match these filters.'
  const { rule, band, kyc, lacks, q } = filters
  const parts: string[] = []
  if (rule !== null) parts.push(`Opportunity: ${ruleLabel(rule)}.`)
  if (band !== null) parts.push(`Income: ${INCOME_BANDS[band - 1]}.`)
  if (kyc !== null) parts.push(`KYC note: ${kyc ? 'with' : 'without'}.`)
  if (lacks !== null) parts.push(`Not held: ${lacks}.`)
  if (q !== null) parts.push(`ID contains ${q}.`)
  if (parts.length === 0) return `${plural(total, 'customer', 'customers')}.`
  return [`${shown} of ${plural(total, 'customer', 'customers')}.`, ...parts].join(' ')
}

/** Where `id` sits in the filtered rows, with the IDs before and after. No wrap at the ends. `null` when the ID is not in the rows. */
export function neighbours(
  rows: readonly CustomerRow[],
  id: number,
): { position: number; total: number; prevId: number | null; nextId: number | null } | null {
  const index = rows.findIndex((row) => row.customerId === id)
  if (index === -1) return null
  return {
    position: index + 1,
    total: rows.length,
    prevId: rows[index - 1]?.customerId ?? null,
    nextId: rows[index + 1]?.customerId ?? null,
  }
}

const customerRows = buildCustomerRows(dataset)

export function getCustomerRows(): CustomerRow[] {
  return customerRows
}
