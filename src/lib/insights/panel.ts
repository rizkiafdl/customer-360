/**
 * The "What to offer" panel (F3): fired rules as cards, a fixed empty line,
 * and the KYC note apart. Every string here is fixed copy (CLAUDE.md Rule 9).
 */
import type { CustomerEvaluation } from './evaluate'
import { KYC_NOTE } from './kyc'
import { RULES } from './rules'
import type { FiredInsight, InsightId } from './types'

/** The card kinds from the F1 insight card design. F3 uses `opportunity` and `warning`. */
export type InsightKind = 'opportunity' | 'warning' | 'info'

/** Offer rules are opportunities; the KYC note is a warning (F1 spec 4.2). */
export const INSIGHT_KINDS: Readonly<Record<InsightId, InsightKind>> = {
  'cash-heavy': 'opportunity',
  'investment-gap-reksa': 'opportunity',
  'investment-gap-ori': 'opportunity',
  'investment-gap-banca': 'opportunity',
  'no-aum': 'opportunity',
  'high-income-no-banca': 'opportunity',
  'kyc-income-band': 'warning',
}

export const KIND_LABELS: Readonly<Record<InsightKind, string>> = {
  opportunity: 'Opportunity',
  warning: 'Warning',
  info: 'Info',
}

export const OFFER_PANEL_TITLE = 'What to offer'
export const OFFER_PANEL_EMPTY = 'No offer rule fired.'
export const OFFER_PANEL_NOTE_HEADING = 'Note'
/** The accessible name of the list of offer cards. */
export const OFFERS_LIST_LABEL = 'Offers'

export interface OfferCard {
  id: InsightId
  kind: InsightKind
  kindLabel: string
  label: string
  reason: string
  ruleText: string
}

export interface OfferPanel {
  /** Fired rules in `RULE_ORDER`, never deduped. Never holds the KYC note. */
  cards: OfferCard[]
  /** The empty-state line when `cards` is empty, else `null`. */
  emptyText: string | null
  /** The KYC income-band note, or `null` when it did not fire. */
  note: OfferCard | null
}

const LABELS: ReadonlyMap<InsightId, string> = new Map<InsightId, string>([
  ...RULES.map((rule) => [rule.id, rule.label] as const),
  [KYC_NOTE.id, KYC_NOTE.label],
])

function card(insight: FiredInsight): OfferCard {
  const kind = INSIGHT_KINDS[insight.id]
  return {
    id: insight.id,
    kind,
    kindLabel: KIND_LABELS[kind],
    label: LABELS.get(insight.id) ?? insight.id,
    reason: insight.reason,
    ruleText: insight.ruleText,
  }
}

export function offerPanel(evaluation: CustomerEvaluation): OfferPanel {
  const cards = evaluation.insights.map(card)
  return {
    cards,
    emptyText: cards.length === 0 ? OFFER_PANEL_EMPTY : null,
    note: evaluation.kycNote ? card(evaluation.kycNote) : null,
  }
}
