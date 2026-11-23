import { createColumnHelper } from '@tanstack/react-table'
import type { BankEntryTotal } from '@/lib/domain'
import { formatIDR } from '@/lib/format'
import { DataTable } from './DataTable'
import type { Features } from './table-features'

const helper = createColumnHelper<Features, BankEntryTotal>()

const columns = helper.columns([
  helper.accessor('type', { header: 'Type' }),
  helper.accessor('count', { header: 'Count' }),
  helper.accessor('amount', { header: 'Amount', cell: (info) => formatIDR(info.getValue()) }),
])

/** Count and amount per bank-entry type. */
export function BankEntriesTable({ rows }: { rows: BankEntryTotal[] }) {
  return <DataTable label="Bank entries" columns={columns} data={rows} rightAligned={['count', 'amount']} maxHeight="" />
}
