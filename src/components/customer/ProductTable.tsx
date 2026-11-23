import { createColumnHelper } from '@tanstack/react-table'
import type { ProductRow } from '@/lib/selectors/customer360'
import { formatIDR } from '@/lib/format'
import { DataTable } from './DataTable'
import type { Features } from './table-features'

const helper = createColumnHelper<Features, ProductRow>()

const columns = helper.columns([
  helper.accessor('product', { header: 'Product' }),
  helper.accessor('category', {
    header: 'Category',
    cell: (info) => (
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden="true" className="size-2 rounded-full" style={{ background: info.row.original.color }} />
        {info.getValue()}
      </span>
    ),
  }),
  helper.accessor((row) => row.amount ?? undefined, {
    id: 'amount',
    header: 'Amount',
    sortUndefined: 'last',
    cell: (info) => {
      const amount = info.getValue()
      return amount === undefined ? <span aria-label="No amount">—</span> : formatIDR(amount)
    },
  }),
  helper.accessor('held', { header: 'Held', cell: (info) => (info.getValue() ? 'Yes' : 'No') }),
])

/** Every portfolio row, LOAN included. Rows that are not held (0 or no amount) are muted. */
export function ProductTable({ rows }: { rows: ProductRow[] }) {
  return (
    <DataTable
      label="Products"
      columns={columns}
      data={rows}
      rightAligned={['amount']}
      rowClassName={(row) => (row.muted ? 'text-muted-foreground' : '')}
    />
  )
}
