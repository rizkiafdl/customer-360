import { ChartCard } from '@/components/customer/ChartCard'
import { HorizontalBars } from '@/components/customer/HorizontalBars'
import { KpiTile } from '@/components/customer/KpiTile'
import { Money } from '@/components/customer/Money'
import { IncomeAumScatter } from '@/components/overview/IncomeAumScatter'
import { OpportunityStrip } from '@/components/overview/OpportunityStrip'
import { getOverview } from '@/lib/selectors/overview'

/** Route `/overview`: the book in a few numbers and two charts (F5 spec, section 5). */
export function OverviewPage() {
  const overview = getOverview()
  const { totals, penetration, scatter } = overview
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-xl font-semibold">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground tabular-nums">{overview.header}</p>
      </div>

      <section aria-label="Book totals">
        <dl className="grid grid-cols-2 gap-2 md:max-w-xl">
          <KpiTile label="Total AUM">
            <Money amount={totals.aum} />
          </KpiTile>
          <KpiTile label="Total loan exposure" context="Not part of AUM.">
            <Money amount={totals.loanExposure} />
          </KpiTile>
        </dl>
      </section>

      <OpportunityStrip opportunities={overview.opportunities} />

      <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <ChartCard label="Product penetration" title={penetration.title}>
          <HorizontalBars label="Product penetration" format="count" data={penetration.bars} />
        </ChartCard>
        <ChartCard label="Income band vs AUM" title={scatter.title} footer={scatter.footer}>
          <IncomeAumScatter label="Income band vs AUM" scatter={scatter} />
        </ChartCard>
      </div>
    </div>
  )
}
