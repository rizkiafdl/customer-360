import { describe, expect, it } from 'vitest'
import { fixtureDataset } from '@/test/fixtures'
import { buildCustomerRows } from './customers'
import { buildPortfolio, getPortfolio } from './portfolio'
import {
  buildSpotlightSections,
  customerSubtitle,
  getSpotlightSections,
  noMatchText,
  spotlightFilters,
  type SpotlightSection,
} from './spotlight'

// formatIDR / formatIDRShort output a no-break space (U+00A0) around the
// number and the unit; tests write the "Rp …" token with a plain space and
// convert it here. Nothing else in these strings is a no-break space.
const nb = (rpToken: string) => rpToken.replaceAll(' ', ' ')

const keys = (section: SpotlightSection) => section.items.map((item) => item.key)

const fixtureSource = {
  rows: buildCustomerRows(fixtureDataset),
  filters: spotlightFilters(buildPortfolio(fixtureDataset, null)),
}

describe('spotlightFilters', () => {
  it('builds seven filters with counts and links', () => {
    expect(fixtureSource.filters.map((f) => [f.id, f.label, f.count, f.to])).toEqual([
      ['cash-heavy', 'Cash-heavy AUM', 0, '/customers?rule=cash-heavy'],
      ['investment-gap-reksa', 'No REKSA', 0, '/customers?rule=investment-gap-reksa'],
      ['investment-gap-ori', 'No ORI', 0, '/customers?rule=investment-gap-ori'],
      ['investment-gap-banca', 'No BANCA', 1, '/customers?rule=investment-gap-banca'],
      ['no-aum', 'No AUM', 2, '/customers?rule=no-aum'],
      ['high-income-no-banca', 'High income, no BANCA', 1, '/customers?rule=high-income-no-banca'],
      ['kyc', 'With KYC note', 1, '/customers?kyc=yes'],
    ])
  })
})

describe('customerSubtitle', () => {
  it('writes the customer subtitle with and without a chip', () => {
    expect(customerSubtitle({ aum: 1e9, chip: 'No BANCA' })).toBe(`AUM ${nb('Rp 1 M')} · No BANCA`)
    expect(customerSubtitle({ aum: 1e9, chip: null })).toBe(`AUM ${nb('Rp 1 M')}`)
  })
})

describe('noMatchText', () => {
  it('writes the no-match line', () => {
    expect(noMatchText('zzz')).toBe('No customer, filter or page matches “zzz”.')
  })
})

describe('buildSpotlightSections', () => {
  it('shows Recently active, Quick filters, and Go to for an empty query', () => {
    const sections = buildSpotlightSections(fixtureSource, '', [])
    expect(sections.map((s) => s.title)).toEqual(['Recently active', 'Quick filters', 'Go to'])
    expect(sections.map(keys)).toEqual([
      ['customer-2', 'customer-1', 'customer-3', 'customer-4'],
      ['filter-cash-heavy', 'filter-investment-gap-reksa', 'filter-kyc'],
      ['page-portfolio', 'page-customers'],
    ])
    const allItems = sections.flatMap((s) => s.items)
    expect(allItems.find((item) => item.key === 'customer-1')).toEqual({
      key: 'customer-1',
      kind: 'customer',
      title: 'Customer 1',
      subtitle: `AUM ${nb('Rp 1 M')} · No BANCA`,
      subtitleTitle: `AUM ${nb('Rp 1.000.000.000')}`,
      count: null,
      to: '/customers/1',
    })
    expect(allItems.find((item) => item.key === 'filter-kyc')).toEqual({
      key: 'filter-kyc',
      kind: 'filter',
      title: 'With KYC note',
      subtitle: 'Open Customers filtered',
      subtitleTitle: null,
      count: 1,
      to: '/customers?kyc=yes',
    })
    expect(allItems.find((item) => item.key === 'page-customers')).toEqual({
      key: 'page-customers',
      kind: 'page',
      title: 'Customers',
      subtitle: 'Ranked list with preview',
      subtitleTitle: null,
      count: null,
      to: '/customers',
    })
  })

  it('treats a whitespace query as empty', () => {
    expect(buildSpotlightSections(fixtureSource, '   ', [])).toEqual(buildSpotlightSections(fixtureSource, '', []))
  })

  it('puts real recent IDs first and skips them in Recently active', () => {
    const sections = buildSpotlightSections(fixtureSource, '', [3, 99])
    expect(sections.map((s) => s.title).slice(0, 2)).toEqual(['Recently viewed', 'Recently active'])
    expect(keys(sections[0]!)).toEqual(['customer-3'])
    expect(keys(sections[1]!)).toEqual(['customer-2', 'customer-1', 'customer-4'])
  })

  it('hides Recently viewed when no stored ID is a customer', () => {
    const sections = buildSpotlightSections(fixtureSource, '', [99])
    expect(sections.map((s) => s.title)).not.toContain('Recently viewed')
  })

  it.each<[string, [string, string[]][]]>([
    ['1', [['Customers', ['customer-1']]]],
    [
      ' NO ',
      [
        [
          'Filters',
          [
            'filter-investment-gap-reksa',
            'filter-investment-gap-ori',
            'filter-investment-gap-banca',
            'filter-no-aum',
            'filter-high-income-no-banca',
            'filter-kyc',
          ],
        ],
      ],
    ],
    ['port', [['Pages', ['page-portfolio']]]],
    ['1a', []],
    ['zzz', []],
  ])('builds the sections for the query %j', (query, expected) => {
    const sections = buildSpotlightSections(fixtureSource, query, [])
    expect(sections.map((s) => [s.title, keys(s)])).toEqual(expected)
  })
})

describe('getSpotlightSections on the real data', () => {
  it('counts the filters over the whole book', () => {
    expect(spotlightFilters(getPortfolio(null)).map((f) => f.count)).toEqual([12, 29, 37, 29, 16, 6, 43])
  })

  it('lists the five most recently active customers', () => {
    const section = getSpotlightSections('', [])[0]!
    expect(keys(section)).toEqual(['customer-2759', 'customer-7550', 'customer-7903', 'customer-2237', 'customer-3349'])
    expect(section.items.map((item) => item.subtitle)).toEqual([
      `AUM ${nb('Rp 13 M')} · Cash-heavy 91%`,
      `AUM ${nb('Rp 137,6 jt')} · No REKSA`,
      `AUM ${nb('Rp 21,1 M')} · No REKSA`,
      `AUM ${nb('Rp 14,3 M')} · No REKSA`,
      `AUM ${nb('Rp 4,6 M')} · Cash-heavy 90%`,
    ])
  })

  it('fills Recently active past a viewed customer', () => {
    const sections = getSpotlightSections('', [2759, 99999])
    expect(keys(sections[0]!)).toEqual(['customer-2759'])
    expect(keys(sections[1]!)).toEqual(['customer-7550', 'customer-7903', 'customer-2237', 'customer-3349', 'customer-5725'])
  })

  it('finds 8797 and 8779 for " 87 "', () => {
    const sections = getSpotlightSections(' 87 ', [])
    expect(sections.map((s) => s.title)).toEqual(['Customers'])
    expect(sections[0]!.items.map((item) => item.subtitle)).toEqual([
      `AUM ${nb('Rp 1,3 M')} · Cash-heavy 84%`,
      `AUM ${nb('Rp 2,9 M')} · No REKSA`,
    ])
    expect(sections[0]!.items[0]!.subtitleTitle).toBe(`AUM ${nb('Rp 1.262.383.866')}`)
  })

  it('shows five customers for "1"', () => {
    expect(keys(getSpotlightSections('1', [])[0]!)).toEqual([
      'customer-7163',
      'customer-2146',
      'customer-4251',
      'customer-6217',
      'customer-7170',
    ])
  })

  it('shows no chip for 3569', () => {
    const sections = getSpotlightSections('3569', [])
    expect(sections[0]!.items[0]!.subtitle).toBe(`AUM ${nb('Rp 9,1 M')}`)
  })
})
