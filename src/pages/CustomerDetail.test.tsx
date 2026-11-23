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
