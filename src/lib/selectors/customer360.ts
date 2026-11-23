/**
 * The Customer 360 view model: every number and title the detail page shows,
 * already computed (F1 spec, section 5). The page only renders it.
 *
 * `buildCustomer360(data, id)` is the pure selector. `getCustomer360(id)`
 * reads the real data, grouped by `customer_id` once at module load.
 */
import {
  AUM_CATEGORIES,
  CATEGORY_COLORS,
  DETAIL_WINDOW_START,
  amountByCategory,
  bankEntrySummary,
  countBy,
  customerAum,
  daysSince,
  digitalCounts,
  digitalShare,
  earlierRows,
  firstActivityDate,
  heldCount,
  incomeRank,
  isBankEntry,
  isCustomerInitiated,
  isHeld,
  isHighIncome,
  latestActivityDate,
  loanExposure,
  loanFacilities,
  shareOfAum,
  topWithOther,
  weeklyCounts,
  type BankEntryTotal,
  type LabelCount,
  type LoanFacility,
} from '@/lib/domain'
import { formatDate, formatDayMonth, formatIDR, formatMonthYear, formatPercent } from '@/lib/format'
import { evaluateCustomer, offerPanel, productOffers, type OfferPanel, type ProductOffer } from '@/lib/insights'
import {
  INCOME_BANDS,
  type Gender,
  type IncomeBand,
  type PortfolioItem,
  type ProductCategory,
  type Transaction,
  type TransactionMethod,
  type TransactionType,
} from '@/types'
import { asOfDate, asOfDateOf } from './book'
import { channelText } from './customers'
import { dataset, type Dataset } from './dataset'
import { groupByCustomer, type CustomerRows } from './grouping'

/** How many channels the channel mix shows before it folds the rest into "Other" (F1 spec 5.2). */
const CHANNEL_MIX_TOP = 5

export interface ProductRow {
  key: string
  product: string
  category: ProductCategory
  color: string
  amount: number | null
  held: boolean
  /** Not held (0 or `null` amount): shown muted. */
  muted: boolean
}

export interface TransactionRow {
  key: string
  date: string
  method: TransactionMethod
  type: TransactionType
  amount: number
  kind: 'customer' | 'bank'
}

export type TransactionFilter = 'all' | 'customer' | 'bank'

export interface Customer360 {
  id: number
  heading: string
  profile: {
    gender: string
    incomeBand: IncomeBand
    incomeRankLabel: string
    highIncome: boolean
    /** `First transaction Jul 2014`, bank entries included; `null` with no rows. */
    firstTransaction: string | null
  }
  kpis: {
    aum: number
    loanExposure: number
    heldLabel: string
    /** Held AUM rows and their categories in `AUM_CATEGORIES` order; `label` is `3 · FUNDING, ORI, REKSA`. */
    products: { count: number; categories: ProductCategory[]; label: string }
    recency: { days: number | null; label: string; lastDate: string | null }
    /** `meter` is the share as a whole percent for the progress bar, 0 when there is no share. */
    digital: { share: number | null; meter: number; label: string; context: string }
  }
  holdings: {
    /** `none`: no portfolio rows. `no-aum`: rows, but AUM 0. `aum`: AUM above 0. */
    state: 'none' | 'no-aum' | 'aum'
    emptyText: string | null
    title: string | null
    aumBars: { category: ProductCategory; amount: number; color: string }[]
    products: ProductRow[]
    /** Held AUM rows, amount high to low, each with its share of AUM. Never LOAN. */
    held: { product: string; category: ProductCategory; color: string; amount: number; share: number }[]
    /** AUM rows with amount 0 or `null`. Never LOAN. */
    notHeld: ProductRow[]
  }
  activity: {
    weeklyTitle: string
    weekly: { weekStart: string; label: string; count: number }[]
    earlierText: string | null
    channelTitle: string | null
    channelMix: LabelCount[]
    typeTitle: string | null
    typeMix: LabelCount[]
    /** Replaces both mix charts when no row is customer-initiated. */
    mixEmptyText: string | null
  }
  /** The "What to offer" panel (F3). */
  offers: OfferPanel
  /** The offers grouped by product (redesign v2). */
  productOffers: ProductOffer[]
  /** `Top channel: …` over customer-initiated rows; `null` with none. */
  channelText: string | null
  /** LOAN rows: code, amount, share of loan exposure. Never part of AUM. */
  loans: { title: string; held: LoanFacility[]; notHeld: PortfolioItem[]; exposure: number; missingText: string }
  /** The first 5 rows of `transactions` (latest first). */
  recent: TransactionRow[]
  bankEntries: { title: string; rows: BankEntryTotal[] }
  transactions: TransactionRow[]
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

const GENDER_LABELS: Record<Gender, string> = { F: 'Female', M: 'Male' }

function genderLabel(gender: Gender | null): string {
  return gender === null ? 'Gender not recorded' : GENDER_LABELS[gender]
}

/** "X is 17% of 6 customer-initiated transactions", from the largest entry. */
function mixTitle(entries: LabelCount[], total: number): string | null {
  const top = entries[0]
  if (!top || total === 0) return null
  return `${top.label} is ${formatPercent(top.count / total)} of ${plural(total, 'customer-initiated transaction', 'customer-initiated transactions')}`
}

function holdingsOf(portfolio: PortfolioItem[]): Customer360['holdings'] {
  const byCategory = amountByCategory(portfolio)
  const aum = customerAum(portfolio)
  const aumBars = AUM_CATEGORIES.map((category) => ({
    category,
    amount: byCategory[category],
    color: CATEGORY_COLORS[category],
  }))
  const order: ProductCategory[] = [...AUM_CATEGORIES, 'LOAN']
  const products = portfolio
    .map((item, index) => ({ item, index }))
    .sort(
      (a, b) =>
        order.indexOf(a.item.product_category) - order.indexOf(b.item.product_category) ||
        (b.item.amount ?? -Infinity) - (a.item.amount ?? -Infinity) ||
        a.index - b.index,
    )
    .map(({ item, index }) => ({
      key: `${index}`,
      product: item.product ?? 'Unnamed product',
      category: item.product_category,
      color: CATEGORY_COLORS[item.product_category],
      amount: item.amount,
      held: isHeld(item),
      muted: !isHeld(item),
    }))

  const held = portfolio
    .filter((item) => item.product_category !== 'LOAN' && isHeld(item))
    .map((item) => ({
      product: item.product ?? 'Unnamed product',
      category: item.product_category,
      color: CATEGORY_COLORS[item.product_category],
      amount: item.amount!,
      share: shareOfAum(item, aum)!,
    }))
    .sort((a, b) => b.amount - a.amount)
  const notHeld = products.filter((row) => row.category !== 'LOAN' && !row.held)
  const split = { held, notHeld }

  if (portfolio.length === 0) {
    return { state: 'none', emptyText: 'No portfolio rows.', title: null, aumBars, products, ...split }
  }
  if (aum === 0) {
    const rows = plural(portfolio.length, 'product row', 'product rows')
    return { state: 'no-aum', emptyText: `No AUM. ${rows}, none held in AUM categories.`, title: null, aumBars, products, ...split }
  }
  // Largest category; a tie goes to the first in AUM_CATEGORIES order.
  const top = aumBars.reduce((best, bar) => (bar.amount > best.amount ? bar : best))
  return {
    state: 'aum',
    emptyText: null,
    title: `${formatPercent(top.amount / aum)} of AUM in ${top.category}`,
    aumBars,
    products,
    ...split,
  }
}

function activityOf(customerTrx: Transaction[], asOf: string): Customer360['activity'] {
  const inWindow = customerTrx.filter((t) => t.activity_date >= DETAIL_WINDOW_START && t.activity_date <= asOf)
  const weekly = weeklyCounts(customerTrx, DETAIL_WINDOW_START, asOf).map((week) => ({
    ...week,
    // The first week can start before the window; label it by its first counted day.
    label: formatDayMonth(week.weekStart < DETAIL_WINDOW_START ? DETAIL_WINDOW_START : week.weekStart),
  }))
  const earlier = earlierRows(customerTrx, DETAIL_WINDOW_START)
  const channels = countBy(customerTrx, (t) => t.transaction_method)
  const types = countBy(customerTrx, (t) => t.transaction_type)
  return {
    weeklyTitle: `${plural(inWindow.length, 'customer-initiated transaction', 'customer-initiated transactions')} since ${formatDate(DETAIL_WINDOW_START)}`,
    weekly,
    earlierText:
      earlier.count > 0
        ? `${plural(earlier.count, 'earlier transaction', 'earlier transactions')}, from ${earlier.earliest}`
        : null,
    channelTitle: mixTitle(channels, customerTrx.length),
    channelMix: topWithOther(channels, CHANNEL_MIX_TOP),
    typeTitle: mixTitle(types, customerTrx.length),
    typeMix: types,
    mixEmptyText: customerTrx.length ? null : 'No customer-initiated transactions.',
  }
}

const LOANS_MISSING_TEXT = 'Facility type, collectibility, days past due, and maturity are not in the data.'

function loansOf(portfolio: readonly PortfolioItem[]): Customer360['loans'] {
  const { held, notHeld, exposure } = loanFacilities(portfolio)
  const title =
    held.length === 0
      ? 'No loan facility held.'
      : `${plural(held.length, 'loan facility', 'loan facilities')}, ${formatIDR(exposure)} in total`
  return { title, held, notHeld, exposure, missingText: LOANS_MISSING_TEXT }
}

function productsKpi(portfolio: readonly PortfolioItem[]): Customer360['kpis']['products'] {
  const held = portfolio.filter((item) => item.product_category !== 'LOAN' && isHeld(item))
  const categories = AUM_CATEGORIES.filter((c) => held.some((item) => item.product_category === c))
  return {
    count: held.length,
    categories,
    label: categories.length ? `${held.length} · ${categories.join(', ')}` : `${held.length}`,
  }
}

function customer360Of(rows: CustomerRows, asOf: string): Customer360 {
  const { profile, portfolio, transactions } = rows
  const customerTrx = transactions.filter(isCustomerInitiated)
  const lastDate = customerTrx.length ? latestActivityDate(customerTrx) : null
  const days = lastDate === null ? null : daysSince(lastDate, asOf)
  const digital = digitalCounts(transactions)
  const share = digitalShare(transactions)
  const bankRows = bankEntrySummary(transactions)
  const bankCount = bankRows.reduce((sum, row) => sum + row.count, 0)
  const evaluation = evaluateCustomer({ profile, portfolio })
  const transactionRows: TransactionRow[] = transactions
    .map((t, index) => ({ t, index }))
    .sort((a, b) => b.t.activity_date.localeCompare(a.t.activity_date) || a.index - b.index)
    .map(({ t, index }) => ({
      key: `${index}`,
      date: t.activity_date,
      method: t.transaction_method,
      type: t.transaction_type,
      amount: t.transaction_amount,
      kind: isBankEntry(t) ? 'bank' : 'customer',
    }))

  return {
    id: profile.customer_id,
    heading: `Customer ${profile.customer_id}`,
    profile: {
      gender: genderLabel(profile.gender),
      incomeBand: profile.customer_income,
      incomeRankLabel: `rank ${incomeRank(profile.customer_income)} of ${INCOME_BANDS.length}`,
      highIncome: isHighIncome(profile.customer_income),
      firstTransaction: transactions.length
        ? `First transaction ${formatMonthYear(firstActivityDate(transactions))}`
        : null,
    },
    kpis: {
      aum: customerAum(portfolio),
      loanExposure: loanExposure(portfolio),
      heldLabel: `${heldCount(portfolio)} of ${portfolio.length} rows`,
      products: productsKpi(portfolio),
      recency: {
        days,
        label: days === null ? 'No customer-initiated transactions' : `${plural(days, 'day', 'days')} since last activity`,
        lastDate,
      },
      digital: {
        share,
        meter: share === null ? 0 : Math.round(share * 100),
        label: share === null ? '—' : formatPercent(share),
        context: `${digital.digital} of ${digital.counted} customer-initiated, BANCA method excluded`,
      },
    },
    holdings: holdingsOf(portfolio),
    activity: activityOf(customerTrx, asOf),
    offers: offerPanel(evaluation),
    productOffers: productOffers(evaluation),
    channelText: channelText(transactions),
    loans: loansOf(portfolio),
    bankEntries: { title: bankCount ? plural(bankCount, 'bank entry', 'bank entries') : 'No bank entries', rows: bankRows },
    transactions: transactionRows,
    recent: transactionRows.slice(0, 5),
  }
}

/** The view model for one customer, or `null` for an unknown ID. */
export function buildCustomer360(data: Dataset, id: number): Customer360 | null {
  const rows = groupByCustomer(data).get(id)
  return rows ? customer360Of(rows, asOfDateOf(data)) : null
}

/** The rows of the transaction table for a filter: all, customer-initiated, or bank entries. */
export function filterTransactionRows(rows: readonly TransactionRow[], filter: TransactionFilter): TransactionRow[] {
  return filter === 'all' ? [...rows] : rows.filter((row) => row.kind === filter)
}

/** A route parameter as a customer ID: whole digits only, else `null`. */
export function parseCustomerId(param: string | undefined): number | null {
  return param !== undefined && /^\d+$/.test(param) ? Number(param) : null
}

export interface CustomerOption {
  id: number
  label: string
  detail: string
}

/** One search option per customer, in ID order, with gender and income band as a second line. */
export function customerOptions(data: Dataset): CustomerOption[] {
  return [...data.profiles]
    .sort((a, b) => a.customer_id - b.customer_id)
    .map((p) => ({
      id: p.customer_id,
      label: `Customer ${p.customer_id}`,
      detail: `${genderLabel(p.gender)} · ${p.customer_income}`,
    }))
}

const byCustomer = groupByCustomer(dataset)
const options = customerOptions(dataset)

export function getCustomer360(id: number): Customer360 | null {
  const rows = byCustomer.get(id)
  return rows ? customer360Of(rows, asOfDate) : null
}

export function getCustomerOptions(): CustomerOption[] {
  return options
}

/** The as-of date for the top bar, e.g. "As of 26 Apr 2024" (ADR 0005). */
export const asOfLabel = `As of ${formatDate(asOfDate)}`
