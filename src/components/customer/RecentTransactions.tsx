import { Button } from '@/components/ui/button'
import { formatDate, formatIDR } from '@/lib/format'
import type { TransactionRow } from '@/lib/selectors/customer360'

/** The latest transactions in short form, and "View all", which opens the Transactions tab. */
export function RecentTransactions({ rows, onViewAll }: { rows: TransactionRow[]; onViewAll: () => void }) {
  return (
    <section aria-labelledby="recent-transactions" className="flex flex-col gap-2 rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 id="recent-transactions" className="font-heading text-base font-semibold">
          Recent transactions
        </h2>
        <Button variant="outline" size="sm" onClick={onViewAll}>
          View all
        </Button>
      </div>
      <ul aria-label="Recent transactions" className="flex flex-col divide-y">
        {rows.map((row) => (
          <li key={row.key} className="flex items-baseline justify-between gap-3 py-2 text-sm">
            <span className="flex min-w-0 flex-col">
              <span className="truncate">
                {row.type} · {row.method}
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">{formatDate(row.date)}</span>
            </span>
            <span className="whitespace-nowrap tabular-nums">{formatIDR(row.amount)}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
