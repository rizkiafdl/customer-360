import { createColumnHelper } from '@tanstack/react-table'
import { formatIDR, formatPercent } from '@/lib/format'
import type { Customer360 } from '@/lib/selectors/customer360'
import { DataTable } from './DataTable'
import type { Features } from './table-features'

type Loans = Customer360['loans']

const held = createColumnHelper<Features, Loans['held'][number]>()

const heldColumns = held.columns([
  held.accessor('product', { header: 'Product code' }),
  held.accessor('amount', { header: 'Amount', cell: (info) => formatIDR(info.getValue()) }),
  held.accessor('shareOfExposure', {
    header: 'Share of loan exposure',
    cell: (info) => formatPercent(info.getValue()),
  }),
])

/** Held loan facilities: code, amount, and share of loan exposure. Codes are not mapped to types (Rule 3). */
export function LoanTable({ rows }: { rows: Loans['held'] }) {
  return (
    <DataTable label="Loan facilities" columns={heldColumns} data={rows} rightAligned={['amount', 'shareOfExposure']} />
  )
}

const notHeld = createColumnHelper<Features, Loans['notHeld'][number]>()

const notHeldColumns = notHeld.columns([
  notHeld.accessor('product', { header: 'Product code' }),
  notHeld.accessor((row) => row.amount ?? undefined, {
    id: 'amount',
    header: 'Amount',
    sortUndefined: 'last',
    cell: (info) => {
      const amount = info.getValue()
      return amount === undefined ? <span aria-label="No amount">—</span> : formatIDR(amount)
    },
  }),
])

/** LOAN rows with amount 0 or no amount, shown muted. */
export function LoanNotHeldTable({ rows }: { rows: Loans['notHeld'] }) {
  return (
    <DataTable
      label="Loan rows not held"
      columns={notHeldColumns}
      data={rows}
      rightAligned={['amount']}
      rowClassName={() => 'text-muted-foreground'}
    />
  )
}
