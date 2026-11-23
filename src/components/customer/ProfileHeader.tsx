import { InfoIcon } from 'lucide-react'
import type { Customer360 } from '@/lib/selectors/customer360'

/** "Customer 4426", gender, income band with its rank, and the "High income" label. */
export function ProfileHeader({ heading, profile }: { heading: string; profile: Customer360['profile'] }) {
  return (
    <header className="flex flex-col gap-1">
      <h1 className="font-heading text-xl font-semibold tabular-nums">{heading}</h1>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
        <span>{profile.gender}</span>
        <span aria-hidden="true">·</span>
        <span>
          {profile.incomeBand} ({profile.incomeRankLabel})
        </span>
        {profile.highIncome ? (
          <span className="inline-flex items-center gap-1 rounded-md border border-info/50 px-1.5 py-0.5 text-xs text-foreground">
            <InfoIcon aria-hidden="true" className="size-3 text-info" />
            High income
          </span>
        ) : null}
      </p>
    </header>
  )
}
