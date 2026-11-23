import { describe, expect, it } from 'vitest'
import type { PortfolioItem, ProductCategory } from '@/types'
import {
  AUM_CATEGORIES,
  CATEGORY_COLORS,
  amountByCategory,
  customerAum,
  heldCount,
  holdsCategory,
  isHeld,
  loanExposure,
} from './portfolio'

function row(
  product_category: ProductCategory,
  amount: number | null,
  product: string | null = 'TABUNGAN',
): PortfolioItem {
  return { customer_id: 1, product, product_category, amount }
}

const mixed = [row('FUNDING', 100), row('ORI', 50), row('LOAN', 999), row('REKSA', null)]

describe('AUM_CATEGORIES', () => {
  it('is every category except LOAN', () => {
    expect(AUM_CATEGORIES).toEqual(['FUNDING', 'ORI', 'BANCA', 'REKSA'])
  })
})

describe('isHeld', () => {
  it('is true for a positive amount', () => {
    expect(isHeld(row('FUNDING', 1))).toBe(true)
  })

  it('is false for a zero amount', () => {
    expect(isHeld(row('FUNDING', 0))).toBe(false)
  })

  it('is false for a null amount', () => {
    expect(isHeld(row('FUNDING', null))).toBe(false)
  })
})

describe('customerAum', () => {
  it('is 0 for no rows', () => {
    expect(customerAum([])).toBe(0)
  })

  it('sums the AUM categories, ignores LOAN, and counts null as 0', () => {
    expect(customerAum(mixed)).toBe(150)
  })

  it('includes BANCA', () => {
    expect(customerAum([row('BANCA', 7)])).toBe(7)
  })
})

describe('loanExposure', () => {
  it('is 0 for no rows', () => {
    expect(loanExposure([])).toBe(0)
  })

  it('sums only LOAN rows', () => {
    expect(loanExposure(mixed)).toBe(999)
  })

  it('counts a null LOAN amount as 0', () => {
    expect(loanExposure([row('LOAN', null, 'GIRO'), row('LOAN', 5)])).toBe(5)
  })
})

describe('amountByCategory', () => {
  it('has all five categories at 0 for no rows', () => {
    expect(amountByCategory([])).toEqual({ FUNDING: 0, LOAN: 0, ORI: 0, BANCA: 0, REKSA: 0 })
  })

  it('keeps the same product name under FUNDING and LOAN apart', () => {
    const rows = [row('FUNDING', 10, 'GIRO'), row('LOAN', 20, 'GIRO')]
    expect(amountByCategory(rows)).toEqual({ FUNDING: 10, LOAN: 20, ORI: 0, BANCA: 0, REKSA: 0 })
  })

  it('counts null as 0', () => {
    expect(amountByCategory(mixed)).toEqual({ FUNDING: 100, LOAN: 999, ORI: 50, BANCA: 0, REKSA: 0 })
  })
})

describe('CATEGORY_COLORS', () => {
  it('maps the AUM categories to --chart-1..4 in AUM order', () => {
    expect(AUM_CATEGORIES.map((c) => CATEGORY_COLORS[c])).toEqual([
      'var(--chart-1)',
      'var(--chart-2)',
      'var(--chart-3)',
      'var(--chart-4)',
    ])
  })

  it('gives LOAN its own token, unlike every AUM category', () => {
    expect(CATEGORY_COLORS.LOAN).toBe('var(--chart-5)')
    expect(AUM_CATEGORIES.map((c) => CATEGORY_COLORS[c])).not.toContain(CATEGORY_COLORS.LOAN)
  })
})

describe('heldCount', () => {
  it('counts rows with amount above 0', () => {
    expect(heldCount(mixed)).toBe(3)
    expect(heldCount([])).toBe(0)
  })
})

describe('holdsCategory', () => {
  it('is true when a row of the category has an amount above 0', () => {
    expect(holdsCategory([row('LOAN', 5), row('ORI', 1)], 'ORI')).toBe(true)
  })

  it('is false when the only row of the category has amount 0', () => {
    expect(holdsCategory([row('ORI', 0)], 'ORI')).toBe(false)
  })

  it('is false when the only row of the category has a null amount', () => {
    expect(holdsCategory([row('ORI', null)], 'ORI')).toBe(false)
  })

  it('is false with no row of the category', () => {
    expect(holdsCategory([row('FUNDING', 100)], 'ORI')).toBe(false)
  })
})
