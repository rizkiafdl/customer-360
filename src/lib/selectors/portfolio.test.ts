import { describe, expect, it } from 'vitest'
import { CATEGORY_COLORS } from '@/lib/domain'
import { KYC_NOTE, RULES } from '@/lib/insights'
import { rp } from '@/lib/insights/test-fixtures'
import { fixtureDataset } from '@/test/fixtures'
import { buildPortfolio, getPortfolio } from './portfolio'

describe('buildPortfolio, no band', () => {
  const portfolio = buildPortfolio(fixtureDataset, null)

  it('shows the header and the band as none', () => {
    expect(portfolio.header).toBe('As of 26 Apr 2024 · 4 customers')
    expect(portfolio.band).toBeNull()
  })

  it('counts customers with and without AUM', () => {
    expect(portfolio.customers).toEqual({ count: 4, withAum: 2, withoutAum: 2, text: '2 with AUM · 2 without' })
  })

  it('keeps AUM and loan exposure as two totals', () => {
    expect(portfolio.totals).toEqual({ aum: 2_000_000_000, loanExposure: 273_800_000 })
  })

  it('counts the KYC note and links to the customers with it', () => {
    expect(portfolio.kyc).toEqual({ count: 1, text: KYC_NOTE.ruleText, to: '/customers?kyc=yes' })
  })

  it('counts customers with at least one opportunity', () => {
    expect(portfolio.opportunitiesLine).toBe('3 customers with at least one opportunity')
  })

  it('lists every rule in RULE_ORDER with its count, rule text, amount line, and link', () => {
    expect(portfolio.opportunities.map((o) => [o.id, o.label, o.count, o.amountLine, o.to])).toEqual([
      ['cash-heavy', 'Cash-heavy AUM', 0, null, '/customers?rule=cash-heavy'],
      ['investment-gap-reksa', 'No REKSA', 0, null, '/customers?rule=investment-gap-reksa'],
      ['investment-gap-ori', 'No ORI', 0, null, '/customers?rule=investment-gap-ori'],
      ['investment-gap-banca', 'No BANCA', 1, rp('AUM Rp 1.000.000.000'), '/customers?rule=investment-gap-banca'],
      ['no-aum', 'No AUM', 2, null, '/customers?rule=no-aum'],
      ['high-income-no-banca', 'High income, no BANCA', 1, '1 also in No BANCA', '/customers?rule=high-income-no-banca'],
    ])
    expect(portfolio.opportunities.map((o) => o.ruleText)).toEqual(RULES.map((rule) => rule.ruleText))
  })

  it('shows held and not held per category; LOAN has no link', () => {
    expect(portfolio.penetration).toEqual([
      { label: 'FUNDING', held: 2, notHeld: 2, color: CATEGORY_COLORS.FUNDING, to: '/customers?lacks=FUNDING' },
      { label: 'ORI', held: 2, notHeld: 2, color: CATEGORY_COLORS.ORI, to: '/customers?lacks=ORI' },
      { label: 'BANCA', held: 1, notHeld: 3, color: CATEGORY_COLORS.BANCA, to: '/customers?lacks=BANCA' },
      { label: 'REKSA', held: 2, notHeld: 2, color: CATEGORY_COLORS.REKSA, to: '/customers?lacks=REKSA' },
      { label: 'LOAN', held: 2, notHeld: 2, color: CATEGORY_COLORS.LOAN, to: null },
    ])
  })

  it('plots customers with AUM only', () => {
    expect(portfolio.scatter.points.map((p) => p.customerId)).toEqual([1, 4])
    expect(portfolio.scatter.footer).toBe('2 customers with no AUM are not plotted.')
  })
})

describe('buildPortfolio, with a band', () => {
  // Customer 3 is the only one at rank 3; their latest row is 2024-04-20.
  const portfolio = buildPortfolio(fixtureDataset, 3)

  it('keeps the book as-of date and names the band', () => {
    expect(portfolio.header).toBe('As of 26 Apr 2024 · 1 of 4 customers, income >3 Juta - 5 Juta')
    expect(portfolio.band).toEqual({ rank: 3, label: '>3 Juta - 5 Juta' })
  })

  it('recomputes every number over the band', () => {
    expect(portfolio.customers.count).toBe(1)
    expect(portfolio.totals).toEqual({ aum: 0, loanExposure: 23_800_000 })
    expect(portfolio.kyc.count).toBe(0)
    expect(portfolio.opportunitiesLine).toBe('1 customer with at least one opportunity')
    expect(portfolio.opportunities.find((o) => o.id === 'no-aum')?.count).toBe(1)
    expect(portfolio.penetration.find((p) => p.label === 'LOAN')).toMatchObject({ held: 1, notHeld: 0 })
  })

  it('carries the band in every link', () => {
    expect(portfolio.kyc.to).toBe('/customers?band=3&kyc=yes')
    expect(portfolio.opportunities[4]?.to).toBe('/customers?rule=no-aum&band=3')
    expect(portfolio.penetration[1]?.to).toBe('/customers?band=3&lacks=ORI')
  })

  it.each([0, 9, 2.5, Number.NaN])('treats band %s as no band', (band) => {
    expect(buildPortfolio(fixtureDataset, band).header).toBe('As of 26 Apr 2024 · 4 customers')
  })
})

// Contract tests on the committed JSON. Only the selectors layer may load it (ADR 0004).
describe('getPortfolio on the real data', () => {
  it('pins the book numbers', () => {
    const portfolio = getPortfolio(null)
    expect(portfolio.header).toBe('As of 26 Apr 2024 · 100 customers')
    expect(portfolio.customers).toMatchObject({ count: 100, withAum: 84, withoutAum: 16 })
    expect(portfolio.totals).toEqual({ aum: 811_749_876_893, loanExposure: 1_582_500_470_995 })
    expect(portfolio.kyc.count).toBe(43)
    expect(portfolio.opportunitiesLine).toBe('84 customers with at least one opportunity')
    expect(portfolio.opportunities.map((o) => o.count)).toEqual([12, 29, 37, 29, 16, 6])
    expect(portfolio.opportunities.map((o) => o.amountLine)).toEqual([
      rp('Cash Rp 551.749.143.391'),
      rp('AUM Rp 381.048.084.517'),
      rp('AUM Rp 366.113.426.621'),
      rp('AUM Rp 101.778.947.711'),
      null,
      '3 also in No BANCA',
    ])
    expect(portfolio.penetration.map((p) => [p.held, p.notHeld])).toEqual([
      [84, 16],
      [46, 54],
      [54, 46],
      [54, 46],
      [83, 17],
    ])
    expect(portfolio.scatter.points).toHaveLength(84)
  })

  it('recomputes over income band 4', () => {
    const portfolio = getPortfolio(4)
    expect(portfolio.header).toBe('As of 26 Apr 2024 · 7 of 100 customers, income >5 Juta - 10 Juta')
    expect(portfolio.customers).toMatchObject({ count: 7, withAum: 3 })
    expect(portfolio.opportunitiesLine).toBe('6 customers with at least one opportunity')
    expect(portfolio.kyc.count).toBe(0)
  })

  it('builds each band once', () => {
    expect(getPortfolio(4)).toBe(getPortfolio(4))
  })
})
