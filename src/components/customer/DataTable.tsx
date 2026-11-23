import { useTable, type ColumnDef, type RowData, type SortingState } from '@tanstack/react-table'
import { ArrowDownIcon, ArrowUpIcon } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { features, type Features } from './table-features'

/**
 * A dense, sortable table with a sticky header inside a fixed-height scroll
 * area. No pagination: a customer has at most 86 rows.
 */
export function DataTable<T extends RowData>({
  label,
  columns,
  data,
  initialSorting = [],
  rightAligned = [],
  rowClassName,
  maxHeight = 'max-h-96',
}: {
  label: string
  // Columns mix value types, so the cell value type is left open here.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ColumnDef<Features, T, any>[]
  data: T[]
  initialSorting?: SortingState
  rightAligned?: string[]
  rowClassName?: (row: T) => string
  maxHeight?: string
}) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting)
  const table = useTable({
    features,
    columns,
    data,
    state: { sorting },
    onSortingChange: setSorting,
  })
  const align = (id: string) => (rightAligned.includes(id) ? 'text-right' : 'text-left')

  return (
    <div className={cn('overflow-auto rounded-lg border bg-card', maxHeight)}>
      <table aria-label={label} className="w-full text-sm">
        <thead className="sticky top-0 z-[1] bg-card shadow-[0_1px_0_var(--border)]">
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id}>
              {group.headers.map((header) => {
                const sorted = header.column.getIsSorted()
                return (
                  <th
                    key={header.id}
                    scope="col"
                    aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : undefined}
                    className={cn('h-8 px-3 font-medium whitespace-nowrap text-muted-foreground', align(header.column.id))}
                  >
                    {header.column.getCanSort() ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className="inline-flex items-center gap-1 rounded-sm outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <table.FlexRender header={header} />
                        {sorted === 'asc' ? <ArrowUpIcon className="size-3" /> : null}
                        {sorted === 'desc' ? <ArrowDownIcon className="size-3" /> : null}
                      </button>
                    ) : (
                      <table.FlexRender header={header} />
                    )}
                  </th>
                )
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className={cn('border-t first:border-t-0', rowClassName?.(row.original))}>
              {row.getAllCells().map((cell) => (
                <td key={cell.id} className={cn('h-8 px-3 whitespace-nowrap tabular-nums', align(cell.column.id))}>
                  <table.FlexRender cell={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
