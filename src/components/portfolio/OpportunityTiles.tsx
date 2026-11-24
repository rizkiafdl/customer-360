import { Link } from 'react-router'
import type { Portfolio } from '@/lib/selectors/portfolio'

/** One tile per rule, in rule order. Each tile opens the Customers list filtered by that rule. */
export function OpportunityTiles({ line, opportunities }: { line: string; opportunities: Portfolio['opportunities'] }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 id="opportunities" className="font-heading text-base font-semibold">
        Opportunities
      </h2>
      <p className="text-sm text-muted-foreground tabular-nums">{line}</p>
      <ul aria-label="Opportunities" className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {opportunities.map((o) => (
          <li key={o.id}>
            <Link
              to={o.to}
              aria-label={o.name}
              className="flex h-full flex-col gap-1 rounded-lg border bg-card px-3 py-2.5 outline-none hover:border-primary-border focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex items-baseline gap-2">
                <span className="font-heading text-2xl font-semibold tabular-nums">{o.count}</span>
                <span className="text-sm font-medium">{o.label}</span>
              </span>
              <span className="text-xs text-muted-foreground">{o.ruleText}</span>
              {o.amountLine ? <span className="mt-auto pt-1 text-xs tabular-nums">{o.amountLine}</span> : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
