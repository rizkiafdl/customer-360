import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { formatIDR, formatIDRShort } from '@/lib/format'
import { buildCustomer360, getCustomer360, type Customer360, type CustomerTab } from '@/lib/selectors/customer360'
import { filterCustomers, getCustomerRows, parseCustomerFilters } from '@/lib/selectors/customers'
import { routes } from '@/routes'
import { fixtureDataset } from '@/test/fixtures'
import { CustomerDetail } from './CustomerDetail'

// Testing Library collapses the no-break spaces of rendered money into plain
// spaces, but not those of a string matcher.
const idr = (amount: number) => formatIDR(amount).replace(/\s+/g, ' ')
const idrShort = (amount: number) => formatIDRShort(amount).replace(/\s+/g, ' ')

function vmFor(id: number): Customer360 {
  const vm = buildCustomer360(fixtureDataset, id)
  if (!vm) throw new Error(`fixture customer ${id} did not build`)
  return vm
}

function renderDetail(id: number, tab: CustomerTab = 'overview') {
  return render(
    <TooltipProvider>
      <CustomerDetail vm={vmFor(id)} tab={tab} onTabChange={() => {}} nav={null} />
    </TooltipProvider>,
  )
}

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
  return router
}

const panel = (name: string) => screen.getByRole('tabpanel', { name })

describe('CustomerDetail: full customer', () => {
  it('shows the profile header, the key figures, and five tabs with Overview selected', () => {
    renderDetail(1)
    expect(screen.getByRole('heading', { level: 1, name: 'Customer 1' })).toBeInTheDocument()
    expect(screen.getByText('>10 Juta - 25 Juta')).toBeInTheDocument()
    expect(screen.getByText('High income')).toBeInTheDocument()
    expect(screen.getByText('First transaction May 2023')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Key figures' })).toBeInTheDocument()
    const tabs = within(screen.getByRole('tablist', { name: 'Customer sections' })).getAllByRole('tab')
    expect(tabs.map((t) => t.textContent)).toEqual(['Overview', 'Holdings', 'Loans', 'Activity', 'Transactions'])
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true')
  })

  it('shows AUM short with the full value as accessible text, and loan exposure apart', () => {
    renderDetail(1)
    const kpis = screen.getByRole('region', { name: 'Key figures' })
    expect(within(kpis).getByText(idrShort(1_000_000_000))).toHaveAttribute('aria-hidden', 'true')
    expect(within(kpis).getByText(idr(1_000_000_000))).toHaveClass('sr-only')
    expect(within(kpis).getByText(idr(250_000_000))).toBeInTheDocument()
    expect(within(kpis).getByText(vmFor(1).kpis.products.label)).toBeInTheDocument()
    expect(within(kpis).getByText('Outside AUM')).toBeInTheDocument()
    expect(within(kpis).getByText('2 days since last activity')).toBeInTheDocument()
    expect(within(kpis).getByText('60%')).toBeInTheDocument()
  })

  it('shows the AUM title, the product table, and muted rows with no amount', () => {
    renderDetail(1, 'holdings')
    expect(screen.getByText('62% of AUM in FUNDING')).toBeInTheDocument()
    const products = screen.getByRole('table', { name: 'Products' })
    expect(within(products).getAllByRole('row')).toHaveLength(7)
    const unnamed = within(products).getByText('Unnamed product').closest('tr')
    expect(unnamed).toHaveClass('text-muted-foreground')
    expect(within(unnamed!).getByText('—')).toBeInTheDocument()
  })

  it('shows the activity titles and the earlier line', () => {
    renderDetail(1, 'activity')
    expect(screen.getByText('5 customer-initiated transactions since 1 Mar 2024')).toBeInTheDocument()
    expect(screen.getByText('1 earlier transaction, from 2023-05-02')).toBeInTheDocument()
    expect(screen.getByText('ATM is 17% of 6 customer-initiated transactions')).toBeInTheDocument()
  })

  it('shows the bank entries table with its note', () => {
    renderDetail(1, 'activity')
    const section = screen.getByRole('region', { name: 'Bank entries' })
    expect(within(section).getByText(/Posted by the bank \(BUNGA, BIAYA, PAJAK, DENDA\), not by the customer\./)).toBeInTheDocument()
    const table = within(section).getByRole('table', { name: 'Bank entries' })
    expect(within(table).getByText('BUNGA')).toBeInTheDocument()
    expect(within(table).queryByText('BIAYA')).not.toBeInTheDocument()
  })

  it('narrows the transaction rows with the filter', async () => {
    const user = userEvent.setup()
    renderDetail(1, 'transactions')
    const table = () => screen.getByRole('table', { name: 'Transactions' })
    expect(within(table()).getAllByRole('row')).toHaveLength(10)
    await user.click(screen.getByRole('radio', { name: 'Bank entries' }))
    expect(within(table()).getAllByRole('row')).toHaveLength(4)
    expect(screen.getByText('3 of 9 rows')).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'Customer-initiated' }))
    expect(within(table()).getAllByRole('row')).toHaveLength(7)
  })

  it('sorts the transactions by amount, largest first, when the header is clicked', async () => {
    const user = userEvent.setup()
    renderDetail(1, 'transactions')
    const table = screen.getByRole('table', { name: 'Transactions' })
    await user.click(within(table).getByRole('button', { name: 'Amount' }))
    const cells = within(table)
      .getAllByRole('row')
      .slice(1)
      .map((row) => within(row).getAllByRole('cell').at(-1)?.textContent?.replace(/\s+/g, ' '))
    expect(cells[0]).toBe(idr(2_000_000))
    expect(within(table).getByRole('columnheader', { name: /Amount/ })).toHaveAttribute('aria-sort', 'descending')
  })
})

describe('CustomerDetail: chart content', () => {
  // Each chart's accessible name lists its data, so these names check what the bars draw.
  it('names the AUM chart with each AUM category and its full amount', () => {
    const vm = vmFor(1)
    renderDetail(1)
    // An accessible name keeps the no-break spaces, so this uses formatIDR as it is.
    const bars = vm.holdings.aumBars.map((bar) => `${bar.category} ${formatIDR(bar.amount)}`).join(', ')
    expect(screen.getByRole('img', { name: `AUM by category: ${bars}` })).toBeInTheDocument()
  })

  it('names the channel mix chart with each channel and its count', () => {
    const vm = vmFor(1)
    renderDetail(1, 'activity')
    const entries = vm.activity.channelMix.map((e) => `${e.label} ${e.count}`).join(', ')
    expect(screen.getByRole('img', { name: `Channel mix: ${entries}` })).toBeInTheDocument()
  })

  it('names the type mix chart with each type and its count', () => {
    const vm = vmFor(1)
    renderDetail(1, 'activity')
    const entries = vm.activity.typeMix.map((e) => `${e.label} ${e.count}`).join(', ')
    expect(screen.getByRole('img', { name: `Type mix: ${entries}` })).toBeInTheDocument()
  })

  it('names the weekly chart with each week and its count', () => {
    const vm = vmFor(1)
    renderDetail(1, 'activity')
    const weeks = vm.activity.weekly.map((w) => `week from ${w.label} ${w.count}`).join(', ')
    expect(screen.getByRole('img', { name: `Customer-initiated transactions per week: ${weeks}` })).toBeInTheDocument()
  })

  it('draws no AUM chart when AUM is 0', () => {
    renderDetail(3)
    expect(screen.queryByRole('img', { name: /^AUM by category/ })).not.toBeInTheDocument()
  })
})

describe('CustomerDetail: empty and odd cases', () => {
  it('replaces the holdings with "No portfolio rows." and shows Rp 0 tiles', () => {
    renderDetail(2, 'holdings')
    const holdings = panel('Holdings')
    expect(within(holdings).getByText('No portfolio rows.')).toBeInTheDocument()
    expect(within(holdings).queryByRole('table')).not.toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Key figures' })).getAllByText(idr(0))).toHaveLength(4) // AUM and loan: short form and full form each
    expect(screen.getByText('Gender not recorded')).toBeInTheDocument()
    expect(screen.queryByText(/earlier transaction/)).not.toBeInTheDocument()
  })

  it('replaces the AUM chart for AUM 0 and keeps the product table', () => {
    renderDetail(3, 'holdings')
    const holdings = panel('Holdings')
    expect(within(holdings).getByText('No AUM. 1 product row, none held in AUM categories.')).toBeInTheDocument()
    expect(within(holdings).getByRole('table', { name: 'Products' })).toBeInTheDocument()
  })

  it('says "No bank entries." on the Activity tab', () => {
    renderDetail(3, 'activity')
    expect(screen.getByText('No bank entries.')).toBeInTheDocument()
  })
})

describe('CustomerDetail: Overview tab', () => {
  it('shows What to offer after the key figures and the tabs', () => {
    renderDetail(1)
    const kpis = screen.getByRole('region', { name: 'Key figures' })
    const offers = screen.getByRole('region', { name: 'What to offer' })
    expect(kpis.compareDocumentPosition(offers) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('shows one card per product: the first with its reasons, basis, and top channel', () => {
    renderDetail(1)
    const offers = screen.getByRole('region', { name: 'What to offer' })
    const items = within(within(offers).getByRole('list', { name: 'Offers' })).getAllByRole('listitem', { name: /rules?$/ })
    expect(items).toHaveLength(1)
    expect(within(items[0]!).getByText('BANCA · 2 rules')).toBeInTheDocument()
    expect(within(items[0]!).getByText(`No BANCA. AUM ${idr(1_000_000_000)}.`)).toBeInTheDocument()
    expect(within(items[0]!).getByText('No BANCA. Income band >10 Juta - 25 Juta.')).toBeInTheDocument()
    expect(within(items[0]!).getByText(`AUM ${idr(1_000_000_000)}`)).toBeInTheDocument()
    expect(
      within(items[0]!).getByText('Top channel: ATM, 1 of 6 customer-initiated transactions (16%)'),
    ).toBeInTheDocument()
    expect(within(offers).queryByText('No offer rule fired.')).not.toBeInTheDocument()
    expect(within(offers).queryByRole('heading', { name: 'Note' })).not.toBeInTheDocument()
  })

  it('shows the empty line and the KYC note apart from the offers', () => {
    renderDetail(4)
    const offers = screen.getByRole('region', { name: 'What to offer' })
    expect(within(offers).getByText('No offer rule fired.')).toBeInTheDocument()
    expect(within(offers).queryByRole('list', { name: 'Offers' })).not.toBeInTheDocument()
    expect(within(offers).getByRole('heading', { name: 'Note' })).toBeInTheDocument()
    const note = within(offers).getByText('KYC income band').closest('article')
    expect(note).not.toBeNull()
    expect(within(note!).getByText(`Income band >1 Juta - 3 Juta. AUM ${idr(1_000_000_000)}.`)).toBeInTheDocument()
    expect(note!.closest('ul')).toBeNull()
  })

  it('shows the AUM chart and the five most recent transactions', () => {
    renderDetail(1)
    expect(screen.getByRole('img', { name: /^AUM by category: / })).toBeInTheDocument()
    const recent = screen.getByRole('list', { name: 'Recent transactions' })
    expect(within(recent).getAllByRole('listitem')).toHaveLength(5)
  })
})

describe('Customer 360 on the real data', () => {
  const oriRows = filterCustomers(getCustomerRows(), parseCustomerFilters(new URLSearchParams('rule=investment-gap-ori')))
  const [firstOri, secondOri] = oriRows.map((row) => row.customerId)

  it('shows the band and the first transaction, and no rank or "Customer since" text', () => {
    renderAt('/customers/8797')
    const vm = getCustomer360(8797)!
    expect(screen.getByText(vm.profile.incomeBand)).toBeInTheDocument()
    expect(screen.getByText(vm.profile.firstTransaction!)).toBeInTheDocument()
    expect(screen.queryByText(/rank \d+ of \d+|#\d+ of \d+|Customer since/)).toBeNull()
  })

  it('puts REKSA first for 8797, with its reasons and the top channel', () => {
    renderAt('/customers/8797')
    const vm = getCustomer360(8797)!
    const items = within(screen.getByRole('list', { name: 'Offers' })).getAllByRole('listitem', { name: /rules?$/ })
    expect(vm.productOffers[0]!.title).toBe('REKSA · 2 rules')
    expect(within(items[0]!).getByText('REKSA · 2 rules')).toBeInTheDocument()
    for (const reason of vm.productOffers[0]!.reasons) {
      expect(within(items[0]!).getByText(reason.replace(/\s+/g, ' '))).toBeInTheDocument()
    }
    expect(within(items[0]!).getByText(vm.channelText!)).toBeInTheDocument()
  })

  it('shows one BANCA card with both BANCA reasons for 6513', () => {
    renderAt('/customers/6513')
    const items = within(screen.getByRole('list', { name: 'Offers' })).getAllByRole('listitem', { name: /rules?$/ })
    const banca = items.filter((item) => within(item).getByRole('heading').textContent?.startsWith('BANCA'))
    expect(banca).toHaveLength(1)
    expect(within(banca[0]!).getByText(/^No BANCA\. AUM /)).toBeInTheDocument()
    expect(within(banca[0]!).getByText('No BANCA. Income band >100 Juta.')).toBeInTheDocument()
  })

  it('shows the empty line and the KYC note for 1047', () => {
    renderAt('/customers/1047')
    expect(screen.getByText('No offer rule fired.')).toBeInTheDocument()
    expect(screen.getByText('KYC income band')).toBeInTheDocument()
  })

  it('opens the Transactions tab with "View all"', async () => {
    const user = userEvent.setup()
    const router = renderAt('/customers/8797')
    await user.click(screen.getByRole('button', { name: 'View all' }))
    expect(router.state.location.search).toBe('?tab=transactions')
    expect(screen.getByRole('table', { name: 'Transactions' })).toBeInTheDocument()
  })

  it('selects Overview for an unknown tab', () => {
    renderAt('/customers/8797?tab=bogus')
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true')
  })

  it('steps through the filtered list and keeps the filters', () => {
    renderAt(`/customers/${secondOri}?rule=investment-gap-ori`)
    expect(screen.getByText('2 of 37 in your filtered list')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Previous customer' })).toHaveAttribute(
      'href',
      `/customers/${firstOri}?rule=investment-gap-ori`,
    )
    const crumbs = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(within(crumbs).getByRole('link', { name: 'Customers' })).toHaveAttribute('href', '/customers?rule=investment-gap-ori')
  })

  it('has no Previous customer link at the start of the list', () => {
    renderAt(`/customers/${firstOri}?rule=investment-gap-ori`)
    expect(screen.queryByRole('link', { name: 'Previous customer' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Next customer' })).toHaveAttribute(
      'href',
      `/customers/${secondOri}?rule=investment-gap-ori`,
    )
  })

  it('shows no position and no prev/next for an ID outside the filtered list, and keeps the params', () => {
    const outside = getCustomerRows().find((row) => !row.ruleIds.includes('investment-gap-ori'))!.customerId
    renderAt(`/customers/${outside}?rule=investment-gap-ori`)
    expect(screen.queryByText(/in your filtered list/)).toBeNull()
    expect(screen.queryByRole('link', { name: 'Previous customer' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Next customer' })).toBeNull()
    const crumbs = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(within(crumbs).getByRole('link', { name: 'Customers' })).toHaveAttribute('href', '/customers?rule=investment-gap-ori')
  })

  it('keeps the filters when switching tabs', async () => {
    const user = userEvent.setup()
    const router = renderAt('/customers/8797?rule=investment-gap-ori')
    await user.click(screen.getByRole('tab', { name: 'Loans' }))
    expect(router.state.location.search).toBe('?rule=investment-gap-ori&tab=loans')
    await user.click(screen.getByRole('tab', { name: 'Overview' }))
    expect(router.state.location.search).toBe('?rule=investment-gap-ori')
  })
})
