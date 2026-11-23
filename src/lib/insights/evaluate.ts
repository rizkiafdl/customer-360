/** All insights for one customer (ADR 0008). */
import { customerAum } from '@/lib/domain'
import { kycIncomeBandNote } from './kyc'
import { RULES } from './rules'
import { valueTier, type ValueTier } from './tiers'
import type { CustomerInput, FiredInsight, InsightResult, RuleId } from './types'

export interface CustomerEvaluation {
  customer_id: number
  aum: number
  tier: ValueTier
  /** Fired rules only, in `RULE_ORDER`. The first one is the top reason. */
  insights: readonly FiredInsight<RuleId>[]
  /** The KYC income-band note when it fired, else `null`. Never a top reason. */
  kycNote: FiredInsight<'kyc-income-band'> | null
}

function isFired<Id extends RuleId | 'kyc-income-band'>(
  result: InsightResult<Id>,
): result is FiredInsight<Id> {
  return result.fired
}

export function evaluateCustomer(input: CustomerInput): CustomerEvaluation {
  const aum = customerAum(input.portfolio)
  const kyc = kycIncomeBandNote(input)
  return {
    customer_id: input.profile.customer_id,
    aum,
    tier: valueTier(aum),
    insights: RULES.map((rule) => rule.evaluate(input)).filter(isFired),
    kycNote: isFired(kyc) ? kyc : null,
  }
}
