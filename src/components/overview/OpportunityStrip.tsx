import { Link } from 'react-router'
import type { Overview } from '@/lib/selectors/overview'

/** Customers per opportunity type, in rule order. Each count opens the worklist filtered by that rule. */
export function OpportunityStrip({ opportunities }: { opportunities: Overview['opportunities'] }) {
  return (
    <section aria-labelledby="opportunities" className="flex flex-col gap-2">
      <h2 id="opportunities" className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Customers per opportunity type
      </h2>
      <ul aria-label="Customers per opportunity type" className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        {opportunities.map((o) => (
          <li key={o.id}>
            <Link
              to={o.to}
              className="flex h-full flex-col gap-1 rounded-lg border bg-card px-3 py-2.5 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="text-lg font-semibold tabular-nums">{o.count}</span>
              <span className="text-xs text-muted-foreground">{o.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
