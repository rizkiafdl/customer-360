import { BadgeCheckIcon, ChevronLeftIcon, ChevronRightIcon, TriangleAlertIcon } from 'lucide-react'
import { Link } from 'react-router'
import { Money } from '@/components/customer/Money'
import { Button } from '@/components/ui/button'
import type { CustomerRow } from '@/lib/selectors/customers'

/** The selected row in short form, with prev/next inside the current page and a link to the full 360. */
export function CustomerPreview({
  row,
  position,
  total,
  href,
  onPrevious,
  onNext,
}: {
  row: CustomerRow
  /** 1-based position on the current page. */
  position: number
  /** Rows on the current page. */
  total: number
  href: string
  onPrevious: (() => void) | null
  onNext: (() => void) | null
}) {
  const { preview } = row
  return (
    <section aria-label="Preview" className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-heading text-lg font-semibold tabular-nums">Customer {row.customerId}</h2>
          <p className="text-sm text-muted-foreground">{preview.detail}</p>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">
          {position} of {total}
        </span>
      </div>

      {preview.highIncome || row.kyc ? (
        <ul aria-label="Flags" className="flex flex-wrap gap-1.5 text-xs">
          {preview.highIncome ? (
            <li className="inline-flex items-center gap-1 rounded-full bg-info px-2 py-0.5 text-info-foreground">
              <BadgeCheckIcon aria-hidden="true" className="size-3.5" />
              High income
            </li>
          ) : null}
          {row.kyc ? (
            <li className="inline-flex items-center gap-1 rounded-full bg-warning-surface px-2 py-0.5 text-warning-surface-foreground">
              <TriangleAlertIcon aria-hidden="true" className="size-3.5" />
              KYC note
            </li>
          ) : null}
        </ul>
      ) : null}

      {preview.firstTransaction ? <p className="text-sm text-muted-foreground">{preview.firstTransaction}</p> : null}

      <dl className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border px-3 py-2">
          <dt className="text-xs text-muted-foreground">AUM</dt>
          <dd className="font-semibold">
            <Money amount={row.aum} />
          </dd>
        </div>
        <div className="rounded-lg border px-3 py-2">
          <dt className="text-xs text-muted-foreground">Loan exposure</dt>
          <dd className="font-semibold">
            <Money amount={row.loanExposure} />
          </dd>
        </div>
      </dl>

      {preview.offers.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <h3 className="text-xs font-medium text-muted-foreground">What to offer</h3>
          <ul className="flex flex-col gap-1.5">
            {preview.offers.map((offer) => (
              <li key={offer.product} className="flex flex-col rounded-lg border px-3 py-2">
                <span className="text-sm font-medium">{offer.title}</span>
                {offer.basisText ? (
                  <span className="text-xs text-muted-foreground tabular-nums">{offer.basisText}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {preview.channelText ? <p className="text-sm">{preview.channelText}</p> : null}
      {preview.lastActiveText ? <p className="text-sm text-muted-foreground">{preview.lastActiveText}</p> : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="icon" aria-label="Previous customer" disabled={!onPrevious} onClick={onPrevious ?? undefined}>
          <ChevronLeftIcon aria-hidden="true" />
        </Button>
        <Button variant="outline" size="icon" aria-label="Next customer" disabled={!onNext} onClick={onNext ?? undefined}>
          <ChevronRightIcon aria-hidden="true" />
        </Button>
        <Button asChild className="ml-auto">
          <Link to={href}>Open full 360</Link>
        </Button>
      </div>
    </section>
  )
}
