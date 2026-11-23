import { Progress } from '@/components/ui/progress'
import { formatDate } from '@/lib/format'
import type { Customer360 } from '@/lib/selectors/customer360'
import { KpiTile } from './KpiTile'
import { Money } from './Money'

/** AUM, loan exposure (its own tile, never added to AUM), products held, recency, digital share. */
export function KpiRow({ kpis }: { kpis: Customer360['kpis'] }) {
  const { recency, digital } = kpis
  return (
    <section aria-label="Key figures">
      <dl className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
        <KpiTile label="AUM">
          <Money amount={kpis.aum} />
        </KpiTile>
        <KpiTile label="Loan exposure">
          <Money amount={kpis.loanExposure} />
        </KpiTile>
        <KpiTile label="Products held">{kpis.heldLabel}</KpiTile>
        <KpiTile label="Last activity" context={recency.lastDate ? formatDate(recency.lastDate) : undefined}>
          {recency.label}
        </KpiTile>
        <KpiTile
          label="Digital share"
          context={
            <>
              <Progress
                value={digital.share === null ? 0 : digital.share * 100}
                aria-label="Digital share"
                className="my-1 h-1.5 *:data-[slot=progress-indicator]:bg-muted-foreground"
              />
              {digital.context}
            </>
          }
        >
          {digital.label}
        </KpiTile>
      </dl>
    </section>
  )
}
