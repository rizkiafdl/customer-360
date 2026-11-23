import { BankEntriesTable } from '@/components/customer/BankEntriesTable'
import { ChartCard } from '@/components/customer/ChartCard'
import { HorizontalBars } from '@/components/customer/HorizontalBars'
import { KpiRow } from '@/components/customer/KpiRow'
import { ProductTable } from '@/components/customer/ProductTable'
import { ProfileHeader } from '@/components/customer/ProfileHeader'
import { TransactionsTable } from '@/components/customer/TransactionsTable'
import { WeeklyBars } from '@/components/customer/WeeklyBars'
import { BANK_ENTRY_TYPES } from '@/lib/domain'
import type { Customer360 } from '@/lib/selectors/customer360'

const NO_CUSTOMER_ROWS = 'No customer-initiated transactions.'

function SectionHeading({ id, children }: { id: string; children: string }) {
  return (
    <h2 id={id} className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
      {children}
    </h2>
  )
}

/** The Customer 360 page for one customer. Renders the view model only (F1 spec 5.2). */
export function CustomerDetail({ vm }: { vm: Customer360 }) {
  const { holdings, activity, bankEntries } = vm
  return (
    <div className="flex flex-col gap-6">
      <ProfileHeader heading={vm.heading} profile={vm.profile} />
      <KpiRow kpis={vm.kpis} />

      <section aria-labelledby="holdings" className="flex flex-col gap-2">
        <SectionHeading id="holdings">Holdings</SectionHeading>
        {holdings.state === 'none' ? (
          <p className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">{holdings.emptyText}</p>
        ) : (
          <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <ChartCard label="AUM by category" title={holdings.title} emptyText={holdings.emptyText}>
              <HorizontalBars
                label="AUM by category"
                format="idr"
                data={holdings.aumBars.map((bar) => ({ label: bar.category, value: bar.amount, color: bar.color }))}
              />
            </ChartCard>
            <ProductTable rows={holdings.products} />
          </div>
        )}
      </section>

      <section aria-labelledby="activity" className="flex flex-col gap-2">
        <SectionHeading id="activity">Activity</SectionHeading>
        <div className="grid gap-3 lg:grid-cols-3">
          <ChartCard label="Per week" title={activity.weeklyTitle} footer={activity.earlierText}>
            <WeeklyBars label="Customer-initiated transactions per week" data={activity.weekly} />
          </ChartCard>
          <ChartCard
            label="Channel mix"
            title={activity.channelTitle}
            emptyText={activity.channelMix.length ? null : NO_CUSTOMER_ROWS}
          >
            <HorizontalBars
              label="Channel mix"
              format="count"
              data={activity.channelMix.map((e) => ({ label: e.label, value: e.count }))}
            />
          </ChartCard>
          <ChartCard label="Type mix" title={activity.typeTitle} emptyText={activity.typeMix.length ? null : NO_CUSTOMER_ROWS}>
            <HorizontalBars
              label="Type mix"
              format="count"
              data={activity.typeMix.map((e) => ({ label: e.label, value: e.count }))}
            />
          </ChartCard>
        </div>
      </section>

      <section aria-labelledby="bank-entries" className="flex flex-col gap-2">
        <SectionHeading id="bank-entries">Bank entries</SectionHeading>
        <p className="text-sm">
          <span className="font-medium">{bankEntries.title}.</span>{' '}
          <span className="text-muted-foreground">Posted by the bank ({BANK_ENTRY_TYPES.join(', ')}), not by the customer.</span>
        </p>
        {bankEntries.rows.length ? (
          <div className="max-w-xl">
            <BankEntriesTable rows={bankEntries.rows} />
          </div>
        ) : null}
      </section>

      <section aria-labelledby="all-transactions" className="flex flex-col gap-2">
        <SectionHeading id="all-transactions">All transactions</SectionHeading>
        <TransactionsTable rows={vm.transactions} />
      </section>
    </div>
  )
}
