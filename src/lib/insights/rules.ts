/**
 * The insight rules (ADR 0008). Each rule is a pure function of one
 * customer's inputs. Reasons come from fixed templates (CLAUDE.md Rule 9).
 */
import { HIGH_INCOME_MIN_RANK, customerAum, isHeld, isHighIncome } from '@/lib/domain'
import { formatIDR } from '@/lib/format'
import type { PortfolioItem } from '@/types'
import { cashAmount } from './cash'
import { formatSharePercent, formatWholePercent, incomeBandAtRank } from './text'
import {
  CASH_HEAVY_MIN_SHARE,
  DEPOSIT_PRODUCT_PREFIX,
  INVESTMENT_GAP_MIN_AUM,
} from './thresholds'
import type {
  CustomerInput,
  InsightEvidence,
  InsightId,
  InsightResult,
  InvestmentCategory,
  RuleId,
} from './types'

/**
 * The fixed rule order. F3 shows fired rules in this order; F4's top reason
 * is the first fired rule in it. User decision, 2026-11-23.
 */
export const RULE_ORDER = [
  'cash-heavy',
  'investment-gap-reksa',
  'investment-gap-ori',
  'investment-gap-banca',
  'no-aum',
  'high-income-no-banca',
] as const satisfies readonly RuleId[]

/** Builds the shared result shape. `reason` runs only when the rule fired. */
export function insightResult<Id extends InsightId>(
  id: Id,
  ruleText: string,
  evidence: InsightEvidence,
  fired: boolean,
  reason: () => string,
): InsightResult<Id> {
  return fired
    ? { id, fired: true, ruleText, evidence, reason: reason() }
    : { id, fired: false, ruleText, evidence, reason: null }
}

function holdsCategory(items: readonly PortfolioItem[], category: InvestmentCategory): boolean {
  return items.some((item) => item.product_category === category && isHeld(item))
}

const CASH_HEAVY_TEXT =
  `Cash is at least ${formatSharePercent(CASH_HEAVY_MIN_SHARE)} of AUM, and AUM is above ${formatIDR(0)}. ` +
  `Cash = FUNDING products whose name does not start with ${DEPOSIT_PRODUCT_PREFIX}.`

/** AUM above 0 and cash at least 80% of AUM. */
export function cashHeavy({ portfolio }: CustomerInput): InsightResult<'cash-heavy'> {
  const aum = customerAum(portfolio)
  const cash = cashAmount(portfolio)
  const evidence: InsightEvidence =
    aum > 0 ? { aum, cashAmount: cash, cashShare: cash / aum } : { aum, cashAmount: cash }
  const fired = aum > 0 && cash / aum >= CASH_HEAVY_MIN_SHARE
  return insightResult(
    'cash-heavy',
    CASH_HEAVY_TEXT,
    evidence,
    fired,
    () => `${formatWholePercent(cash, aum)} of AUM in cash. AUM ${formatIDR(aum)}, cash ${formatIDR(cash)}.`,
  )
}

const GAP_IDS = {
  REKSA: 'investment-gap-reksa',
  ORI: 'investment-gap-ori',
  BANCA: 'investment-gap-banca',
} as const satisfies Record<InvestmentCategory, RuleId>

type GapId = (typeof GAP_IDS)[InvestmentCategory]

function gapText(category: InvestmentCategory): string {
  return `Holds no ${category}, and AUM is above ${formatIDR(INVESTMENT_GAP_MIN_AUM)}.`
}

/** Holds no row of the category, and AUM above Rp 100.000.000. */
export function investmentGap(
  category: InvestmentCategory,
  { portfolio }: CustomerInput,
): InsightResult<GapId> {
  const aum = customerAum(portfolio)
  const fired = !holdsCategory(portfolio, category) && aum > INVESTMENT_GAP_MIN_AUM
  return insightResult(
    GAP_IDS[category],
    gapText(category),
    { aum, missingCategory: category },
    fired,
    () => `No ${category}. AUM ${formatIDR(aum)}.`,
  )
}

/** AUM is 0. Includes customers with no portfolio rows. */
export function noAum({ portfolio }: CustomerInput): InsightResult<'no-aum'> {
  const aum = customerAum(portfolio)
  return insightResult('no-aum', `AUM is ${formatIDR(0)}.`, { aum }, aum === 0, () => `AUM ${formatIDR(aum)}.`)
}

const HIGH_INCOME_TEXT = `Income band ${incomeBandAtRank(HIGH_INCOME_MIN_RANK)} or above, and holds no BANCA.`

/** High income (Part 2) and holds no BANCA. */
export function highIncomeWithoutBanca({
  profile,
  portfolio,
}: CustomerInput): InsightResult<'high-income-no-banca'> {
  const band = profile.customer_income
  const fired = isHighIncome(band) && !holdsCategory(portfolio, 'BANCA')
  return insightResult(
    'high-income-no-banca',
    HIGH_INCOME_TEXT,
    { aum: customerAum(portfolio), incomeBand: band, missingCategory: 'BANCA' },
    fired,
    () => `No BANCA. Income band ${band}.`,
  )
}

/** One rule with what F3, F4, and F6 show about it. */
export interface RuleDefinition {
  id: RuleId
  /** Short name for filters and badges. */
  label: string
  ruleText: string
  /** Where the threshold comes from. */
  source: string
  evaluate: (input: CustomerInput) => InsightResult<RuleId>
}

const USER_DECISION = 'User decision, 2026-11-23.'

function gapRule(category: InvestmentCategory): RuleDefinition {
  return {
    id: GAP_IDS[category],
    label: `No ${category}`,
    ruleText: gapText(category),
    source: `AUM floor ${formatIDR(INVESTMENT_GAP_MIN_AUM)}: Part 1 cut-off, reused by user decision, 2026-11-23.`,
    evaluate: (input) => investmentGap(category, input),
  }
}

/** Every rule, in `RULE_ORDER`. */
export const RULES: readonly RuleDefinition[] = [
  {
    id: 'cash-heavy',
    label: 'Cash-heavy AUM',
    ruleText: CASH_HEAVY_TEXT,
    source: `Cut-off ${formatSharePercent(CASH_HEAVY_MIN_SHARE)} and the ${DEPOSIT_PRODUCT_PREFIX} split: ${USER_DECISION}`,
    evaluate: cashHeavy,
  },
  gapRule('REKSA'),
  gapRule('ORI'),
  gapRule('BANCA'),
  {
    id: 'no-aum',
    label: 'No AUM',
    ruleText: `AUM is ${formatIDR(0)}.`,
    source: `${USER_DECISION} AUM as defined in Part 2.`,
    evaluate: noAum,
  },
  {
    id: 'high-income-no-banca',
    label: 'High income, no BANCA',
    ruleText: HIGH_INCOME_TEXT,
    source:
      'High income (income rank 5 or above): Part 2. Part 2 found the highest BANCA lift for ' +
      'high-income customers; the result was directional, not significant.',
    evaluate: highIncomeWithoutBanca,
  },
]
