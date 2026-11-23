import { describe, expect, it } from 'vitest'
import { evaluateCustomer } from './evaluate'
import { productOffers, ruleChip } from './product-offers'
import { customer, row, rp } from './test-fixtures'

describe('productOffers', () => {
  it('groups the rules by product: cash-heavy joins the REKSA card, both BANCA rules share one card', () => {
    const evaluation = evaluateCustomer(
      customer([row('FUNDING', 900_000_000, 'TABUNGAN'), row('ORI', 100_000_000, 'ORI')], '>100 Juta'),
    )
    const offers = productOffers(evaluation)
    expect(offers.map((offer) => [offer.product, offer.ruleIds, offer.basis])).toEqual([
      ['BANCA', ['investment-gap-banca', 'high-income-no-banca'], { kind: 'aum', amount: 1_000_000_000 }],
      ['REKSA', ['cash-heavy', 'investment-gap-reksa'], { kind: 'cash', amount: 900_000_000 }],
    ])
    expect(offers[1]?.reasons).toEqual([
      rp('90% of AUM in cash. AUM Rp 1.000.000.000, cash Rp 900.000.000.'),
      rp('No REKSA. AUM Rp 1.000.000.000.'),
    ])
  })

  it('adds cash-heavy to both the REKSA and the ORI card', () => {
    const offers = productOffers(
      evaluateCustomer(customer([row('FUNDING', 900_000_000, 'TABUNGAN'), row('BANCA', 100_000_000, 'BANCA')])),
    )
    expect(offers.map((offer) => [offer.product, offer.ruleIds])).toEqual([
      ['REKSA', ['cash-heavy', 'investment-gap-reksa']],
      ['ORI', ['cash-heavy', 'investment-gap-ori']],
    ])
  })

  it('gives cash-heavy its own Cash card when the customer holds REKSA and ORI', () => {
    const rows = [
      row('FUNDING', 900_000_000, 'TABUNGAN'),
      row('REKSA', 50_000_000, 'REKSA'),
      row('ORI', 50_000_000, 'ORI'),
      row('BANCA', 1, 'BANCA'),
    ]
    const offers = productOffers(evaluateCustomer(customer(rows)))
    expect(offers).toEqual([
      expect.objectContaining({ product: 'Cash', ruleIds: ['cash-heavy'], basis: { kind: 'cash', amount: 900_000_000 } }),
    ])
  })

  it('puts the BANCA card (AUM 0) before the No AUM card (no basis) at equal rule count', () => {
    const offers = productOffers(evaluateCustomer(customer([], '>100 Juta')))
    expect(offers.map((offer) => [offer.product, offer.basis])).toEqual([
      ['BANCA', { kind: 'aum', amount: 0 }],
      ['No AUM', null],
    ])
  })

  it('puts the higher basis first, then the RULE_ORDER position', () => {
    const byAmount = productOffers(
      evaluateCustomer(
        customer([
          row('FUNDING', 900_000_000, 'TABUNGAN'),
          row('REKSA', 50_000_000, 'REKSA'),
          row('ORI', 50_000_000, 'ORI'),
        ]),
      ),
    )
    expect(byAmount.map((offer) => [offer.product, offer.basis?.amount])).toEqual([
      ['BANCA', 1_000_000_000],
      ['Cash', 900_000_000],
    ])
    const tied = productOffers(
      evaluateCustomer(customer([row('FUNDING', 500_000_000, 'DEPOSITO01'), row('BANCA', 1, 'BANCA')])),
    )
    expect(tied.map((offer) => offer.product)).toEqual(['REKSA', 'ORI'])
  })

  it('returns no card when no rule fired, also when the KYC note fired', () => {
    const rows = [
      row('FUNDING', 1_000_000_000, 'DEPOSITO01'),
      row('ORI', 1, 'ORI'),
      row('REKSA', 1, 'REKSA'),
      row('BANCA', 1, 'BANCA'),
    ]
    const evaluation = evaluateCustomer(customer(rows, 'sd. 1 Juta'))
    expect(evaluation.kycNote).not.toBeNull()
    expect(productOffers(evaluation)).toEqual([])
  })

  it('builds the title and the basis text from fixed templates', () => {
    const offers = productOffers(
      evaluateCustomer(customer([row('FUNDING', 900_000_000, 'TABUNGAN'), row('ORI', 100_000_000, 'ORI')], '>100 Juta')),
    )
    expect(offers.map((offer) => [offer.title, offer.basisText])).toEqual([
      ['BANCA · 2 rules', rp('AUM Rp 1.000.000.000')],
      ['REKSA · 2 rules', rp('Cash Rp 900.000.000')],
    ])
    const noAum = productOffers(evaluateCustomer(customer([])))
    expect(noAum.map((offer) => [offer.title, offer.basisText])).toEqual([['No AUM · 1 rule', null]])
  })
})

describe('ruleChip', () => {
  it('shows the cash share for cash-heavy, rounded down', () => {
    const evaluation = evaluateCustomer(customer([row('FUNDING', 84, 'TABUNGAN'), row('FUNDING', 16, 'DEPOSITO01')]))
    const cashHeavy = evaluation.insights.find((insight) => insight.id === 'cash-heavy')
    expect(cashHeavy && ruleChip(cashHeavy)).toBe('Cash-heavy 84%')
  })

  it('shows the rule label for every other rule', () => {
    const evaluation = evaluateCustomer(customer([], '>100 Juta'))
    expect(evaluation.insights.map(ruleChip)).toEqual(['No AUM', 'High income, no BANCA'])
  })
})
