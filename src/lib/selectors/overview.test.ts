import { describe, expect, it } from 'vitest'
import { CATEGORY_COLORS } from '@/lib/domain'
import type { PortfolioItem } from '@/types'
import type { Dataset } from './dataset'
import { buildOverview, getOverview } from './overview'

function item(
  customer_id: number,
  product_category: PortfolioItem['product_category'],
  amount: number,
  product = 'TABSYA',
): PortfolioItem {
  return { customer_id, product, product_category, amount }
}

/**
 * - 1: cash-heavy, holds FUNDING, ORI, LOAN.
 * - 2: cash-heavy, holds FUNDING, BANCA, REKSA.
 * - 3: no rows: AUM 0, high income without BANCA.
 * - 4: KYC note (income rank 2, AUM Rp 1 M in deposits), a LOAN row at 0 (not held).
 */
const fixture: Dataset = {
  profiles: [
    { customer_id: 1, gender: 'F', customer_income: '>5 Juta - 10 Juta' },
    { customer_id: 2, gender: 'M', customer_income: 'sd. 1 Juta' },
    { customer_id: 3, gender: null, customer_income: '>100 Juta' },
    { customer_id: 4, gender: 'F', customer_income: '>1 Juta - 3 Juta' },
  ],
  portfolio: [
    item(1, 'FUNDING', 100),
    item(1, 'ORI', 5, 'ORI'),
    item(1, 'LOAN', 50, 'KPR'),
    item(2, 'FUNDING', 200),
    item(2, 'BANCA', 10, 'BANCA'),
    item(2, 'REKSA', 10, 'REKSA'),
    item(4, 'FUNDING', 1_000_000_000, 'DEPOSITO01'),
    item(4, 'LOAN', 0, 'KPR'),
  ],
  transactions: [
    {
      activity_date: '2024-04-26',
      customer_id: 1,
      transaction_method: 'ATM',
      transaction_type: 'WITHDRAWAL',
      transaction_amount: 50_000,
    },
  ],
}

const overview = buildOverview(fixture)

describe('buildOverview', () => {
  it('has the as-of date and the customer count in the header', () => {
    expect(overview.header).toBe('As of 26 Apr 2024 · 4 customers')
  })

  it('keeps total AUM and total loan exposure apart', () => {
    expect(overview.totals).toEqual({ aum: 1_000_000_325, loanExposure: 50 })
  })

  it('counts customers per opportunity type, in RULE_ORDER, each linking to the filtered worklist', () => {
    expect(overview.opportunities).toEqual([
      {
        id: 'cash-heavy',
        label: 'Cash-heavy AUM',
        count: 2,
        name: 'Cash-heavy AUM: 2 customers',
        to: '/?rule=cash-heavy',
      },
      {
        id: 'investment-gap-reksa',
        label: 'No REKSA',
        count: 1,
        name: 'No REKSA: 1 customer',
        to: '/?rule=investment-gap-reksa',
      },
      {
        id: 'investment-gap-ori',
        label: 'No ORI',
        count: 1,
        name: 'No ORI: 1 customer',
        to: '/?rule=investment-gap-ori',
      },
      {
        id: 'investment-gap-banca',
        label: 'No BANCA',
        count: 1,
        name: 'No BANCA: 1 customer',
        to: '/?rule=investment-gap-banca',
      },
      {
        id: 'no-aum',
        label: 'No AUM',
        count: 1,
        name: 'No AUM: 1 customer',
        to: '/?rule=no-aum',
      },
      {
        id: 'high-income-no-banca',
        label: 'High income, no BANCA',
        count: 1,
        name: 'High income, no BANCA: 1 customer',
        to: '/?rule=high-income-no-banca',
      },
    ])
  })

  it('counts holders per category (amount above 0 only), FUNDING to LOAN, in category colors', () => {
    expect(overview.penetration.bars).toEqual([
      { label: 'FUNDING', value: 3, color: CATEGORY_COLORS.FUNDING },
      { label: 'ORI', value: 1, color: CATEGORY_COLORS.ORI },
      { label: 'BANCA', value: 1, color: CATEGORY_COLORS.BANCA },
      { label: 'REKSA', value: 1, color: CATEGORY_COLORS.REKSA },
      { label: 'LOAN', value: 1, color: CATEGORY_COLORS.LOAN },
    ])
  })

  it('titles the penetration by the lowest count, a tie going to the earlier category', () => {
    expect(overview.penetration.title).toBe('ORI held by 1 of 4 customers')
  })

  it('titles the penetration by a later category when it alone is lowest', () => {
    const noLoan = buildOverview({ ...fixture, portfolio: fixture.portfolio.filter((i) => i.product !== 'KPR') })
    expect(noLoan.penetration.title).toBe('LOAN held by 0 of 4 customers')
  })

  it('plots only customers with AUM above 0, with the KYC note as a flag', () => {
    expect(overview.scatter.points).toEqual([
      { customerId: 1, rank: 4, band: '>5 Juta - 10 Juta', aum: 105, kyc: false },
      { customerId: 2, rank: 1, band: 'sd. 1 Juta', aum: 220, kyc: false },
      { customerId: 4, rank: 2, band: '>1 Juta - 3 Juta', aum: 1_000_000_000, kyc: true },
    ])
  })

  it('titles the scatter with the plotted and KYC counts, and footnotes the rest', () => {
    expect(overview.scatter.title).toBe('3 customers with AUM, 1 with the KYC note')
    expect(overview.scatter.footer).toBe('1 customer with no AUM is not plotted.')
  })

  it('has no footer when every customer has AUM', () => {
    const allAum = buildOverview({ ...fixture, profiles: fixture.profiles.filter((p) => p.customer_id !== 3) })
    expect(allAum.scatter.footer).toBeNull()
  })

  it('gives the AUM axis one tick per power of ten, from below the lowest point to above the highest', () => {
    expect(overview.scatter.aumTicks).toEqual([100, 1_000, 10_000, 100_000, 1_000_000, 10_000_000, 100_000_000, 1_000_000_000])
  })

  it('has no AUM ticks when no customer has AUM', () => {
    const noAum = buildOverview({ ...fixture, portfolio: [] })
    expect(noAum.scatter.aumTicks).toEqual([])
  })

  it('has one income tick per band, rank 1 to 8', () => {
    expect(overview.scatter.ticks).toHaveLength(8)
    expect(overview.scatter.ticks[0]).toEqual({ rank: 1, band: 'sd. 1 Juta' })
    expect(overview.scatter.ticks[7]).toEqual({ rank: 8, band: '>100 Juta' })
  })
})

// Contract tests on the committed JSON (spec section 7).
describe('overview on the real data', () => {
  const real = getOverview()

  it('has the header', () => {
    expect(real.header).toBe('As of 26 Apr 2024 · 100 customers')
  })

  it('has the book totals', () => {
    expect(real.totals).toEqual({ aum: 811_749_876_893, loanExposure: 1_582_500_470_995 })
  })

  it('has the opportunity counts 12 / 29 / 37 / 29 / 16 / 6', () => {
    expect(real.opportunities.map((o) => o.count)).toEqual([12, 29, 37, 29, 16, 6])
  })

  it('has the penetration 84 / 46 / 54 / 54 / 83 and its title', () => {
    expect(real.penetration.bars.map((b) => b.value)).toEqual([84, 46, 54, 54, 83])
    expect(real.penetration.title).toBe('ORI held by 46 of 100 customers')
  })

  it('plots 84 customers, 43 with the KYC note, and leaves 16 out', () => {
    expect(real.scatter.points).toHaveLength(84)
    expect(real.scatter.points.filter((p) => p.kyc)).toHaveLength(43)
    expect(real.scatter.title).toBe('84 customers with AUM, 43 with the KYC note')
    expect(real.scatter.footer).toBe('16 customers with no AUM are not plotted.')
  })

  it('gives the log axis only positive AUM, the lowest Rp 15.036.089', () => {
    expect(Math.min(...real.scatter.points.map((p) => p.aum))).toBe(15_036_089)
  })

  it('gives the AUM axis the ticks Rp 10 jt to Rp 1 T', () => {
    expect(real.scatter.aumTicks).toEqual([1e7, 1e8, 1e9, 1e10, 1e11, 1e12])
  })
})
