import { describe, expect, it } from 'vitest'
import { rp } from '@/lib/insights/test-fixtures'
import { fixtureDataset } from '@/test/fixtures'
import {
  buildCustomerRows,
  channelText,
  customerSummary,
  customersQuery,
  filterCustomers,
  getCustomerRows,
  lastActiveLabel,
  lastActiveText,
  neighbours,
  paginate,
  parseCustomerFilters,
  type CustomerFilters,
} from './customers'
import { getWorklist } from './worklist'

const NONE: CustomerFilters = { rule: null, band: null, kyc: null, lacks: null, q: null, page: 1 }
const parse = (query: string) => parseCustomerFilters(new URLSearchParams(query))

describe('customersQuery', () => {
  it('is empty with no filter', () => {
    expect(customersQuery({})).toBe('')
    expect(customersQuery(NONE)).toBe('')
  })

  it('writes the params in a fixed order, page only above 1', () => {
    expect(
      customersQuery({ page: 2, q: '12', lacks: 'ORI', kyc: false, band: 4, rule: 'investment-gap-reksa' }),
    ).toBe('?rule=investment-gap-reksa&band=4&kyc=no&lacks=ORI&q=12&page=2')
    expect(customersQuery({ kyc: true })).toBe('?kyc=yes')
  })
})

describe('parseCustomerFilters', () => {
  it('reads a valid set, and it round-trips through customersQuery', () => {
    const query = '?rule=no-aum&band=8&kyc=yes&lacks=FUNDING&q=44&page=3'
    const filters = parse(query)
    expect(filters).toEqual({ rule: 'no-aum', band: 8, kyc: true, lacks: 'FUNDING', q: '44', page: 3 })
    expect(customersQuery(filters)).toBe(query)
    expect(parse('kyc=no').kyc).toBe(false)
  })

  it.each([
    'rule=unknown',
    'band=9',
    'band=0',
    'band=abc',
    'band=4.5',
    'kyc=maybe',
    'lacks=LOAN',
    'lacks=ori',
    'q=12a',
    'q=',
    'page=0',
    'page=-1',
    'page=2.5',
    'page=abc',
  ])('ignores %s', (query) => {
    expect(parse(query)).toEqual(NONE)
  })

  it('keeps a page above the page count; paginate handles it', () => {
    expect(parse('page=99').page).toBe(99)
  })
})

describe('buildCustomerRows', () => {
  const rows = buildCustomerRows(fixtureDataset)
  const [first, second, , fourth] = rows

  it('keeps the worklist order: more rules, then AUM, then ID', () => {
    expect(rows.map((row) => [row.rank, row.customerId])).toEqual([
      [1, 1],
      [2, 2],
      [3, 3],
      [4, 4],
    ])
  })

  it('shows the chip of the first fired rule and the count of the others', () => {
    expect([first?.chip, first?.moreCount, first?.ruleIds]).toEqual([
      'No BANCA',
      1,
      ['investment-gap-banca', 'high-income-no-banca'],
    ])
    expect([fourth?.chip, fourth?.moreCount]).toEqual([null, 0])
  })

  it('carries AUM, loan exposure, KYC, income rank, and the categories not held', () => {
    expect(first).toMatchObject({ aum: 1_000_000_000, loanExposure: 250_000_000, kyc: false, incomeRank: 5, lacks: ['BANCA'] })
    expect(second?.lacks).toEqual(['FUNDING', 'ORI', 'BANCA', 'REKSA'])
    expect(fourth?.kyc).toBe(true)
  })

  it('labels last active from customer-initiated rows', () => {
    expect(first?.lastActive).toEqual({ days: 2, date: '2024-04-24', label: '2 days ago' })
    expect(second?.lastActive?.label).toBe('1 day ago')
  })

  it('builds the preview from fixed templates', () => {
    expect(first?.preview).toEqual({
      gender: 'F',
      incomeBand: '>10 Juta - 25 Juta',
      highIncome: true,
      firstTransaction: 'First transaction May 2023',
      offers: [expect.objectContaining({ product: 'BANCA', title: 'BANCA · 2 rules', basisText: rp('AUM Rp 1.000.000.000') })],
      channelText: 'Top channel: ATM, 1 of 6 customer-initiated transactions (16%)',
      lastActiveText: 'Last active 2 days ago, 24 Apr 2024',
    })
    expect(second?.preview.gender).toBeNull()
    expect(fourth?.preview.offers).toEqual([])
  })
})

describe('text helpers', () => {
  it.each([
    [0, 'Today'],
    [1, '1 day ago'],
    [5, '5 days ago'],
  ])('labels %i days as %s', (days, label) => {
    expect(lastActiveLabel(days)).toBe(label)
  })

  it('writes the last active line, with today in lower case', () => {
    expect(lastActiveText({ days: 0, date: '2024-04-26' })).toBe('Last active today, 26 Apr 2024')
    expect(lastActiveText(null)).toBeNull()
  })

  it('writes the top channel line, or null with no customer-initiated row', () => {
    const trx = fixtureDataset.transactions.filter((t) => t.customer_id === 3)
    expect(channelText(trx)).toBe('Top channel: MOBILE BANKING, 1 of 1 customer-initiated transaction (100%)')
    expect(channelText(trx.map((t) => ({ ...t, transaction_type: 'BUNGA' as const })))).toBeNull()
  })
})

describe('filterCustomers', () => {
  const rows = buildCustomerRows(fixtureDataset)
  const ids = (filters: Partial<CustomerFilters>) =>
    filterCustomers(rows, { ...NONE, ...filters }).map((row) => row.customerId)

  it('applies each filter', () => {
    expect(ids({})).toEqual([1, 2, 3, 4])
    expect(ids({ rule: 'no-aum' })).toEqual([2, 3])
    expect(ids({ rule: 'high-income-no-banca' })).toEqual([1])
    expect(ids({ band: 5 })).toEqual([1])
    expect(ids({ kyc: true })).toEqual([4])
    expect(ids({ kyc: false })).toEqual([1, 2, 3])
    expect(ids({ lacks: 'BANCA' })).toEqual([1, 2, 3])
    expect(ids({ lacks: 'ORI' })).toEqual([2, 3])
    expect(ids({ q: '4' })).toEqual([4])
  })

  it('combines filters with AND and ignores the page', () => {
    expect(ids({ rule: 'no-aum', band: 1 })).toEqual([2])
    expect(ids({ lacks: 'ORI', kyc: true })).toEqual([])
    expect(ids({ page: 4 })).toEqual([1, 2, 3, 4])
  })
})

describe('paginate', () => {
  const sixty = Array.from({ length: 60 }, (_, i) => i + 1)

  it('cuts 25 rows per page', () => {
    expect(paginate(sixty, 1)).toMatchObject({ page: 1, pageCount: 3, label: 'Showing 1–25 of 60' })
    const last = paginate(sixty, 3)
    expect(last.rows).toEqual(sixty.slice(50))
    expect(last.label).toBe('Showing 51–60 of 60')
  })

  it('sends a page out of range to page 1', () => {
    expect(paginate(sixty, 9)).toMatchObject({ page: 1, label: 'Showing 1–25 of 60' })
    expect(paginate(sixty, 0).page).toBe(1)
  })

  it('has one empty page with no rows', () => {
    expect(paginate([], 1)).toEqual({ rows: [], page: 1, pageCount: 1, label: 'Showing 0 of 0' })
  })
})

describe('customerSummary', () => {
  it('shows the total with no filter, also on a later page', () => {
    expect(customerSummary(100, 100, NONE)).toBe('100 customers.')
    expect(customerSummary(100, 100, { ...NONE, page: 2 })).toBe('100 customers.')
  })

  it('names every set filter in a fixed order', () => {
    const filters: CustomerFilters = {
      rule: 'investment-gap-reksa',
      band: 4,
      kyc: true,
      lacks: 'ORI',
      q: '12',
      page: 1,
    }
    expect(customerSummary(29, 100, filters)).toBe(
      '29 of 100 customers. Opportunity: No REKSA. Income: >5 Juta - 10 Juta. KYC note: with. Not held: ORI. ID contains 12.',
    )
    expect(customerSummary(3, 100, { ...NONE, kyc: false })).toBe('3 of 100 customers. KYC note: without.')
  })

  it('says when nothing matches', () => {
    expect(customerSummary(0, 100, { ...NONE, q: '0000' })).toBe('No customers match these filters.')
  })
})

describe('neighbours', () => {
  const rows = buildCustomerRows(fixtureDataset)

  it('has no previous at the start and no next at the end (no wrap)', () => {
    expect(neighbours(rows, 1)).toEqual({ position: 1, total: 4, prevId: null, nextId: 2 })
    expect(neighbours(rows, 4)).toEqual({ position: 4, total: 4, prevId: 3, nextId: null })
  })

  it('has both in the middle', () => {
    expect(neighbours(rows, 2)).toEqual({ position: 2, total: 4, prevId: 1, nextId: 3 })
  })

  it('is null for an ID outside the rows', () => {
    expect(neighbours(rows.slice(0, 2), 4)).toBeNull()
  })
})

// Contract tests on the committed JSON. Only the selectors layer may load it (ADR 0004).
describe('customers on the real data', () => {
  const rows = getCustomerRows()
  const count = (query: string) => filterCustomers(rows, parse(query)).length

  it('keeps the worklist order', () => {
    expect(rows.map((row) => row.customerId)).toEqual(getWorklist().map((row) => row.customerId))
    expect(rows[0]?.customerId).toBe(8797)
  })

  it('pins the filter counts', () => {
    expect(count('rule=investment-gap-ori')).toBe(37)
    expect(count('band=4')).toBe(7)
    expect(count('kyc=yes')).toBe(43)
    expect(count('lacks=ORI')).toBe(54)
    expect(count('lacks=FUNDING')).toBe(16)
  })

  it('has 4 pages of 25', () => {
    expect(paginate(rows, 1).pageCount).toBe(4)
    expect(paginate(rows, 4).label).toBe('Showing 76–100 of 100')
  })
})
