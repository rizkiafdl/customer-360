import { describe, expect, it } from 'vitest'
import { formatIDR } from './format'

// Intl puts a no-break space (U+00A0) between "Rp" and the number.
const rp = (s: string) => s.replace(' ', ' ')

describe('formatIDR', () => {
  it('formats whole amounts with dot thousand separators and no decimals', () => {
    expect(formatIDR(1_500_000)).toBe(rp('Rp 1.500.000'))
    expect(formatIDR(241_137_116_476)).toBe(rp('Rp 241.137.116.476'))
  })

  it('keeps up to 2 decimals with a comma separator', () => {
    expect(formatIDR(7.9)).toBe(rp('Rp 7,9'))
    expect(formatIDR(928_000.39)).toBe(rp('Rp 928.000,39'))
  })

  it('formats negative amounts with a leading minus', () => {
    expect(formatIDR(-198_336_530)).toBe(rp('-Rp 198.336.530'))
  })

  it('formats zero and negative zero the same way', () => {
    expect(formatIDR(0)).toBe(rp('Rp 0'))
    expect(formatIDR(-0)).toBe(rp('Rp 0'))
  })
})
