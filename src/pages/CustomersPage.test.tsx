import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { routes } from '@/routes'

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
  return router
}

function bodyRows() {
  const table = screen.getByRole('table', { name: 'Customers' })
  return within(table).getAllByRole('row').slice(1)
}

function column(index: number) {
  return bodyRows().map((row) => within(row).getAllByRole('cell')[index]?.textContent ?? '')
}

const preview = () => screen.getByRole('region', { name: 'Preview' })
const idBox = () => screen.getByRole<HTMLInputElement>('textbox', { name: 'Filter by customer ID' })

describe('CustomersPage', () => {
  it('shows the first page of 25 in the default order', () => {
    renderAt('/customers')
    expect(screen.getByRole('heading', { level: 1, name: 'Customers' })).toBeInTheDocument()
    expect(screen.getByText('100 customers.')).toBeInTheDocument()
    expect(bodyRows()).toHaveLength(25)
    expect(column(0).slice(0, 3)).toEqual(['1', '2', '3'])
    expect(screen.getByText('Showing 1–25 of 100')).toBeInTheDocument()
  })

  it('shows the six columns: chip with more count, last active, and the KYC icon', () => {
    renderAt('/customers')
    const headers = within(screen.getByRole('table', { name: 'Customers' })).getAllByRole('columnheader')
    expect(headers.map((h) => h.textContent)).toEqual(['Rank', 'Customer', 'AUM', 'Opportunities', 'Last active', 'KYC'])
    const first = bodyRows()[0]!
    expect(within(first).getByText('Cash-heavy 84%')).toBeInTheDocument()
    expect(within(first).getByText('+3')).toBeInTheDocument()
    expect(within(first).getByText('2 days ago')).toBeInTheDocument()
    expect(within(first).getByRole('link', { name: 'Open customer 8797' })).toHaveAttribute('href', '/customers/8797')
  })

  it('marks the KYC note with an icon that has a name', () => {
    renderAt('/customers?q=3569')
    expect(within(bodyRows()[0]!).getByRole('img', { name: 'KYC note' })).toBeInTheDocument()
  })

  it('pages with Next page and shows that page', async () => {
    const user = userEvent.setup()
    const router = renderAt('/customers')
    await user.click(screen.getByRole('button', { name: 'Next page' }))
    expect(router.state.location.search).toBe('?page=2')
    expect(screen.getByText('Showing 26–50 of 100')).toBeInTheDocument()
    expect(within(preview()).getByRole('heading', { name: 'Customer 6513' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeEnabled()
  })

  it('writes the opportunity filter to the URL and drops the page', async () => {
    const user = userEvent.setup()
    const router = renderAt('/customers?page=2')
    await user.click(screen.getByRole('combobox', { name: 'Opportunity' }))
    await user.click(screen.getByRole('option', { name: 'No ORI' }))
    expect(router.state.location.search).toBe('?rule=investment-gap-ori')
    expect(screen.getByText('Showing 1–25 of 37')).toBeInTheDocument()
    expect(screen.getByText('37 of 100 customers. Opportunity: No ORI.')).toBeInTheDocument()
  })

  it('shows page 1 for a page out of range', () => {
    renderAt('/customers?rule=investment-gap-ori&page=4')
    expect(screen.getByText('Showing 1–25 of 37')).toBeInTheDocument()
    expect(bodyRows()).toHaveLength(25)
  })

  it('filters by a product not held', () => {
    renderAt('/customers?lacks=ORI')
    expect(screen.getByText('Showing 1–25 of 54')).toBeInTheDocument()
  })

  it('says so when no customer matches, with no table rows', () => {
    renderAt('/customers?band=4&kyc=yes')
    expect(screen.getByText('No customers match these filters.')).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: 'Customers' })).toBeNull()
    expect(screen.queryByRole('region', { name: 'Preview' })).toBeNull()
  })

  it('writes the ID filter to the URL and keeps the typed text', async () => {
    const user = userEvent.setup()
    const router = renderAt('/customers?page=2')
    await user.type(idBox(), '44')
    expect(router.state.location.search).toBe('?q=44')
    expect(idBox()).toHaveValue('44')
  })

  it('keeps the caret in place when editing the middle of the ID', async () => {
    const user = userEvent.setup()
    const router = renderAt('/customers?q=8797')
    const input = idBox()
    input.focus()
    input.setSelectionRange(1, 1)
    await user.keyboard('55')
    expect(input).toHaveValue('855797')
    expect(router.state.location.search).toBe('?q=855797')
  })

  it('keeps only digits in the ID box', async () => {
    const user = userEvent.setup()
    const router = renderAt('/customers')
    await user.type(idBox(), '4a4 ')
    expect(idBox()).toHaveValue('44')
    expect(router.state.location.search).toBe('?q=44')
  })

  it('shows the new ID when a link changes the URL', async () => {
    const router = renderAt('/customers?q=44')
    await act(() => router.navigate('/customers?q=12'))
    expect(idBox()).toHaveValue('12')
  })

  it('clears every filter and the ID box with "Clear filters"', async () => {
    const user = userEvent.setup()
    const router = renderAt('/customers?rule=investment-gap-ori&q=4&page=2')
    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(router.state.location.search).toBe('')
    expect(idBox()).toHaveValue('')
    expect(screen.getByText('Showing 1–25 of 100')).toBeInTheDocument()
  })

  it('previews the first row of the page by default', () => {
    renderAt('/customers')
    const panel = preview()
    expect(within(panel).getByRole('heading', { name: 'Customer 8797' })).toBeInTheDocument()
    expect(within(panel).getByText('1 of 25')).toBeInTheDocument()
    expect(within(panel).getByText('Male · >10 Juta - 25 Juta')).toBeInTheDocument()
    expect(within(panel).getByText('High income')).toBeInTheDocument()
    expect(within(panel).getByText('First transaction Jul 2014')).toBeInTheDocument()
    expect(within(panel).getByText('REKSA · 2 rules')).toBeInTheDocument()
    expect(within(panel).getByText('Cash Rp 1.061.852.300')).toBeInTheDocument()
    expect(within(panel).getByText('BANCA · 2 rules')).toBeInTheDocument()
    expect(
      within(panel).getByText('Top channel: MOBILE BANKING, 11 of 29 customer-initiated transactions (37%)'),
    ).toBeInTheDocument()
    expect(within(panel).getByText('Last active 2 days ago, 24 Apr 2024')).toBeInTheDocument()
  })

  it('moves the preview to a row chosen with Enter, and marks that row', async () => {
    const user = userEvent.setup()
    renderAt('/customers')
    const button = within(bodyRows()[1]!).getByRole('button', { name: 'Customer 2759' })
    button.focus()
    await user.keyboard('{Enter}')
    expect(within(preview()).getByRole('heading', { name: 'Customer 2759' })).toBeInTheDocument()
    expect(button).toHaveAttribute('aria-pressed', 'true')
    expect(within(bodyRows()[0]!).getByRole('button', { name: 'Customer 8797' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('steps through the page with the preview buttons, with no wrap at the start', async () => {
    const user = userEvent.setup()
    renderAt('/customers')
    expect(within(preview()).getByRole('button', { name: 'Previous customer' })).toBeDisabled()
    await user.click(within(preview()).getByRole('button', { name: 'Next customer' }))
    expect(within(preview()).getByRole('heading', { name: 'Customer 2759' })).toBeInTheDocument()
    expect(within(preview()).getByText('2 of 25')).toBeInTheDocument()
  })

  it('opens the full 360 with the filters', () => {
    renderAt('/customers?rule=investment-gap-ori&page=1')
    expect(within(preview()).getByRole('link', { name: 'Open full 360' })).toHaveAttribute(
      'href',
      '/customers/2759?rule=investment-gap-ori',
    )
    expect(within(bodyRows()[0]!).getByRole('link', { name: 'Open customer 2759' })).toHaveAttribute(
      'href',
      '/customers/2759?rule=investment-gap-ori',
    )
  })

  it('has no AUM range or last-active filter', () => {
    renderAt('/customers')
    expect(within(screen.getByRole('main')).getAllByRole('combobox').map((c) => c.getAttribute('aria-label'))).toEqual([
      'Opportunity',
      'Income band',
      'KYC note',
      'Product not held',
    ])
    expect(screen.queryByText(/AUM range|Last active within/i)).toBeNull()
  })
})
