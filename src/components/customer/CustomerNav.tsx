import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { Link } from 'react-router'
import type { CustomerTab } from '@/lib/selectors/customer360'
import { customerHref, listHref, positionText, type CustomerFilters } from '@/lib/selectors/customers'

const STEP =
  'inline-flex size-9 items-center justify-center rounded-md border bg-card outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring'

/**
 * The breadcrumb back to the filtered Customers list, and prev/next through
 * that list (no wrap). Prev/next show only when the customer is in the list.
 */
export function CustomerNav({
  id,
  filters,
  tab,
  position,
}: {
  id: number
  filters: CustomerFilters
  tab: CustomerTab
  position: { position: number; total: number; prevId: number | null; nextId: number | null } | null
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <nav aria-label="Breadcrumb">
        <ol className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <li>
            <Link
              to={listHref(filters)}
              className="rounded-sm text-primary-strong underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            >
              Customers
            </Link>
          </li>
          <li aria-hidden="true">›</li>
          <li aria-current="page" className="text-foreground tabular-nums">
            Customer {id}
          </li>
        </ol>
      </nav>
      {position ? (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground tabular-nums">{positionText(position)}</span>
          {position.prevId !== null ? (
            <Link to={customerHref(position.prevId, filters, tab)} aria-label="Previous customer" className={STEP}>
              <ChevronLeftIcon aria-hidden="true" className="size-4" />
            </Link>
          ) : null}
          {position.nextId !== null ? (
            <Link to={customerHref(position.nextId, filters, tab)} aria-label="Next customer" className={STEP}>
              <ChevronRightIcon aria-hidden="true" className="size-4" />
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
