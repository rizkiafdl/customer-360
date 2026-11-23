import { describe, expect, it } from 'vitest'
import { customersQuery } from './customers'

describe('customersQuery', () => {
  it('is empty with no filter', () => {
    expect(customersQuery({})).toBe('')
    expect(customersQuery({ rule: null, band: null, kyc: null, lacks: null, q: null, page: 1 })).toBe('')
  })

  it('writes the params in a fixed order, page only above 1', () => {
    expect(
      customersQuery({ page: 2, q: '12', lacks: 'ORI', kyc: false, band: 4, rule: 'investment-gap-reksa' }),
    ).toBe('?rule=investment-gap-reksa&band=4&kyc=no&lacks=ORI&q=12&page=2')
    expect(customersQuery({ kyc: true })).toBe('?kyc=yes')
  })
})
