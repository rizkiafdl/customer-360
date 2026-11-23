/**
 * The book overview at `/overview` (F5 spec, section 5): totals, customers
 * per opportunity type, and two charts with fact titles.
 *
 * `buildOverview(data)` is the pure selector. `getOverview()` reads the real
 * data, built once at module load.
 */
import { AUM_CATEGORIES, CATEGORY_COLORS, holdsCategory, incomeRank } from '@/lib/domain'
import { RULES, type RuleId } from '@/lib/insights'
import { formatDate } from '@/lib/format'
import { INCOME_BANDS, type IncomeBand, type ProductCategory } from '@/types'
import { asOfDateOf, bookCustomersOf } from './book'
import { dataset, type Dataset } from './dataset'
import { ruleFireCounts } from './insights'

export interface ScatterPoint {
  customerId: number
  rank: number
  band: IncomeBand
  aum: number
  kyc: boolean
}

export interface Overview {
  header: string
  /** Two totals. Never added together. */
  totals: { aum: number; loanExposure: number }
  /**
   * One entry per rule, in `RULE_ORDER`. `to` opens the worklist filtered by
   * the rule. `name` is the link's accessible name (`No ORI: 37 customers`).
   */
  opportunities: { id: RuleId; label: string; count: number; name: string; to: string }[]
  penetration: { title: string; bars: { label: ProductCategory; value: number; color: string }[] }
  scatter: {
    title: string
    /** How many customers are left out (AUM 0), or `null` when none are. */
    footer: string | null
    ticks: { rank: number; band: IncomeBand }[]
    /** Log y axis ticks: each power of ten from at or below the lowest AUM to at or above the highest. Empty with no points. */
    aumTicks: number[]
    /** AUM above 0 only: the y axis is log scale. */
    points: ScatterPoint[]
  }
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/**
 * Powers of ten that cover `values`, at least two so the log axis has a
 * range. Assumes every value is at least 1 (AUM is whole rupiah above 0).
 * Built by multiplying, so each tick is exact.
 */
export function powerOfTenTicks(values: readonly number[]): number[] {
  if (values.length === 0) return []
  const min = Math.min(...values)
  const max = Math.max(...values)
  let tick = 1
  while (tick * 10 <= min) tick *= 10
  const ticks = [tick]
  while (tick < max || ticks.length < 2) {
    tick *= 10
    ticks.push(tick)
  }
  return ticks
}

/** The four AUM categories first, then LOAN. */
const PENETRATION_ORDER: readonly ProductCategory[] = [...AUM_CATEGORIES, 'LOAN']

export function buildOverview(data: Dataset): Overview {
  const book = bookCustomersOf(data)
  const total = book.length
  const counts = ruleFireCounts(book.map((c) => c.evaluation))

  const bars = PENETRATION_ORDER.map((category) => ({
    label: category,
    value: book.filter((c) => holdsCategory(c.portfolio, category)).length,
    color: CATEGORY_COLORS[category],
  }))
  // Lowest count; a tie goes to the earlier category in PENETRATION_ORDER.
  const lowest = bars.reduce((low, bar) => (bar.value < low.value ? bar : low))

  const points = book
    .filter((c) => c.evaluation.aum > 0)
    .map((c) => ({
      customerId: c.profile.customer_id,
      rank: incomeRank(c.profile.customer_income),
      band: c.profile.customer_income,
      aum: c.evaluation.aum,
      kyc: c.evaluation.kycNote !== null,
    }))
  const kycPoints = points.filter((p) => p.kyc).length
  const left = total - points.length

  return {
    header: `As of ${formatDate(asOfDateOf(data))} · ${plural(total, 'customer', 'customers')}`,
    totals: {
      aum: book.reduce((sum, c) => sum + c.evaluation.aum, 0),
      loanExposure: book.reduce((sum, c) => sum + c.loanExposure, 0),
    },
    opportunities: RULES.map((rule) => ({
      id: rule.id,
      label: rule.label,
      count: counts[rule.id],
      name: `${rule.label}: ${plural(counts[rule.id], 'customer', 'customers')}`,
      to: `/?rule=${rule.id}`,
    })),
    penetration: {
      title: `${lowest.label} held by ${lowest.value} of ${plural(total, 'customer', 'customers')}`,
      bars,
    },
    scatter: {
      title: `${plural(points.length, 'customer', 'customers')} with AUM, ${kycPoints} with the KYC note`,
      footer: left === 0 ? null : `${plural(left, 'customer with no AUM is', 'customers with no AUM are')} not plotted.`,
      ticks: INCOME_BANDS.map((band) => ({ rank: incomeRank(band), band })),
      aumTicks: powerOfTenTicks(points.map((p) => p.aum)),
      points,
    },
  }
}

const overview = buildOverview(dataset)

export function getOverview(): Overview {
  return overview
}
