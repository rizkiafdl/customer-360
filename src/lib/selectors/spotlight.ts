/**
 * The spotlight search (⌘K / Ctrl+K), spec section 5.5: recent customers,
 * quick filters, and pages with an empty query; customers, filters, and
 * pages that match a query otherwise.
 */
import { formatIDR, formatIDRShort } from '@/lib/format'
import type { RuleId } from '@/lib/insights'
import { getCustomerRows, type CustomerRow } from './customers'
import { getPortfolio, type Portfolio } from './portfolio'

export type SpotlightKind = 'customer' | 'filter' | 'page'

export interface SpotlightItem {
  /** Unique in one result: `customer-8797`, `filter-cash-heavy`, `filter-kyc`, `page-portfolio`, `page-customers`. */
  key: string
  kind: SpotlightKind
  title: string
  subtitle: string
  /** `AUM <formatIDR(aum)>` for customers (the subtitle's title attribute); `null` otherwise. */
  subtitleTitle: string | null
  /** Filters only; `null` otherwise. */
  count: number | null
  to: string
}

export interface SpotlightSection {
  title: string
  items: SpotlightItem[]
}

export interface SpotlightFilter {
  id: RuleId | 'kyc'
  label: string
  count: number
  to: string
}

export interface SpotlightSource {
  rows: readonly CustomerRow[]
  filters: readonly SpotlightFilter[]
}

interface SpotlightPage {
  id: 'portfolio' | 'customers'
  title: string
  subtitle: string
  to: string
}

const PAGES: readonly SpotlightPage[] = [
  { id: 'portfolio', title: 'Portfolio', subtitle: 'Your book overview', to: '/' },
  { id: 'customers', title: 'Customers', subtitle: 'Ranked list with preview', to: '/customers' },
]

const QUICK_FILTER_IDS: readonly SpotlightFilter['id'][] = ['cash-heavy', 'investment-gap-reksa', 'kyc']

const MAX_CUSTOMER_RESULTS = 5

/** The six rule filters (`portfolio.opportunities`) plus the KYC note, in that order. */
export function spotlightFilters(portfolio: Pick<Portfolio, 'opportunities' | 'kyc'>): SpotlightFilter[] {
  return [
    ...portfolio.opportunities.map((rule) => ({ id: rule.id, label: rule.label, count: rule.count, to: rule.to })),
    { id: 'kyc' as const, label: 'With KYC note', count: portfolio.kyc.count, to: portfolio.kyc.to },
  ]
}

/** `AUM <formatIDRShort(aum)>` plus ` · <chip>` when a rule fired. */
export function customerSubtitle(row: Pick<CustomerRow, 'aum' | 'chip'>): string {
  const base = `AUM ${formatIDRShort(row.aum)}`
  return row.chip === null ? base : `${base} · ${row.chip}`
}

/** `No customer, filter or page matches “<query>”.`, the raw (untrimmed) query, typographic quotes. */
export function noMatchText(query: string): string {
  return `No customer, filter or page matches “${query}”.`
}

function customerItem(row: CustomerRow): SpotlightItem {
  return {
    key: `customer-${row.customerId}`,
    kind: 'customer',
    title: `Customer ${row.customerId}`,
    subtitle: customerSubtitle(row),
    subtitleTitle: `AUM ${formatIDR(row.aum)}`,
    count: null,
    to: `/customers/${row.customerId}`,
  }
}

function filterItem(filter: SpotlightFilter): SpotlightItem {
  return {
    key: `filter-${filter.id}`,
    kind: 'filter',
    title: filter.label,
    subtitle: 'Open Customers filtered',
    subtitleTitle: null,
    count: filter.count,
    to: filter.to,
  }
}

function pageItem(page: SpotlightPage): SpotlightItem {
  return {
    key: `page-${page.id}`,
    kind: 'page',
    title: page.title,
    subtitle: page.subtitle,
    subtitleTitle: null,
    count: null,
    to: page.to,
  }
}

function containsQuery(text: string, query: string): boolean {
  return text.toLowerCase().includes(query.toLowerCase())
}

function recentlyActiveRows(rows: readonly CustomerRow[], excludeIds: ReadonlySet<number>): CustomerRow[] {
  return rows
    .filter((row) => row.lastActive !== null && !excludeIds.has(row.customerId))
    .sort((a, b) => (a.lastActive!.date < b.lastActive!.date ? 1 : a.lastActive!.date > b.lastActive!.date ? -1 : 0))
    .slice(0, MAX_CUSTOMER_RESULTS)
}

function emptyQuerySections(source: SpotlightSource, recentIds: readonly number[]): SpotlightSection[] {
  const byId = new Map(source.rows.map((row) => [row.customerId, row]))
  const recentlyViewed = recentIds
    .map((id) => byId.get(id))
    .filter((row): row is CustomerRow => row !== undefined)
    .slice(0, MAX_CUSTOMER_RESULTS)
  const viewedIds = new Set(recentlyViewed.map((row) => row.customerId))

  const quickFilters = QUICK_FILTER_IDS.map((id) => source.filters.find((filter) => filter.id === id)).filter(
    (filter): filter is SpotlightFilter => filter !== undefined,
  )

  return [
    { title: 'Recently viewed', items: recentlyViewed.map(customerItem) },
    { title: 'Recently active', items: recentlyActiveRows(source.rows, viewedIds).map(customerItem) },
    { title: 'Quick filters', items: quickFilters.map(filterItem) },
    { title: 'Go to', items: PAGES.map(pageItem) },
  ]
}

function querySections(source: SpotlightSource, trimmed: string): SpotlightSection[] {
  const customers = /^\d+$/.test(trimmed)
    ? source.rows.filter((row) => String(row.customerId).includes(trimmed)).slice(0, MAX_CUSTOMER_RESULTS)
    : []
  const filters = source.filters.filter((filter) => containsQuery(filter.label, trimmed))
  const pages = PAGES.filter((page) => containsQuery(page.title, trimmed))

  return [
    { title: 'Customers', items: customers.map(customerItem) },
    { title: 'Filters', items: filters.map(filterItem) },
    { title: 'Pages', items: pages.map(pageItem) },
  ]
}

/** The spotlight sections for a query, dropping any section with no items. */
export function buildSpotlightSections(
  source: SpotlightSource,
  query: string,
  recentIds: readonly number[],
): SpotlightSection[] {
  const trimmed = query.trim()
  const sections = trimmed === '' ? emptyQuerySections(source, recentIds) : querySections(source, trimmed)
  return sections.filter((section) => section.items.length > 0)
}

/** Bound to `getCustomerRows()` and `getPortfolio(null)`. */
export function getSpotlightSections(query: string, recentIds: readonly number[]): SpotlightSection[] {
  return buildSpotlightSections(
    { rows: getCustomerRows(), filters: spotlightFilters(getPortfolio(null)) },
    query,
    recentIds,
  )
}
