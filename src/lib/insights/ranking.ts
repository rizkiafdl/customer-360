/**
 * The worklist order (F4, user decision 2026-11-23): more fired rules first,
 * then higher AUM, then lower `customer_id`. Customers with no fired rule
 * fall to the bottom by the same order. The KYC note is not an input.
 */
import type { CustomerEvaluation } from './evaluate'

export function compareWorklist(a: CustomerEvaluation, b: CustomerEvaluation): number {
  return b.insights.length - a.insights.length || b.aum - a.aum || a.customer_id - b.customer_id
}
