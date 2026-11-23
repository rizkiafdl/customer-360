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
 * would hide. With `formatIDRShort`, the only place in the app that formats money.
 */
export function formatIDR(amount: number): string {
  return idr.format(Object.is(amount, -0) ? 0 : amount)
}

const NBSP = ' '

/** Largest first: T (10^12), M (miliar, 10^9), jt (juta, 10^6), rb (ribu, 10^3). */
const UNITS = [
  { size: 1e12, label: 'T' },
  { size: 1e9, label: 'M' },
  { size: 1e6, label: 'jt' },
  { size: 1e3, label: 'rb' },
] as const

const oneDecimal = (n: number) => Math.round(n * 10) / 10

/**
 * Short Rupiah for tiles and chart labels, e.g. `Rp 350 jt`, `Rp 1,2 M`.
 *
 * At most 1 decimal with an Indonesian comma and no trailing `,0`. Below
 * 1,000 it is the full `formatIDR` form. A value that rounds to 1,000 of a
 * unit moves up a unit (`999.960.000` → `Rp 1 M`). Negative values keep the
 * sign. Spaces are no-break spaces, so the value never wraps. Show the full
 * `formatIDR` value next to it (a tooltip) wherever it is used.
 */
export function formatIDRShort(amount: number): string {
  const abs = Math.abs(amount)
  let index = UNITS.findIndex((unit) => abs >= unit.size)
  if (index === -1) return formatIDR(amount).replaceAll(' ', NBSP)
  let scaled = oneDecimal(abs / UNITS[index]!.size)
  if (scaled >= 1000 && index > 0) {
    index -= 1
    scaled = oneDecimal(abs / UNITS[index]!.size)
  }
  const number = formatIDR(Math.sign(amount) * scaled).replaceAll(' ', NBSP)
  return `${number}${NBSP}${UNITS[index]!.label}`
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

function dateParts(date: string): { day: number; month: string; year: string } {
  const match = ISO_DATE.exec(date)
  const month = match ? MONTHS[Number(match[2]) - 1] : undefined
  if (!match || month === undefined) throw new RangeError(`Not a YYYY-MM-DD date: ${JSON.stringify(date)}`)
  return { day: Number(match[3]), month, year: match[1]! }
}

/** `2024-04-26` → `26 Apr 2024`. Fixed English month names, so it does not depend on the locale. */
export function formatDate(date: string): string {
  const { day, month, year } = dateParts(date)
  return `${day} ${month} ${year}`
}

/** `2024-02-26` → `26 Feb`. */
export function formatDayMonth(date: string): string {
  const { day, month } = dateParts(date)
  return `${day} ${month}`
}

/** `2014-07-03` → `Jul 2014`. */
export function formatMonthYear(date: string): string {
  const { month, year } = dateParts(date)
  return `${month} ${year}`
}

/** A share from 0 to 1 as a whole percent: `0.784` → `78%`. */
export function formatPercent(share: number): string {
  return `${Math.round(share * 100)}%`
}
