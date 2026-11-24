import { BadgeCheckIcon, TriangleAlertIcon } from 'lucide-react'
import type { Customer360 } from '@/lib/selectors/customer360'

/** "Customer 4426", gender, the income band (no rank), the flags, and the first transaction. */
export function ProfileHeader({
  heading,
  profile,
  kycNote,
}: {
  heading: string
  profile: Customer360['profile']
  /** The KYC income-band note fired. */
  kycNote: boolean
}) {
  return (
    <header className="flex flex-col gap-1.5">
      <h1 className="font-heading text-2xl font-semibold tabular-nums">{heading}</h1>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
        <span>{profile.gender}</span>
        <span aria-hidden="true">·</span>
        <span>{profile.incomeBand}</span>
        {profile.firstTransaction ? (
          <>
            <span aria-hidden="true">·</span>
            <span>{profile.firstTransaction}</span>
          </>
        ) : null}
      </p>
      {profile.highIncome || kycNote ? (
        <ul aria-label="Flags" className="flex flex-wrap gap-1.5 text-xs">
          {profile.highIncome ? (
            <li className="inline-flex items-center gap-1 rounded-full bg-info px-2 py-0.5 text-info-foreground">
              <BadgeCheckIcon aria-hidden="true" className="size-3.5" />
              High income
            </li>
          ) : null}
          {kycNote ? (
            <li className="inline-flex items-center gap-1 rounded-full bg-warning-surface px-2 py-0.5 text-warning-surface-foreground">
              <TriangleAlertIcon aria-hidden="true" className="size-3.5" />
              KYC note
            </li>
          ) : null}
        </ul>
      ) : null}
    </header>
  )
}
