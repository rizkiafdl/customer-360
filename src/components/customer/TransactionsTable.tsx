import { createColumnHelper } from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { formatDate, formatIDR } from '@/lib/format'
import { filterTransactionRows, type TransactionFilter, type TransactionRow } from '@/lib/selectors/customer360'
import { DataTable } from './DataTable'
import type { Features } from './table-features'

const helper = createColumnHelper<Features, TransactionRow>()

const columns = helper.columns([
  helper.accessor('date', { header: 'Date', cell: (info) => formatDate(info.getValue()) }),
  helper.accessor('method', { header: 'Method' }),
  helper.accessor('type', { header: 'Type' }),
  helper.accessor('amount', { header: 'Amount', cell: (info) => formatIDR(info.getValue()) }),
])

const FILTERS: { value: TransactionFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'customer', label: 'Customer-initiated' },
  { value: 'bank', label: 'Bank entries' },
]

/** Every transaction, newest first, with a filter: all, customer-initiated, or bank entries. */
export function TransactionsTable({ rows }: { rows: TransactionRow[] }) {
  const [filter, setFilter] = useState<TransactionFilter>('all')
  const visible = useMemo(() => filterTransactionRows(rows, filter), [rows, filter])

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={filter}
          onValueChange={(value) => {
            if (value) setFilter(value as TransactionFilter)
          }}
          aria-label="Filter transactions"
        >
          {FILTERS.map((f) => (
            <ToggleGroupItem key={f.value} value={f.value}>
              {f.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <span className="text-xs text-muted-foreground tabular-nums" aria-live="polite">
          {visible.length} of {rows.length} rows
        </span>
      </div>
      <DataTable label="Transactions" columns={columns} data={visible} rightAligned={['amount']} />
    </div>
  )
}
