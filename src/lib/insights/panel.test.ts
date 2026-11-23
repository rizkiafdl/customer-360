import { describe, expect, it } from 'vitest'
import { evaluateCustomer } from './evaluate'
import {
  INSIGHT_KINDS,
  KIND_LABELS,
  OFFER_PANEL_EMPTY,
  OFFER_PANEL_NOTE_HEADING,
  OFFER_PANEL_TITLE,
  OFFERS_LIST_LABEL,
  offerPanel,
} from './panel'
import { RULE_ORDER } from './rules'
import { customer, row, rp } from './test-fixtures'

/** AUM Rp 1.000.000.000 with ORI and REKSA held, BANCA not held. */
const noBancaRows = [
  row('FUNDING', 620_000_000, 'TABUNGAN'),
  row('ORI', 200_000_000, 'ORI'),
  row('REKSA', 180_000_000, 'REKSA'),
  row('BANCA', 0, 'BANCA'),
]

/** AUM Rp 1.000.000.000, cash 10%, every investment category held. */
const fullRows = [
  row('FUNDING', 600_000_000, 'DEPOSITO12'),
  row('FUNDING', 100_000_000, 'TABUNGAN'),
  row('ORI', 100_000_000, 'ORI'),
  row('BANCA', 100_000_000, 'BANCA'),
  row('REKSA', 100_000_000, 'REKSA'),
]

describe('offerPanel', () => {
  it('shows both BANCA rules as two cards, with labels, reasons, and rule texts from F2', () => {
    const evaluation = evaluateCustomer(customer(noBancaRows, '>10 Juta - 25 Juta'))
    const panel = offerPanel(evaluation)
    expect(panel.cards.map((card) => card.id)).toEqual(['investment-gap-banca', 'high-income-no-banca'])
    expect(panel.cards.map((card) => card.label)).toEqual(['No BANCA', 'High income, no BANCA'])
    expect(panel.cards.map((card) => card.reason)).toEqual([
      rp('No BANCA. AUM Rp 1.000.000.000.'),
      'No BANCA. Income band >10 Juta - 25 Juta.',
    ])
    expect(panel.cards.map((card) => card.ruleText)).toEqual(
      evaluation.insights.map((insight) => insight.ruleText),
    )
    expect(panel.cards.every((card) => card.kind === 'opportunity' && card.kindLabel === 'Opportunity')).toBe(true)
  })

  it('keeps the evaluation order of the fired rules', () => {
    const evaluation = evaluateCustomer(customer([row('FUNDING', 2_000_000_000, 'TABSYA')], '>100 Juta'))
    expect(offerPanel(evaluation).cards.map((card) => card.id)).toEqual(
      evaluation.insights.map((insight) => insight.id),
    )
    expect(offerPanel(evaluation).cards).toHaveLength(5)
  })

  it('shows the empty line only when no rule fired', () => {
    const empty = offerPanel(evaluateCustomer(customer(fullRows)))
    expect(empty.cards).toEqual([])
    expect(empty.emptyText).toBe('No offer rule fired.')

    const withCard = offerPanel(evaluateCustomer(customer([])))
    expect(withCard.cards.map((card) => card.id)).toEqual(['no-aum'])
    expect(withCard.emptyText).toBeNull()
  })

  it('shows the KYC note apart from the cards when no rule fired', () => {
    const panel = offerPanel(evaluateCustomer(customer(fullRows, '>1 Juta - 3 Juta')))
    expect(panel.cards).toEqual([])
    expect(panel.emptyText).toBe('No offer rule fired.')
    expect(panel.note).toEqual({
      id: 'kyc-income-band',
      kind: 'warning',
      kindLabel: 'Warning',
      label: 'KYC income band',
      reason: rp('Income band >1 Juta - 3 Juta. AUM Rp 1.000.000.000.'),
      ruleText: rp('Income band >3 Juta - 5 Juta or below, and AUM is Rp 1.000.000.000 or more.'),
    })
  })

  it('keeps the KYC note out of the cards when rules fired', () => {
    const rows = [row('FUNDING', 2_000_000_000, 'TABSYA')]
    const panel = offerPanel(evaluateCustomer(customer(rows, 'sd. 1 Juta')))
    expect(panel.cards.length).toBeGreaterThan(0)
    expect(panel.cards.map((card) => card.id)).not.toContain('kyc-income-band')
    expect(panel.note?.id).toBe('kyc-income-band')
  })

  it('has no note when the KYC note did not fire', () => {
    expect(offerPanel(evaluateCustomer(customer([]))).note).toBeNull()
  })
})

describe('INSIGHT_KINDS', () => {
  it('makes every offer rule an opportunity and the KYC note a warning', () => {
    for (const id of RULE_ORDER) expect(INSIGHT_KINDS[id]).toBe('opportunity')
    expect(INSIGHT_KINDS['kyc-income-band']).toBe('warning')
    expect(Object.keys(INSIGHT_KINDS)).toHaveLength(RULE_ORDER.length + 1)
  })
})

describe('offer panel copy', () => {
  it('uses the fixed strings from the F3 spec', () => {
    expect(OFFER_PANEL_TITLE).toBe('What to offer')
    expect(OFFER_PANEL_EMPTY).toBe('No offer rule fired.')
    expect(OFFER_PANEL_NOTE_HEADING).toBe('Note')
    expect(OFFERS_LIST_LABEL).toBe('Offers')
    expect(KIND_LABELS).toEqual({ opportunity: 'Opportunity', warning: 'Warning', info: 'Info' })
  })
})
