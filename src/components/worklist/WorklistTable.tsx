import { createColumnHelper } from '@tanstack/react-table'
import { TriangleAlertIcon } from 'lucide-react'
import { Link } from 'react-router'
import { DataTable } from '@/components/customer/DataTable'
import { Money } from '@/components/customer/Money'
import type { Features } from '@/components/customer/table-features'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { WorklistRow } from '@/lib/selectors/worklist'

const helper = createColumnHelper<Features, WorklistRow>()

const columns = helper.columns([
  // Ascending first, so one click on Rank restores the default order.
  helper.accessor('rank', { header: 'Rank', sortDescFirst: false }),
  helper.accessor('customerId', {
    header: 'Customer',
    cell: (info) => (
      <Link
        to={info.row.original.href}
        className="font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
      >
        Customer {info.getValue()}
      </Link>
    ),
  }),
  helper.accessor('aum', { header: 'AUM', cell: (info) => <Money amount={info.getValue()} /> }),
  helper.accessor('loanExposure', { header: 'Loan exposure', cell: (info) => <Money amount={info.getValue()} /> }),
  helper.accessor('firedCount', { header: 'Rules' }),
  // Sorts by rule order, not A–Z. Rows with no fired rule stay last in both directions.
  helper.accessor((row) => row.topReasonOrder ?? undefined, {
    id: 'topReason',
    header: 'Top reason',
    sortDescFirst: false,
    sortUndefined: 'last',
    cell: (info) => info.row.original.topReason ?? <span className="text-muted-foreground">No rule fired</span>,
  }),
  helper.accessor((row) => row.kycNote !== null, {
    id: 'kyc',
    header: 'KYC',
    sortFn: 'basic',
    cell: (info) => {
      const note = info.row.original.kycNote
      if (note === null) return null
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              tabIndex={0}
              className="inline-flex items-center gap-1 rounded-sm text-warning outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <TriangleAlertIcon aria-hidden="true" className="size-3.5" />
              KYC note
            </span>
          </TooltipTrigger>
          <TooltipContent className="tabular-nums">{note}</TooltipContent>
        </Tooltip>
      )
    },
  }),
])

/** The ranked worklist. Rows arrive in the default order; every column sorts. */
export function WorklistTable({ rows }: { rows: WorklistRow[] }) {
  return (
    <DataTable
      label="Worklist"
      columns={columns}
      data={rows}
      rightAligned={['rank', 'aum', 'loanExposure', 'firedCount']}
      maxHeight="max-h-[calc(100svh-14rem)]"
    />
  )
}
