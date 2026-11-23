import { describe, expect, it } from 'vitest'
import {
  RULES,
  RULE_ORDER,
  cashHeavy,
  highIncomeWithoutBanca,
  investmentGap,
  noAum,
} from './rules'
import { customer, row, rp } from './test-fixtures'

describe('RULE_ORDER', () => {
  it('is cash-heavy, the gaps (REKSA, ORI, BANCA), no AUM, then high income without BANCA', () => {
    expect(RULE_ORDER).toEqual([
      'cash-heavy',
      'investment-gap-reksa',
      'investment-gap-ori',
      'investment-gap-banca',
      'no-aum',
      'high-income-no-banca',
    ])
  })

  it('RULES follow RULE_ORDER, one definition per rule', () => {
    expect(RULES.map((rule) => rule.id)).toEqual(RULE_ORDER)
  })

  it('every rule has a label and a source', () => {
    for (const rule of RULES) {
      expect(rule.label).not.toBe('')
      expect(rule.source).not.toBe('')
    }
  })
})

describe('cashHeavy', () => {
  it('has the rule text with the threshold', () => {
    expect(cashHeavy(customer([])).ruleText).toBe(
      rp('Cash is at least 80% of AUM, and AUM is above Rp 0. Cash = FUNDING products whose name does not start with DEPO.'),
    )
  })

  it('fires at 92% cash, with the exact reason and evidence', () => {
    const result = cashHeavy(
      customer([row('FUNDING', 1_273_464_000, 'TABSYA'), row('FUNDING', 110_736_000, 'DEPOSITO03')]),
    )
    expect(result.fired).toBe(true)
    expect(result.reason).toBe(
      rp('92% of AUM in cash. AUM Rp 1.384.200.000, cash Rp 1.273.464.000.'),
    )
    expect(result.evidence).toEqual({
      aum: 1_384_200_000,
      cashAmount: 1_273_464_000,
      cashShare: 0.92,
    })
  })

  it('fires at exactly 80%', () => {
    const result = cashHeavy(customer([row('FUNDING', 800, 'TAKA'), row('FUNDING', 200, 'DEPOSITO01')]))
    expect(result.fired).toBe(true)
    expect(result.reason).toBe(rp('80% of AUM in cash. AUM Rp 1.000, cash Rp 800.'))
  })

  it('does not fire just below 80%', () => {
    const result = cashHeavy(customer([row('FUNDING', 7_999, 'TAKA'), row('FUNDING', 2_001, 'DEPOSITO01')]))
    expect(result.fired).toBe(false)
    expect(result.reason).toBeNull()
  })

  it('counts ORI, BANCA, and REKSA in the AUM it divides by', () => {
    expect(cashHeavy(customer([row('FUNDING', 800), row('REKSA', 200, 'REKSA')])).fired).toBe(true)
    expect(cashHeavy(customer([row('FUNDING', 800), row('REKSA', 201, 'REKSA')])).fired).toBe(false)
  })

  it('does not count LOAN in AUM or GIRO under LOAN as cash', () => {
    const rows = [row('LOAN', 10_000, 'GIRO'), row('FUNDING', 50), row('FUNDING', 50, 'DEPOSITO01')]
    expect(cashHeavy(customer(rows)).fired).toBe(false)
  })

  it('does not fire for no portfolio rows', () => {
    const result = cashHeavy(customer([]))
    expect(result.fired).toBe(false)
    expect(result.evidence).toEqual({ aum: 0, cashAmount: 0 })
  })

  it('does not fire when AUM is 0', () => {
    expect(cashHeavy(customer([row('FUNDING', 0), row('LOAN', 500, 'KPR')])).fired).toBe(false)
  })

  it('counts a null amount as 0', () => {
    expect(cashHeavy(customer([row('FUNDING', null), row('FUNDING', 100, 'DEPOSITO01')])).fired).toBe(false)
    expect(cashHeavy(customer([row('FUNDING', 100), row('FUNDING', null, 'DEPOSITO01')])).fired).toBe(true)
  })

  it('does not count a null product as cash', () => {
    const result = cashHeavy(customer([row('FUNDING', 900, null), row('FUNDING', 100, 'DEPOSITO01')]))
    expect(result.fired).toBe(false)
    expect(result.evidence.cashAmount).toBe(0)
  })
})

describe('investmentGap', () => {
  it('has the rule text with the threshold', () => {
    expect(investmentGap('REKSA', customer([])).ruleText).toBe(
      rp('Holds no REKSA, and AUM is above Rp 100.000.000.'),
    )
  })

  it.each([
    ['REKSA', 'investment-gap-reksa'],
    ['ORI', 'investment-gap-ori'],
    ['BANCA', 'investment-gap-banca'],
  ] as const)('fires for no %s above the AUM floor, with the exact reason', (category, id) => {
    const result = investmentGap(category, customer([row('FUNDING', 1_384_200_000)]))
    expect(result.id).toBe(id)
    expect(result.fired).toBe(true)
    expect(result.reason).toBe(rp(`No ${category}. AUM Rp 1.384.200.000.`))
    expect(result.evidence).toEqual({ aum: 1_384_200_000, missingCategory: category })
  })

  it('does not fire when the category is held', () => {
    const rows = [row('FUNDING', 500_000_000), row('ORI', 1, 'ORI')]
    expect(investmentGap('ORI', customer(rows)).fired).toBe(false)
  })

  it('fires when the category has only zero or null rows (not held)', () => {
    const rows = [row('FUNDING', 500_000_000), row('BANCA', 0, 'BANCA'), row('BANCA', null, 'BANCA')]
    expect(investmentGap('BANCA', customer(rows)).fired).toBe(true)
  })

  it('does not fire at exactly Rp 100.000.000 (the rule is AUM above the floor)', () => {
    expect(investmentGap('REKSA', customer([row('FUNDING', 100_000_000)])).fired).toBe(false)
    expect(investmentGap('REKSA', customer([row('FUNDING', 100_000_001)])).fired).toBe(true)
  })

  it('does not fire for no portfolio rows or AUM 0', () => {
    expect(investmentGap('ORI', customer([])).fired).toBe(false)
    expect(investmentGap('ORI', customer([row('FUNDING', 0), row('LOAN', 900_000_000, 'KPR')])).fired).toBe(false)
  })

  it('counts a null amount as 0 in AUM', () => {
    const rows = [row('FUNDING', null), row('FUNDING', 100_000_000, 'DEPOSITO01')]
    expect(investmentGap('REKSA', customer(rows)).fired).toBe(false)
  })

  it('counts a FUNDING row with a null product in AUM', () => {
    expect(investmentGap('REKSA', customer([row('FUNDING', 200_000_000, null)])).fired).toBe(true)
  })
})

describe('noAum', () => {
  it('has the rule text', () => {
    expect(noAum(customer([])).ruleText).toBe(rp('AUM is Rp 0.'))
  })

  it('fires for no portfolio rows, with the exact reason', () => {
    const result = noAum(customer([]))
    expect(result.fired).toBe(true)
    expect(result.reason).toBe(rp('AUM Rp 0.'))
    expect(result.evidence).toEqual({ aum: 0 })
  })

  it('fires when every AUM row is 0 or null, and ignores LOAN', () => {
    const rows = [row('FUNDING', 0), row('ORI', null, 'ORI'), row('LOAN', 900_000, 'KPR')]
    expect(noAum(customer(rows)).fired).toBe(true)
  })

  it('fires for a null product row with a null amount', () => {
    expect(noAum(customer([row('LOAN', null, null)])).fired).toBe(true)
  })

  it('does not fire when AUM is above 0', () => {
    const result = noAum(customer([row('FUNDING', 1)]))
    expect(result.fired).toBe(false)
    expect(result.reason).toBeNull()
  })
})

describe('highIncomeWithoutBanca', () => {
  it('has the rule text with the threshold', () => {
    expect(highIncomeWithoutBanca(customer([])).ruleText).toBe(
      'Income band >10 Juta - 25 Juta or above, and holds no BANCA.',
    )
  })

  it('fires for high income and no BANCA, with the exact reason', () => {
    const result = highIncomeWithoutBanca(customer([row('FUNDING', 5_000)], '>25 Juta - 50 Juta'))
    expect(result.fired).toBe(true)
    expect(result.reason).toBe('No BANCA. Income band >25 Juta - 50 Juta.')
    expect(result.evidence).toEqual({ aum: 5_000, incomeBand: '>25 Juta - 50 Juta', missingCategory: 'BANCA' })
  })

  it('fires at the high-income floor (rank 5) and not just below it (rank 4)', () => {
    expect(highIncomeWithoutBanca(customer([], '>10 Juta - 25 Juta')).fired).toBe(true)
    expect(highIncomeWithoutBanca(customer([], '>5 Juta - 10 Juta')).fired).toBe(false)
  })

  it('does not fire when BANCA is held', () => {
    expect(highIncomeWithoutBanca(customer([row('BANCA', 1, 'BANCA')], '>100 Juta')).fired).toBe(false)
  })

  it('fires for no portfolio rows, AUM 0, or a BANCA row that is 0 or null', () => {
    expect(highIncomeWithoutBanca(customer([], '>100 Juta')).fired).toBe(true)
    expect(highIncomeWithoutBanca(customer([row('BANCA', 0, 'BANCA')], '>100 Juta')).fired).toBe(true)
    expect(highIncomeWithoutBanca(customer([row('BANCA', null, null)], '>100 Juta')).fired).toBe(true)
  })
})
