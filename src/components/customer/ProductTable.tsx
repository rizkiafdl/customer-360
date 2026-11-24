import { createColumnHelper } from '@tanstack/react-table'
import type { Customer360, NotHeldRow } from '@/lib/selectors/customer360'
import { formatIDR, formatPercent } from '@/lib/format'
import { DataTable } from './DataTable'
import type { Features } from './table-features'

type HeldRow = Customer360['holdings']['held'][number]

function CategoryCell({ category, color }: { category: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden="true" className="size-2 rounded-full" style={{ background: color }} />
      {category}
    </span>
  )
}

const held = createColumnHelper<Features, HeldRow>()

const heldColumns = held.columns([
  held.accessor('product', { header: 'Product' }),
  held.accessor('category', {
    header: 'Category',
    cell: (info) => <CategoryCell category={info.getValue()} color={info.row.original.color} />,
  }),
  held.accessor('amount', { header: 'Amount', cell: (info) => formatIDR(info.getValue()) }),
  held.accessor('share', { header: 'Share of AUM', cell: (info) => formatPercent(info.getValue()) }),
])

/** Held AUM rows, amount high to low, each with its share of AUM. Never LOAN. */
export function ProductTable({ rows }: { rows: HeldRow[] }) {
  return <DataTable label="Holdings" columns={heldColumns} data={rows} rightAligned={['amount', 'share']} />
}

const notHeld = createColumnHelper<Features, NotHeldRow>()

const notHeldColumns = notHeld.columns([
  notHeld.accessor('product', { header: 'Product' }),
  notHeld.accessor('category', {
    header: 'Category',
    cell: (info) => <CategoryCell category={info.getValue()} color={info.row.original.color} />,
  }),
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

/** AUM rows with amount 0 or no amount, shown muted. */
export function NotHeldTable({ rows }: { rows: NotHeldRow[] }) {
  return (
    <DataTable
      label="Products not held"
      columns={notHeldColumns}
      data={rows}
      rightAligned={['amount']}
      rowClassName={() => 'text-muted-foreground'}
    />
  )
}
