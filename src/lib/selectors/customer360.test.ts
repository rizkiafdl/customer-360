import { describe, expect, it } from 'vitest'
import { fixtureDataset } from '@/test/fixtures'
import {
  asOfLabel,
  buildCustomer360,
  customerOptions,
  filterTransactionRows,
  getCustomer360,
  getCustomerOptions,
  parseCustomerId,
  type Customer360,
} from './customer360'
import { dataset } from './dataset'

function build(id: number): Customer360 {
  const vm = buildCustomer360(fixtureDataset, id)
  if (!vm) throw new Error(`fixture customer ${id} did not build`)
  return vm
}

describe('buildCustomer360: profile', () => {
  it('gives the heading, gender, and income rank', () => {
    const vm = build(1)
    expect(vm.heading).toBe('Customer 1')
    expect(vm.profile).toEqual({
      gender: 'Female',
      incomeBand: '>10 Juta - 25 Juta',
      incomeRankLabel: 'rank 5 of 8',
      highIncome: true,
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

  it('counts held rows out of all rows', () => {
    expect(build(1).kpis.heldLabel).toBe('4 of 6 rows')
  })

  it('gives days since the last customer-initiated transaction, bank entries ignored', () => {
    const { recency } = build(1).kpis
    expect(recency).toEqual({ days: 2, label: '2 days since last activity', lastDate: '2024-04-24' })
    expect(build(2).kpis.recency.label).toBe('1 day since last activity')
  })

  it('gives the digital share with its counts, BANCA method excluded', () => {
    expect(build(1).kpis.digital).toEqual({
      share: 0.6,
      label: '60%',
      context: '3 of 5 customer-initiated, BANCA method excluded',
    })
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
    expect(vm.kpis.heldLabel).toBe('0 of 0 rows')
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
    ])
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

  it('has one option per customer and the as-of label', () => {
    expect(getCustomerOptions()).toHaveLength(100)
    expect(asOfLabel).toBe('As of 26 Apr 2024')
  })
})
