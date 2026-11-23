/**
 * The Portfolio page at `/` (redesign v2 spec, section 5.3): book tiles,
 * opportunity tiles, product penetration, and the income-vs-AUM scatter,
 * all over one income band or the whole book.
 *
 * `buildPortfolio(data, band)` is the pure selector. `getPortfolio(band)`
 * reads the real data and builds each band once.
 */
import { AUM_CATEGORIES, CATEGORY_COLORS, holdsCategory, incomeRank } from '@/lib/domain'
import { formatDate, formatIDR } from '@/lib/format'
import { KYC_NOTE, RULES, type RuleId } from '@/lib/insights'
import { INCOME_BANDS, type IncomeBand, type ProductCategory } from '@/types'
import { asOfDateOf, bookCustomersOf, type BookCustomer } from './book'
import { customersQuery, type LacksCategory } from './customers'
import { dataset, type Dataset } from './dataset'
import { ruleFireCounts } from './insights'
import { scatterOf, type Overview } from './overview'

export interface Portfolio {
  header: string
  /** The income band filter, or `null` for the whole book. */
  band: { rank: number; label: IncomeBand } | null
  customers: { count: number; withAum: number; withoutAum: number; text: string }
  /** Two totals. Never added together. */
  totals: { aum: number; loanExposure: number }
  kyc: { count: number; text: string; to: string }
  opportunitiesLine: string
  /** One entry per rule, in `RULE_ORDER`. The tiles overlap, so the amounts are never added. */
  opportunities: {
    id: RuleId
    label: string
    count: number
    ruleText: string
    amountLine: string | null
    to: string
  }[]
  /** The four AUM categories, then LOAN. LOAN has no link: no rule offers it. */
  penetration: { label: ProductCategory; held: number; notHeld: number; color: string; to: string | null }[]
  scatter: Overview['scatter']
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

const sum = (values: readonly number[]) => values.reduce((total, value) => total + value, 0)

const PENETRATION_ORDER: readonly ProductCategory[] = [...AUM_CATEGORIES, 'LOAN']

function isLacksCategory(category: ProductCategory): category is LacksCategory {
  return category !== 'LOAN'
}

/** What a tile's amount line sums. `null` for `no-aum` and for a rule that fired for nobody. */
function amountLine(id: RuleId, fired: readonly BookCustomer[]): string | null {
  if (fired.length === 0) return null
  switch (id) {
    case 'cash-heavy':
      return `Cash ${formatIDR(sum(fired.map((c) => c.cash)))}`
    case 'no-aum':
      return null
    case 'high-income-no-banca': {
      const both = fired.filter((c) => c.evaluation.insights.some((i) => i.id === 'investment-gap-banca')).length
      return `${both} also in No BANCA`
    }
    default:
      return `AUM ${formatIDR(sum(fired.map((c) => c.evaluation.aum)))}`
  }
}

function validBand(band: number | null): number | null {
  return band !== null && Number.isInteger(band) && band >= 1 && band <= INCOME_BANDS.length ? band : null
}

export function buildPortfolio(data: Dataset, bandRank: number | null): Portfolio {
  const rank = validBand(bandRank)
  const all = bookCustomersOf(data)
  const book = rank === null ? all : all.filter((c) => incomeRank(c.profile.customer_income) === rank)
  const band = rank === null ? null : { rank, label: INCOME_BANDS[rank - 1]! }
  const counts = ruleFireCounts(book.map((c) => c.evaluation))
  const withAum = book.filter((c) => c.evaluation.aum > 0).length
  const count = book.length
  const asOf = `As of ${formatDate(asOfDateOf(data))}`

  return {
    header:
      band === null
        ? `${asOf} · ${plural(count, 'customer', 'customers')}`
        : `${asOf} · ${count} of ${plural(all.length, 'customer', 'customers')}, income ${band.label}`,
    band,
    customers: { count, withAum, withoutAum: count - withAum, text: `${withAum} with AUM · ${count - withAum} without` },
    totals: { aum: sum(book.map((c) => c.evaluation.aum)), loanExposure: sum(book.map((c) => c.loanExposure)) },
    kyc: {
      count: book.filter((c) => c.evaluation.kycNote !== null).length,
      text: KYC_NOTE.ruleText,
      to: `/customers${customersQuery({ band: rank, kyc: true })}`,
    },
    opportunitiesLine: `${plural(
      book.filter((c) => c.evaluation.insights.length > 0).length,
      'customer',
      'customers',
    )} with at least one opportunity`,
    opportunities: RULES.map((rule) => ({
      id: rule.id,
      label: rule.label,
      count: counts[rule.id],
      ruleText: rule.ruleText,
      amountLine: amountLine(
        rule.id,
        book.filter((c) => c.evaluation.insights.some((i) => i.id === rule.id)),
      ),
      to: `/customers${customersQuery({ rule: rule.id, band: rank })}`,
    })),
    penetration: PENETRATION_ORDER.map((category) => {
      const held = book.filter((c) => holdsCategory(c.portfolio, category)).length
      return {
        label: category,
        held,
        notHeld: count - held,
        color: CATEGORY_COLORS[category],
        to: isLacksCategory(category) ? `/customers${customersQuery({ band: rank, lacks: category })}` : null,
      }
    }),
    scatter: scatterOf(book),
  }
}

const portfolios = new Map<number | null, Portfolio>()

/** The real-data Portfolio for a band (`null` = whole book), built once per band. */
export function getPortfolio(band: number | null): Portfolio {
  const key = validBand(band)
  let portfolio = portfolios.get(key)
  if (portfolio === undefined) {
    portfolio = buildPortfolio(dataset, key)
    portfolios.set(key, portfolio)
  }
  return portfolio
}
