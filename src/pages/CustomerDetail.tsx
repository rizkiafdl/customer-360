import type { ReactNode } from 'react'
import { BankEntriesTable } from '@/components/customer/BankEntriesTable'
import { ChartCard } from '@/components/customer/ChartCard'
import { HorizontalBars } from '@/components/customer/HorizontalBars'
import { InsightCard } from '@/components/customer/InsightCard'
import { KpiRow } from '@/components/customer/KpiRow'
import { ProductOfferList } from '@/components/customer/ProductOfferList'
import { ProductTable } from '@/components/customer/ProductTable'
import { ProfileHeader } from '@/components/customer/ProfileHeader'
import { RecentTransactions } from '@/components/customer/RecentTransactions'
import { TransactionsTable } from '@/components/customer/TransactionsTable'
import { WeeklyBars } from '@/components/customer/WeeklyBars'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BANK_ENTRY_TYPES } from '@/lib/domain'
import { OFFER_PANEL_NOTE_HEADING, OFFER_PANEL_TITLE } from '@/lib/insights'
import { CUSTOMER_TABS, parseTab, type Customer360, type CustomerTab } from '@/lib/selectors/customer360'

const TAB_LABELS: Record<CustomerTab, string> = {
  overview: 'Overview',
  holdings: 'Holdings',
  loans: 'Loans',
  activity: 'Activity',
  transactions: 'Transactions',
}

function SectionHeading({ id, children }: { id: string; children: string }) {
  return (
    <h2 id={id} className="font-heading text-base font-semibold">
      {children}
    </h2>
  )
}

function AumChart({ holdings }: { holdings: Customer360['holdings'] }) {
  if (holdings.state === 'none') {
    return <p className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">{holdings.emptyText}</p>
  }
  return (
    <ChartCard label="AUM by category" title={holdings.title} emptyText={holdings.emptyText}>
      <HorizontalBars
        label="AUM by category"
        format="idr"
        data={holdings.aumBars.map((bar) => ({ label: bar.category, value: bar.amount, color: bar.color }))}
      />
    </ChartCard>
  )
}

/**
 * The Customer 360 page for one customer: the fixed summary (nav, header,
 * key figures), then one tab at a time. Renders the view model only.
 */
export function CustomerDetail({
  vm,
  tab,
  onTabChange,
  nav,
}: {
  vm: Customer360
  tab: CustomerTab
  onTabChange: (tab: CustomerTab) => void
  nav: ReactNode
}) {
  const { holdings, activity, bankEntries, offers } = vm
  return (
    <div className="flex flex-col gap-5">
      {nav}
      <ProfileHeader heading={vm.heading} profile={vm.profile} kycNote={offers.note !== null} />
      <KpiRow kpis={vm.kpis} />

      <Tabs value={tab} onValueChange={(value) => onTabChange(parseTab(value))} className="gap-4">
        <TabsList variant="line" aria-label="Customer sections" className="w-full justify-start overflow-x-auto border-b">
          {CUSTOMER_TABS.map((id) => (
            <TabsTrigger key={id} value={id} className="flex-none px-3">
              {TAB_LABELS[id]}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="flex flex-col gap-4">
          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <section aria-labelledby="what-to-offer" className="flex flex-col gap-3">
              <SectionHeading id="what-to-offer">{OFFER_PANEL_TITLE}</SectionHeading>
              {vm.productOffers.length ? (
                <ProductOfferList offers={vm.productOffers} channelText={vm.channelText} />
              ) : (
                <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">{offers.emptyText}</p>
              )}
              {offers.note ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-medium text-muted-foreground">{OFFER_PANEL_NOTE_HEADING}</h3>
                    <Separator className="flex-1" />
                  </div>
                  <InsightCard card={offers.note} />
                </div>
              ) : null}
            </section>
            <div className="flex flex-col gap-4">
              <AumChart holdings={holdings} />
              <RecentTransactions rows={vm.recent} onViewAll={() => onTabChange('transactions')} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="holdings">
          {holdings.state === 'none' ? (
            <p className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">{holdings.emptyText}</p>
          ) : (
            <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
              <AumChart holdings={holdings} />
              <ProductTable rows={holdings.products} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="loans" className="flex flex-col gap-2">
          <p className="text-sm font-medium">{vm.loans.title}</p>
          <p className="text-sm text-muted-foreground">{vm.loans.missingText}</p>
        </TabsContent>

        <TabsContent value="activity" className="flex flex-col gap-4">
          <div className="grid gap-3 lg:grid-cols-3">
            <ChartCard label="Per week" title={activity.weeklyTitle} footer={activity.earlierText}>
              <WeeklyBars label="Customer-initiated transactions per week" data={activity.weekly} />
            </ChartCard>
            <ChartCard label="Channel mix" title={activity.channelTitle} emptyText={activity.mixEmptyText}>
              <HorizontalBars
                label="Channel mix"
                format="count"
                data={activity.channelMix.map((e) => ({ label: e.label, value: e.count }))}
              />
            </ChartCard>
            <ChartCard label="Type mix" title={activity.typeTitle} emptyText={activity.mixEmptyText}>
              <HorizontalBars
                label="Type mix"
                format="count"
                data={activity.typeMix.map((e) => ({ label: e.label, value: e.count }))}
              />
            </ChartCard>
          </div>
          <section aria-labelledby="bank-entries" className="flex flex-col gap-2">
            <SectionHeading id="bank-entries">Bank entries</SectionHeading>
            <p className="text-sm">
              <span className="font-medium">{bankEntries.title}.</span>{' '}
              <span className="text-muted-foreground">
                Posted by the bank ({BANK_ENTRY_TYPES.join(', ')}), not by the customer.
              </span>
            </p>
            {bankEntries.rows.length ? (
              <div className="max-w-xl">
                <BankEntriesTable rows={bankEntries.rows} />
              </div>
            ) : null}
          </section>
        </TabsContent>

        <TabsContent value="transactions">
          <TransactionsTable rows={vm.transactions} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
