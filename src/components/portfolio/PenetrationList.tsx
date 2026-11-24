import type { ReactNode } from 'react'
import { Link } from 'react-router'
import type { Portfolio } from '@/lib/selectors/portfolio'

type Row = Portfolio['penetration'][number]

function RowContent({ row }: { row: Row }) {
  return (
    <>
      <span className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-medium">{row.label}</span>
        <span className="text-muted-foreground tabular-nums">
          <span className="text-foreground">{row.held}</span> · {row.notHeldText}
        </span>
      </span>
      {/* Bar width is held over the customers in view: drawing geometry from two given counts. */}
      <span aria-hidden="true" className="block h-2 overflow-hidden rounded-full bg-muted">
        <span
          className="block h-full rounded-full"
          style={{ width: `${(row.held / Math.max(row.held + row.notHeld, 1)) * 100}%`, backgroundColor: row.color }}
        />
      </span>
    </>
  )
}

/** Held / not held per product. Each AUM product opens the customers who do not hold it; LOAN has no link. */
export function PenetrationList({ rows }: { rows: Portfolio['penetration'] }) {
  return (
    <section className="flex min-w-0 flex-col gap-2 rounded-lg border bg-card p-3">
      <h2 className="font-heading text-base font-semibold">Product penetration</h2>
      <ul aria-label="Product penetration" className="flex flex-col gap-1">
        {rows.map((row) => {
          const content: ReactNode = <RowContent row={row} />
          return (
            <li key={row.label}>
              {row.to ? (
                <Link
                  to={row.to}
                  aria-label={row.name}
                  className="flex flex-col gap-1.5 rounded-md p-2 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {content}
                </Link>
              ) : (
                <div className="flex flex-col gap-1.5 p-2">{content}</div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
