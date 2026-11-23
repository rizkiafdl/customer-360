/** The insight contract shared by every rule and the KYC note (ADR 0008). */
import type { IncomeBand, PortfolioItem, ProductCategory, Profile } from '@/types'

/** One customer's inputs. The portfolio holds that customer's rows only. */
export interface CustomerInput {
  profile: Profile
  portfolio: readonly PortfolioItem[]
}

/** Categories that have an investment gap rule. */
export type InvestmentCategory = Extract<ProductCategory, 'ORI' | 'BANCA' | 'REKSA'>

export type RuleId =
  | 'cash-heavy'
  | 'investment-gap-reksa'
  | 'investment-gap-ori'
  | 'investment-gap-banca'
  | 'no-aum'
  | 'high-income-no-banca'

/** The KYC income-band note. A note, not an offer: it is not a rule. */
export type NoteId = 'kyc-income-band'

export type InsightId = RuleId | NoteId

/** The values a rule looked at. `aum` is always present. */
export interface InsightEvidence {
  aum: number
  /** Sum of cash rows (FUNDING, not `DEPO*`, named). */
  cashAmount?: number
  /** `cashAmount / aum`, 0 to 1. Absent when AUM is 0. */
  cashShare?: number
  /** The category the customer holds no row of. */
  missingCategory?: InvestmentCategory
  incomeBand?: IncomeBand
}

interface InsightBase<Id extends InsightId> {
  id: Id
  /** The condition, with the threshold value. */
  ruleText: string
  evidence: InsightEvidence
}

export interface FiredInsight<Id extends InsightId = InsightId> extends InsightBase<Id> {
  fired: true
  /** The fired rule plus its evidence numbers, from a fixed template (CLAUDE.md Rule 9). */
  reason: string
}

export interface UnfiredInsight<Id extends InsightId = InsightId> extends InsightBase<Id> {
  fired: false
  reason: null
}

export type InsightResult<Id extends InsightId = InsightId> = FiredInsight<Id> | UnfiredInsight<Id>
