/**
 * Offers grouped by product (ADR 0008, update 2026-11-24). The rules do not
 * change: this only groups the fired rules of one customer into one card per
 * product. Text comes from fixed templates (CLAUDE.md Rule 9).
 */
import { formatIDR } from '@/lib/format'
import type { CustomerEvaluation } from './evaluate'
import { RULE_ORDER, RULES } from './rules'
import { formatWholePercent } from './text'
import type { FiredInsight, RuleId } from './types'

export type OfferProduct = 'REKSA' | 'ORI' | 'BANCA' | 'Cash' | 'No AUM'

export interface ProductOffer {
  product: OfferProduct
  /** The supporting rules, in `RULE_ORDER`. */
  ruleIds: RuleId[]
  /** Their reason strings, unchanged. */
  reasons: string[]
  /** `cash` when the card holds `cash-heavy`, else `aum`; `null` for `No AUM`. */
  basis: { kind: 'cash' | 'aum'; amount: number } | null
  /** `REKSA · 2 rules`. */
  title: string
  /** `Cash Rp …` or `AUM Rp …`; `null` without a basis. */
  basisText: string | null
}

const GAP_PRODUCTS: Partial<Record<RuleId, OfferProduct>> = {
  'investment-gap-reksa': 'REKSA',
  'investment-gap-ori': 'ORI',
  'investment-gap-banca': 'BANCA',
  'high-income-no-banca': 'BANCA',
  'no-aum': 'No AUM',
}

function cardsFor(id: RuleId, products: ReadonlySet<OfferProduct>): OfferProduct[] {
  if (id !== 'cash-heavy') return [GAP_PRODUCTS[id]!]
  const investment = (['REKSA', 'ORI'] as const).filter((product) => products.has(product))
  return investment.length > 0 ? investment : ['Cash']
}

const orderIndex = (id: RuleId) => RULE_ORDER.indexOf(id)

/** One card per product from the fired rules. The KYC note is never a card. */
export function productOffers(evaluation: CustomerEvaluation): ProductOffer[] {
  const gapProducts = new Set(
    evaluation.insights.flatMap((insight) => (insight.id === 'cash-heavy' ? [] : [GAP_PRODUCTS[insight.id]!])),
  )
  const cards = new Map<OfferProduct, FiredInsight<RuleId>[]>()
  for (const insight of evaluation.insights) {
    for (const product of cardsFor(insight.id, gapProducts)) cards.set(product, [...(cards.get(product) ?? []), insight])
  }
  return [...cards]
    .map(([product, insights]) => {
      const sorted = [...insights].sort((a, b) => orderIndex(a.id) - orderIndex(b.id))
      const cash = sorted.find((insight) => insight.id === 'cash-heavy')
      const basis: ProductOffer['basis'] =
        product === 'No AUM'
          ? null
          : cash
            ? { kind: 'cash', amount: cash.evidence.cashAmount ?? 0 }
            : { kind: 'aum', amount: evaluation.aum }
      const n = sorted.length
      return {
        product,
        ruleIds: sorted.map((insight) => insight.id),
        reasons: sorted.map((insight) => insight.reason),
        basis,
        title: `${product} · ${n} ${n === 1 ? 'rule' : 'rules'}`,
        basisText: basis && `${basis.kind === 'cash' ? 'Cash' : 'AUM'} ${formatIDR(basis.amount)}`,
      }
    })
    .sort(
      (a, b) =>
        b.ruleIds.length - a.ruleIds.length ||
        (b.basis?.amount ?? -1) - (a.basis?.amount ?? -1) ||
        orderIndex(a.ruleIds[0]!) - orderIndex(b.ruleIds[0]!),
    )
}

/** Short chip text: `Cash-heavy 84%` for cash-heavy, the rule label for every other rule. */
export function ruleChip(insight: FiredInsight<RuleId>): string {
  if (insight.id === 'cash-heavy') {
    return `Cash-heavy ${formatWholePercent(insight.evidence.cashAmount ?? 0, insight.evidence.aum)}`
  }
  return RULES.find((rule) => rule.id === insight.id)!.label
}
