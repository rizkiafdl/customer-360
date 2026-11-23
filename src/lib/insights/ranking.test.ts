import { describe, expect, it } from 'vitest'
import type { CustomerEvaluation } from './evaluate'
import { compareWorklist } from './ranking'
import { RULE_ORDER } from './rules'
import type { FiredInsight, RuleId } from './types'

function fired<Id extends RuleId | 'kyc-income-band'>(id: Id, aum: number): FiredInsight<Id> {
  return { id, fired: true, ruleText: id, evidence: { aum }, reason: id }
}

/** An evaluation with the first `rules` rules of RULE_ORDER fired. */
function evaluation(customer_id: number, aum: number, rules: number, kyc = false): CustomerEvaluation {
  return {
    customer_id,
    aum,
    insights: RULE_ORDER.slice(0, rules).map((id) => fired(id, aum)),
    kycNote: kyc ? fired('kyc-income-band', aum) : null,
  }
}

const ranked = (list: CustomerEvaluation[]) => [...list].sort(compareWorklist).map((e) => e.customer_id)

describe('compareWorklist', () => {
  it('puts more fired rules first, even at a lower AUM', () => {
    expect(ranked([evaluation(1, 9_000, 1), evaluation(2, 10, 2)])).toEqual([2, 1])
  })

  it('puts the higher AUM first when the rule counts are equal', () => {
    expect(ranked([evaluation(1, 10, 2), evaluation(2, 9_000, 2)])).toEqual([2, 1])
  })

  it('puts the lower customer_id first when rule count and AUM are equal', () => {
    expect(ranked([evaluation(7, 0, 1), evaluation(3, 0, 1)])).toEqual([3, 7])
  })

  it('puts customers with no fired rule last, ordered by AUM', () => {
    expect(ranked([evaluation(1, 50, 0), evaluation(2, 5, 1), evaluation(3, 80, 0)])).toEqual([2, 3, 1])
  })

  it('ignores the KYC note', () => {
    const plain = [evaluation(1, 50, 1), evaluation(2, 80, 1), evaluation(3, 80, 0)]
    const withKyc = [evaluation(1, 50, 1, true), evaluation(2, 80, 1), evaluation(3, 80, 0, true)]
    expect(ranked(withKyc)).toEqual(ranked(plain))
    expect(compareWorklist(evaluation(4, 10, 1, true), evaluation(4, 10, 1))).toBe(0)
  })
})
