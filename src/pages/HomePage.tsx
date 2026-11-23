import { Link } from 'react-router'
import { getCustomerOptions } from '@/lib/selectors/customer360'

/** A plain customer list until the worklist (F4) replaces it. */
export function HomePage() {
  const options = getCustomerOptions()

  return (
    <section>
      <h1 className="font-heading text-xl font-semibold">Customers</h1>
      <p className="mt-1 text-sm text-muted-foreground tabular-nums">{options.length} customers. Open one, or search by ID.</p>
      <ul aria-label="Customers" className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] gap-2">
        {options.map((option) => (
          <li key={option.id}>
            <Link
              to={`/customers/${option.id}`}
              className="flex flex-col rounded-lg border bg-card px-3 py-2 text-sm outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="font-medium tabular-nums">{option.label}</span>
              <span className="text-xs text-muted-foreground">{option.detail}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
