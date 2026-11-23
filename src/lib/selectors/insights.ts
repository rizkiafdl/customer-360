/** Selectors that run the insight rules over every customer (ADR 0008). */
import {
  RULE_ORDER,
  VALUE_TIERS,
  evaluateCustomer,
  type CustomerEvaluation,
  type CustomerInput,
  type RuleId,
  type ValueTier,
} from '@/lib/insights'
import type { PortfolioItem } from '@/types'
import { dataset, type Dataset } from './dataset'

/** One input per profile, in profile order, each with that customer's rows only. */
export function customerInputsOf(data: Dataset): CustomerInput[] {
  const rowsByCustomer = new Map<number, PortfolioItem[]>()
  for (const item of data.portfolio) {
    const rows = rowsByCustomer.get(item.customer_id)
    if (rows) rows.push(item)
    else rowsByCustomer.set(item.customer_id, [item])
  }
  return data.profiles.map((profile) => ({
    profile,
    portfolio: rowsByCustomer.get(profile.customer_id) ?? [],
  }))
}

export function evaluationsOf(data: Dataset): CustomerEvaluation[] {
  return customerInputsOf(data).map(evaluateCustomer)
}

/** Customers each rule fires for. Every rule is present, 0 when it never fires. */
export function ruleFireCounts(evaluations: readonly CustomerEvaluation[]): Record<RuleId, number> {
  const counts = Object.fromEntries(RULE_ORDER.map((id) => [id, 0])) as Record<RuleId, number>
  for (const evaluation of evaluations) {
    for (const insight of evaluation.insights) counts[insight.id] += 1
  }
  return counts
}

/** Customers per value tier. Every tier is present, 0 when empty. */
export function tierCounts(evaluations: readonly CustomerEvaluation[]): Record<ValueTier, number> {
  const counts = Object.fromEntries(VALUE_TIERS.map((tier) => [tier, 0])) as Record<ValueTier, number>
  for (const evaluation of evaluations) counts[evaluation.tier] += 1
  return counts
}

/** Customers with the KYC income-band note. */
export function kycNoteCount(evaluations: readonly CustomerEvaluation[]): number {
  return evaluations.filter((evaluation) => evaluation.kycNote !== null).length
}

/** Computed once at module load, in profile order. */
export const customerEvaluations: readonly CustomerEvaluation[] = evaluationsOf(dataset)

const evaluationById = new Map(customerEvaluations.map((e) => [e.customer_id, e]))

/** One customer's evaluation, or `undefined` for an unknown id. */
export function getCustomerEvaluation(customerId: number): CustomerEvaluation | undefined {
  return evaluationById.get(customerId)
}

export function getRuleFireCounts(): Record<RuleId, number> {
  return ruleFireCounts(customerEvaluations)
}

export function getTierCounts(): Record<ValueTier, number> {
  return tierCounts(customerEvaluations)
}

export function getKycNoteCount(): number {
  return kycNoteCount(customerEvaluations)
}
