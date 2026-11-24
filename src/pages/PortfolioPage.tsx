import { Link, useSearchParams } from 'react-router'
import { ChartCard } from '@/components/customer/ChartCard'
import { KpiTile } from '@/components/customer/KpiTile'
import { Money } from '@/components/customer/Money'
import { BandChips } from '@/components/portfolio/BandChips'
import { IncomeAumScatter } from '@/components/portfolio/IncomeAumScatter'
import { OpportunityTiles } from '@/components/portfolio/OpportunityTiles'
import { PenetrationList } from '@/components/portfolio/PenetrationList'
import { parseCustomerFilters } from '@/lib/selectors/customers'
import { getPortfolio } from '@/lib/selectors/portfolio'

/** Route `/`: the book over one income band or all customers (redesign v2 spec, section 6.2). */
export function PortfolioPage() {
  const [params, setParams] = useSearchParams()
  const portfolio = getPortfolio(parseCustomerFilters(params).band)
  const { customers, totals, kyc, scatter } = portfolio

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Portfolio</h1>
          <p className="mt-1 text-sm text-muted-foreground tabular-nums">{portfolio.header}</p>
        </div>
        <BandChips
          band={portfolio.band?.rank ?? null}
          onChange={(band) => setParams(band === null ? {} : { band: String(band) })}
        />
      </div>

      <section aria-label="Book totals">
        <dl className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <KpiTile label="Customers" context={customers.text}>
            {customers.count}
          </KpiTile>
          <KpiTile label="Total AUM">
            <Money amount={totals.aum} />
          </KpiTile>
          <KpiTile label="Loan exposure" context="Not part of AUM.">
            <Money amount={totals.loanExposure} />
          </KpiTile>
          <KpiTile
            label={
              // The whole tile is the link target; the link text is the label.
              <Link
                to={kyc.to}
                className="outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-ring"
              >
                With KYC note
              </Link>
            }
            context={kyc.text}
            className="relative hover:border-primary-border"
          >
            {kyc.count}
          </KpiTile>
        </dl>
      </section>

      <OpportunityTiles line={portfolio.opportunitiesLine} opportunities={portfolio.opportunities} />

      <PenetrationList rows={portfolio.penetration} />

      <ChartCard label="Income band vs AUM" title={scatter.title} footer={scatter.footer}>
        <IncomeAumScatter label="Income band vs AUM" scatter={scatter} />
      </ChartCard>
    </div>
  )
}
