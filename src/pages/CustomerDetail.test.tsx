import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { formatIDR, formatIDRShort } from '@/lib/format'
import { buildCustomer360, type Customer360 } from '@/lib/selectors/customer360'
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

function renderDetail(id: number) {
  return render(
    <TooltipProvider>
      <CustomerDetail vm={vmFor(id)} />
    </TooltipProvider>,
  )
}

describe('CustomerDetail: full customer', () => {
  it('shows the profile header and the six sections', () => {
    renderDetail(1)
    expect(screen.getByRole('heading', { level: 1, name: 'Customer 1' })).toBeInTheDocument()
    expect(screen.getByText('>10 Juta - 25 Juta (rank 5 of 8)')).toBeInTheDocument()
    expect(screen.getByText('High income')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Key figures' })).toBeInTheDocument()
    for (const name of ['Holdings', 'Activity', 'Bank entries', 'All transactions']) {
      expect(screen.getByRole('region', { name })).toBeInTheDocument()
    }
  })

  it('shows AUM short with the full value as accessible text, and loan exposure apart', () => {
    renderDetail(1)
    const kpis = screen.getByRole('region', { name: 'Key figures' })
    expect(within(kpis).getByText(idrShort(1_000_000_000))).toHaveAttribute('aria-hidden', 'true')
    expect(within(kpis).getByText(idr(1_000_000_000))).toHaveClass('sr-only')
    expect(within(kpis).getByText(idr(250_000_000))).toBeInTheDocument()
    expect(within(kpis).getByText('4 of 6 rows')).toBeInTheDocument()
    expect(within(kpis).getByText('2 days since last activity')).toBeInTheDocument()
    expect(within(kpis).getByText('60%')).toBeInTheDocument()
  })

  it('shows the AUM title, the product table, and muted rows with no amount', () => {
    renderDetail(1)
    expect(screen.getByText('62% of AUM in FUNDING')).toBeInTheDocument()
    const products = screen.getByRole('table', { name: 'Products' })
    expect(within(products).getAllByRole('row')).toHaveLength(7)
    const unnamed = within(products).getByText('Unnamed product').closest('tr')
    expect(unnamed).toHaveClass('text-muted-foreground')
    expect(within(unnamed!).getByText('—')).toBeInTheDocument()
  })

  it('shows the activity titles and the earlier line', () => {
    renderDetail(1)
    expect(screen.getByText('5 customer-initiated transactions since 1 Mar 2024')).toBeInTheDocument()
    expect(screen.getByText('1 earlier transaction, from 2023-05-02')).toBeInTheDocument()
    expect(screen.getByText('ATM is 17% of 6 customer-initiated transactions')).toBeInTheDocument()
  })

  it('shows the bank entries table with its note', () => {
    renderDetail(1)
    const section = screen.getByRole('region', { name: 'Bank entries' })
    expect(within(section).getByText(/Posted by the bank \(BUNGA, BIAYA, PAJAK, DENDA\), not by the customer\./)).toBeInTheDocument()
    const table = within(section).getByRole('table', { name: 'Bank entries' })
    expect(within(table).getByText('BUNGA')).toBeInTheDocument()
    expect(within(table).queryByText('BIAYA')).not.toBeInTheDocument()
  })

  it('narrows the transaction rows with the filter', async () => {
    const user = userEvent.setup()
    renderDetail(1)
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
    renderDetail(1)
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
    renderDetail(1)
    const entries = vm.activity.channelMix.map((e) => `${e.label} ${e.count}`).join(', ')
    expect(screen.getByRole('img', { name: `Channel mix: ${entries}` })).toBeInTheDocument()
  })

  it('names the type mix chart with each type and its count', () => {
    const vm = vmFor(1)
    renderDetail(1)
    const entries = vm.activity.typeMix.map((e) => `${e.label} ${e.count}`).join(', ')
    expect(screen.getByRole('img', { name: `Type mix: ${entries}` })).toBeInTheDocument()
  })

  it('names the weekly chart with each week and its count', () => {
    const vm = vmFor(1)
    renderDetail(1)
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
    renderDetail(2)
    const holdings = screen.getByRole('region', { name: 'Holdings' })
    expect(within(holdings).getByText('No portfolio rows.')).toBeInTheDocument()
    expect(within(holdings).queryByRole('table')).not.toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Key figures' })).getAllByText(idr(0))).toHaveLength(4) // AUM and loan: short form and full form each
    expect(screen.getByText('Gender not recorded')).toBeInTheDocument()
    expect(screen.queryByText(/earlier transaction/)).not.toBeInTheDocument()
  })

  it('replaces the AUM chart for AUM 0 and keeps the product table', () => {
    renderDetail(3)
    const holdings = screen.getByRole('region', { name: 'Holdings' })
    expect(within(holdings).getByText('No AUM. 1 product row, none held in AUM categories.')).toBeInTheDocument()
    expect(within(holdings).getByRole('table', { name: 'Products' })).toBeInTheDocument()
    expect(screen.getByText('No bank entries.')).toBeInTheDocument()
  })
})

describe('CustomerDetail: What to offer', () => {
  it('places the panel between the key figures and the holdings', () => {
    renderDetail(1)
    const kpis = screen.getByRole('region', { name: 'Key figures' })
    const panel = screen.getByRole('region', { name: 'What to offer' })
    const holdings = screen.getByRole('region', { name: 'Holdings' })
    expect(kpis.compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(panel.compareDocumentPosition(holdings) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('shows one card per fired rule, with the kind as text, the reason, and the rule text', () => {
    renderDetail(1)
    const panel = screen.getByRole('region', { name: 'What to offer' })
    const items = within(within(panel).getByRole('list', { name: 'Offers' })).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(within(items[0]!).getByText('Opportunity')).toBeInTheDocument()
    expect(within(items[0]!).getByText('No BANCA')).toBeInTheDocument()
    expect(within(items[0]!).getByText(`No BANCA. AUM ${idr(1_000_000_000)}.`)).toBeInTheDocument()
    expect(within(items[0]!).getByText(`Holds no BANCA, and AUM is above ${idr(100_000_000)}.`)).toHaveClass(
      'text-muted-foreground',
    )
    expect(within(items[1]!).getByText('High income, no BANCA')).toBeInTheDocument()
    expect(within(items[1]!).getByText('No BANCA. Income band >10 Juta - 25 Juta.')).toBeInTheDocument()
    expect(within(panel).queryByText('No offer rule fired.')).not.toBeInTheDocument()
    expect(within(panel).queryByRole('heading', { name: 'Note' })).not.toBeInTheDocument()
  })

  it('shows the empty line and the KYC note apart from the offers', () => {
    renderDetail(4)
    const panel = screen.getByRole('region', { name: 'What to offer' })
    expect(within(panel).getByText('No offer rule fired.')).toBeInTheDocument()
    expect(within(panel).queryByRole('list', { name: 'Offers' })).not.toBeInTheDocument()
    expect(within(panel).getByRole('heading', { name: 'Note' })).toBeInTheDocument()
    const note = within(panel).getByText('KYC income band').closest('article')
    expect(note).not.toBeNull()
    expect(within(note!).getByText('Warning')).toBeInTheDocument()
    expect(within(note!).getByText(`Income band >1 Juta - 3 Juta. AUM ${idr(1_000_000_000)}.`)).toBeInTheDocument()
    expect(note!.closest('ul')).toBeNull()
  })
})
