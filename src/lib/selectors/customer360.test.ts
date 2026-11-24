import { describe, expect, it } from 'vitest'
import { isCustomerInitiated } from '@/lib/domain'
import { rp } from '@/lib/insights/test-fixtures'
import { fixtureDataset } from '@/test/fixtures'
import {
  buildCustomer360,
  customerOptions,
  filterTransactionRows,
  getCustomer360,
  getCustomerOptions,
  parseCustomerId,
  parseTab,
  snapshotLabel,
  type Customer360,
} from './customer360'
import { dataset } from './dataset'
import { getCustomerEvaluation } from './insights'

function build(id: number): Customer360 {
  const vm = buildCustomer360(fixtureDataset, id)
  if (!vm) throw new Error(`fixture customer ${id} did not build`)
  return vm
}

/** The fixture transactions, with only the bank entries left for customer `id`. */
function bankEntriesOnly(id: number) {
  return fixtureDataset.transactions.filter((t) => t.customer_id !== id || !isCustomerInitiated(t))
}

describe('parseTab', () => {
  it('reads a known tab', () => {
    expect(parseTab('loans')).toBe('loans')
    expect(parseTab('transactions')).toBe('transactions')
  })

  it.each([null, '', 'LOANS', 'bogus'])('opens Overview for %j', (value) => {
    expect(parseTab(value)).toBe('overview')
  })
})

describe('buildCustomer360: profile', () => {
  it('gives the heading, gender, and income band, with no income rank label', () => {
    const vm = build(1)
    expect(vm.heading).toBe('Customer 1')
    expect(vm.profile).toEqual({
      gender: 'Female',
      incomeBand: '>10 Juta - 25 Juta',
      highIncome: true,
      firstTransaction: 'First transaction May 2023',
    })
  })

  it('says "Gender not recorded" for a null gender', () => {
    expect(build(2).profile.gender).toBe('Gender not recorded')
    expect(build(2).profile.highIncome).toBe(false)
  })

  it('is null for an unknown ID', () => {
    expect(buildCustomer360(fixtureDataset, 999)).toBeNull()
  })
})

describe('buildCustomer360: KPIs', () => {
  it('keeps AUM and loan exposure apart', () => {
    const { kpis } = build(1)
    expect(kpis.aum).toBe(1_000_000_000)
    expect(kpis.loanExposure).toBe(250_000_000)
  })

  it('gives days since the last customer-initiated transaction, bank entries ignored', () => {
    const { recency } = build(1).kpis
    expect(recency).toEqual({ days: 2, label: '2 days since last activity', lastDate: '2024-04-24' })
    expect(build(2).kpis.recency.label).toBe('1 day since last activity')
  })

  it('gives the digital share with its counts, BANCA method excluded', () => {
    expect(build(1).kpis.digital).toEqual({
      share: 0.6,
      meter: 60,
      label: '60%',
      context: '3 of 5 customer-initiated, BANCA method excluded',
    })
  })

  it('gives an empty digital meter when no row is left to count', () => {
    const vm = buildCustomer360({ ...fixtureDataset, transactions: bankEntriesOnly(2) }, 2)
    expect(vm?.kpis.digital).toMatchObject({ share: null, meter: 0, label: '—' })
  })
})

describe('buildCustomer360: holdings', () => {
  it('builds the AUM bars for the four AUM categories and a fact title', () => {
    const { holdings } = build(1)
    expect(holdings.state).toBe('aum')
    expect(holdings.emptyText).toBeNull()
    expect(holdings.title).toBe('62% of AUM in FUNDING')
    expect(holdings.aumBars).toEqual([
      { category: 'FUNDING', amount: 620_000_000, color: 'var(--chart-1)' },
      { category: 'ORI', amount: 200_000_000, color: 'var(--chart-2)' },
      { category: 'BANCA', amount: 0, color: 'var(--chart-3)' },
      { category: 'REKSA', amount: 180_000_000, color: 'var(--chart-4)' },
    ])
  })

  it('lists products by category with names, held flags, and muted rows', () => {
    const rows = build(1).holdings.products
    expect(rows.map((r) => [r.product, r.category, r.amount, r.held, r.muted])).toEqual([
      ['TABUNGAN', 'FUNDING', 620_000_000, true, false],
      ['ORI', 'ORI', 200_000_000, true, false],
      ['BANCA', 'BANCA', 0, false, true],
      ['REKSADANA', 'REKSA', 180_000_000, true, false],
      ['KPR', 'LOAN', 250_000_000, true, false],
      ['Unnamed product', 'LOAN', null, false, true],
    ])
    expect(rows[5]?.color).toBe('var(--chart-5)')
  })

  it('has no rows state for a customer with no portfolio rows', () => {
    const vm = build(2)
    expect(vm.holdings).toMatchObject({ state: 'none', emptyText: 'No portfolio rows.', title: null, products: [] })
    expect(vm.kpis.aum).toBe(0)
    expect(vm.kpis.loanExposure).toBe(0)
  })

  it('says "none held in AUM categories" for AUM 0 with a held LOAN', () => {
    const vm = build(3)
    expect(vm.holdings.state).toBe('no-aum')
    expect(vm.holdings.emptyText).toBe('No AUM. 1 product row, none held in AUM categories.')
    expect(vm.holdings.products).toHaveLength(1)
    expect(vm.kpis.loanExposure).toBe(23_800_000)
  })
})

describe('buildCustomer360: activity', () => {
  it('counts customer-initiated rows per week from 1 Mar 2024 to the as-of date', () => {
    const { activity } = build(1)
    expect(activity.weeklyTitle).toBe('5 customer-initiated transactions since 1 Mar 2024')
    expect(activity.weekly).toHaveLength(9)
    expect(activity.weekly[0]).toEqual({ weekStart: '2024-02-26', label: '1 Mar', count: 1 })
    expect(activity.weekly[1]).toEqual({ weekStart: '2024-03-04', label: '4 Mar', count: 1 })
    expect(activity.weekly.reduce((sum, w) => sum + w.count, 0)).toBe(5)
  })

  it('states the earlier rows, or nothing when there are none', () => {
    expect(build(1).activity.earlierText).toBe('1 earlier transaction, from 2023-05-02')
    expect(build(2).activity.earlierText).toBeNull()
  })

  it('builds the channel and type mixes from customer-initiated rows only', () => {
    const { activity } = build(1)
    expect(activity.channelMix.map((e) => e.label)).toEqual(['ATM', 'BANCA', 'BRANCH', 'DEBIT CARD', 'MOBILE BANKING', 'Other'])
    expect(activity.channelMix.at(-1)).toEqual({ label: 'Other', count: 1 })
    expect(activity.channelTitle).toBe('ATM is 17% of 6 customer-initiated transactions')
    expect(activity.typeMix.map((e) => e.label)).not.toContain('BUNGA')
    expect(activity.typeMix).toHaveLength(6)
    expect(activity.mixEmptyText).toBeNull()
  })

  it('gives the mix charts an empty text when no row is customer-initiated', () => {
    const vm = buildCustomer360({ ...fixtureDataset, transactions: bankEntriesOnly(2) }, 2)
    expect(vm?.activity.mixEmptyText).toBe('No customer-initiated transactions.')
  })
})

describe('buildCustomer360: bank entries and transactions', () => {
  it('summarises bank entries by type with a title', () => {
    const { bankEntries } = build(1)
    expect(bankEntries.title).toBe('3 bank entries')
    expect(bankEntries.rows).toEqual([
      { type: 'BUNGA', count: 2, amount: 22_345.67 },
      { type: 'PAJAK', count: 1, amount: 2_469 },
    ])
    expect(build(3).bankEntries).toEqual({ title: 'No bank entries', rows: [] })
  })

  it('lists every transaction newest first with its kind', () => {
    const rows = build(1).transactions
    expect(rows).toHaveLength(9)
    expect(rows[0]).toMatchObject({ date: '2024-04-26', type: 'BUNGA', kind: 'bank' })
    expect(rows[1]).toMatchObject({ date: '2024-04-24', type: 'TRANSFER', kind: 'customer' })
    expect(rows.at(-1)?.date).toBe('2023-05-02')
    expect(new Set(rows.map((r) => r.key)).size).toBe(9)
  })

  it('filters rows by kind', () => {
    const rows = build(1).transactions
    expect(filterTransactionRows(rows, 'all')).toHaveLength(9)
    expect(filterTransactionRows(rows, 'customer')).toHaveLength(6)
    expect(filterTransactionRows(rows, 'bank').map((r) => r.type)).toEqual(['BUNGA', 'BUNGA', 'PAJAK'])
  })
})

describe('parseCustomerId', () => {
  it('reads a whole positive number', () => {
    expect(parseCustomerId('4426')).toBe(4426)
  })

  it.each(['12a', '', '-1', '1.5', ' 12', undefined])('is null for %j', (param) => {
    expect(parseCustomerId(param)).toBeNull()
  })
})

describe('customerOptions', () => {
  it('gives an ID, a label, and a detail line per customer, in ID order', () => {
    expect(customerOptions(fixtureDataset)).toEqual([
      { id: 1, label: 'Customer 1', detail: 'Female · >10 Juta - 25 Juta' },
      { id: 2, label: 'Customer 2', detail: 'Gender not recorded · sd. 1 Juta' },
      { id: 3, label: 'Customer 3', detail: 'Male · >3 Juta - 5 Juta' },
      { id: 4, label: 'Customer 4', detail: 'Female · >1 Juta - 3 Juta' },
    ])
  })
})

describe('buildCustomer360: offers', () => {
  it('shows both BANCA cards for the high-income customer with no BANCA held', () => {
    const { offers } = build(1)
    expect(offers.cards.map((card) => card.id)).toEqual(['investment-gap-banca', 'high-income-no-banca'])
    expect(offers.emptyText).toBeNull()
    expect(offers.note).toBeNull()
  })

  it('shows the no-AUM card, not the empty line, for a customer with no portfolio rows', () => {
    const { offers } = build(2)
    expect(offers.cards.map((card) => card.id)).toEqual(['no-aum'])
    expect(offers.emptyText).toBeNull()
  })

  it('shows the empty line and the KYC note when only the note fired', () => {
    const { offers } = build(4)
    expect(offers.cards).toEqual([])
    expect(offers.emptyText).toBe('No offer rule fired.')
    expect(offers.note?.label).toBe('KYC income band')
  })
})

// Contract tests on the committed JSON (ADR 0004).
describe('Customer 360 on the real data', () => {
  it('builds every one of the 100 customers', () => {
    const ids = dataset.profiles.map((p) => p.customer_id)
    expect(ids).toHaveLength(100)
    for (const id of ids) expect(getCustomer360(id)?.id).toBe(id)
  })

  it('is null for an unknown ID', () => {
    expect(getCustomer360(-1)).toBeNull()
    expect(getCustomer360(1)).toBeNull()
  })

  it('shows the 14 customers with no portfolio rows and the 2 with rows but AUM 0', () => {
    const states = dataset.profiles.map((p) => getCustomer360(p.customer_id)?.holdings.state)
    expect(states.filter((s) => s === 'none')).toHaveLength(14)
    expect(states.filter((s) => s === 'no-aum')).toHaveLength(2)
  })

  it('shows the measured offer card counts (F3 spec 5)', () => {
    const panels = dataset.profiles.map((p) => getCustomer360(p.customer_id)!.offers)
    const byCount = [0, 1, 2, 3, 4].map((n) => panels.filter((panel) => panel.cards.length === n).length)
    expect(byCount).toEqual([16, 49, 26, 8, 1])
    expect(panels.filter((panel) => panel.cards.length === 0 && panel.note !== null)).toHaveLength(9)
  })

  it('shows both BANCA cards for exactly customers 6386, 6513, and 8797', () => {
    const both = dataset.profiles
      .map((p) => getCustomer360(p.customer_id)!)
      .filter((vm) => {
        const ids = vm.offers.cards.map((card) => card.id)
        return ids.includes('investment-gap-banca') && ids.includes('high-income-no-banca')
      })
      .map((vm) => vm.id)
    expect(both).toEqual([6386, 6513, 8797])
  })

  it('shows one card per fired rule of the evaluation, for every customer', () => {
    for (const { customer_id: id } of dataset.profiles) {
      const cards = getCustomer360(id)!.offers.cards.map((card) => card.id)
      expect(cards).toEqual(getCustomerEvaluation(id)!.insights.map((insight) => insight.id))
    }
  })

  it('shows no income rank label on the real data', () => {
    expect(getCustomer360(8797)?.profile).not.toHaveProperty('incomeRankLabel')
    expect(getCustomer360(8797)?.kpis).not.toHaveProperty('heldLabel')
  })

  it('has one option per customer and the as-of label', () => {
    expect(getCustomerOptions()).toHaveLength(100)
    expect(snapshotLabel).toBe('Snapshot as of 26 Apr 2024')
  })
})

describe('buildCustomer360: redesign additions', () => {
  const vm = build(1)

  it('shows the first transaction, bank entries included', () => {
    expect(vm.profile.firstTransaction).toBe('First transaction May 2023')
    expect(build(2).profile.firstTransaction).toBe('First transaction Mar 2024')
  })

  it('counts the held AUM rows and their categories', () => {
    expect(vm.kpis.products).toEqual({ count: 3, categories: ['FUNDING', 'ORI', 'REKSA'], label: '3 · FUNDING, ORI, REKSA' })
    expect(build(3).kpis.products).toEqual({ count: 0, categories: [], label: '0' })
  })

  it('groups the offers by product', () => {
    expect(vm.productOffers.map((offer) => [offer.product, offer.ruleIds])).toEqual([
      ['BANCA', ['investment-gap-banca', 'high-income-no-banca']],
    ])
    expect(build(4).productOffers).toEqual([])
  })

  it('shows the top channel over customer-initiated rows', () => {
    expect(vm.channelText).toBe('Top channel: ATM, 1 of 6 customer-initiated transactions (16%)')
    const bankOnly = buildCustomer360({ ...fixtureDataset, transactions: bankEntriesOnly(2) }, 2)
    expect(bankOnly?.channelText).toBeNull()
  })

  it('splits holdings into held AUM rows with their share of AUM, and AUM rows not held; LOAN is not there', () => {
    expect(vm.holdings.held.map((row) => [row.product, row.category, row.amount, row.share])).toEqual([
      ['TABUNGAN', 'FUNDING', 620_000_000, 0.62],
      ['ORI', 'ORI', 200_000_000, 0.2],
      ['REKSADANA', 'REKSA', 180_000_000, 0.18],
    ])
    expect(vm.holdings.notHeld.map((row) => [row.product, row.category])).toEqual([['BANCA', 'BANCA']])
    expect([...vm.holdings.held, ...vm.holdings.notHeld].some((row) => row.category === 'LOAN')).toBe(false)
  })

  it('lists the loan facilities with a fixed title and the missing-data line', () => {
    expect(vm.loans).toEqual({
      title: rp('1 loan facility, Rp 250.000.000 in total'),
      held: [{ product: 'KPR', amount: 250_000_000, shareOfExposure: 1 }],
      notHeld: [{ customer_id: 1, product: null, product_category: 'LOAN', amount: null }],
      exposure: 250_000_000,
      missingText: 'Facility type, collectibility, days past due, and maturity are not in the data.',
    })
    expect(build(2).loans.title).toBe('No loan facility held.')
  })

  it('sorts several loans high to low; the shares add up to 1', () => {
    const more = buildCustomer360(
      {
        ...fixtureDataset,
        portfolio: [
          ...fixtureDataset.portfolio,
          { customer_id: 1, product: 'KTA', product_category: 'LOAN', amount: 750_000_000 },
        ],
      },
      1,
    )
    expect(more?.loans.title).toBe(rp('2 loan facilities, Rp 1.000.000.000 in total'))
    expect(more?.loans.held.map((loan) => [loan.product, loan.shareOfExposure])).toEqual([
      ['KTA', 0.75],
      ['KPR', 0.25],
    ])
  })

  it('keeps the 5 latest transactions as the recent list', () => {
    expect(vm.recent).toEqual(vm.transactions.slice(0, 5))
    expect(vm.recent.map((row) => row.date)).toEqual(['2024-04-26', '2024-04-24', '2024-04-10', '2024-03-31', '2024-03-31'])
    expect(build(3).recent).toHaveLength(1)
  })
})

describe('Customer 360 redesign additions on the real data', () => {
  const all = dataset.profiles.map((p) => getCustomer360(p.customer_id)!)

  it('has 83 customers with a loan, at most 10 each', () => {
    expect(all.filter((vm) => vm.loans.held.length > 0)).toHaveLength(83)
    expect(Math.max(...all.map((vm) => vm.loans.held.length))).toBe(10)
  })

  it('pins the cards per product', () => {
    const counts: Record<string, number> = {}
    for (const vm of all) for (const offer of vm.productOffers) counts[offer.product] = (counts[offer.product] ?? 0) + 1
    expect(counts).toEqual({ REKSA: 29, ORI: 37, BANCA: 32, Cash: 4, 'No AUM': 16 })
  })

  it('orders the cards of customer 8797 by rule count, then by RULE_ORDER', () => {
    // Both cards hold 2 rules; the REKSA card starts with cash-heavy, first in RULE_ORDER.
    expect(getCustomer360(8797)?.productOffers.map((offer) => offer.product)).toEqual(['REKSA', 'BANCA'])
  })
})
