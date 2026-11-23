const idr = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

/**
 * Formats an amount as Indonesian Rupiah, e.g. `Rp 1.500.000`.
 *
 * Whole amounts show no decimals. Fractional amounts keep up to 2 decimals
 * (`Rp 7,9`), because the source data has sub-rupiah values that rounding
 * would hide. The only place in the app that formats money.
 */
export function formatIDR(amount: number): string {
  return idr.format(Object.is(amount, -0) ? 0 : amount)
}
