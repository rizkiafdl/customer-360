import { ArrowUpRightIcon, TriangleAlertIcon } from 'lucide-react'
import { Link } from 'react-router'
import { Money } from '@/components/customer/Money'
import type { CustomerRow } from '@/lib/selectors/customers'
import { cn } from '@/lib/utils'

const HEADERS = ['Rank', 'Customer', 'AUM', 'Opportunities', 'Last active', 'KYC']

/**
 * One page of customers in the default order (no column sort: the rank is the
 * order, and prev/next on Customer 360 follows it). The customer button selects
 * the row for the preview; the arrow link opens the full 360.
 */
export function CustomersTable({
  rows,
  selectedId,
  onSelect,
  hrefOf,
}: {
  rows: readonly CustomerRow[]
  selectedId: number | null
  onSelect: (id: number) => void
  hrefOf: (id: number) => string
}) {
  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table aria-label="Customers" className="w-full text-sm">
        <thead className="shadow-[0_1px_0_var(--border)]">
          <tr>
            {HEADERS.map((header) => (
              <th
                key={header}
                scope="col"
                className={cn(
                  'h-9 px-3 font-medium whitespace-nowrap text-muted-foreground',
                  header === 'Rank' || header === 'AUM' ? 'text-right' : 'text-left',
                )}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const selected = row.customerId === selectedId
            return (
              <tr
                key={row.customerId}
                onClick={() => onSelect(row.customerId)}
                className={cn('cursor-pointer border-t', selected ? 'bg-selected' : 'hover:bg-accent')}
              >
                <td className="px-3 py-2 text-right text-muted-foreground tabular-nums">{row.rank}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      aria-pressed={selected}
                      onClick={(event) => {
                        event.stopPropagation()
                        onSelect(row.customerId)
                      }}
                      className="rounded-sm font-medium tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Customer {row.customerId}
                    </button>
                    <Link
                      to={hrefOf(row.customerId)}
                      aria-label={`Open customer ${row.customerId}`}
                      onClick={(event) => event.stopPropagation()}
                      className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-accent hover:text-primary-strong focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <ArrowUpRightIcon aria-hidden="true" className="size-4" />
                    </Link>
                  </span>
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <Money amount={row.aum} />
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {row.chip === null ? (
                    <span className="text-muted-foreground">No rule fired</span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="rounded-full border bg-muted px-2 py-0.5 text-xs tabular-nums">{row.chip}</span>
                      {row.moreCount > 0 ? (
                        <span className="text-xs text-muted-foreground tabular-nums">+{row.moreCount}</span>
                      ) : null}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-muted-foreground tabular-nums">
                  {row.lastActive?.label ?? 'No customer-initiated transaction'}
                </td>
                <td className="px-3 py-2">
                  {row.kyc ? (
                    <TriangleAlertIcon role="img" aria-label="KYC note" className="size-4 text-warning" />
                  ) : null}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
