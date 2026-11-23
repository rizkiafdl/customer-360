import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { routes } from '@/routes'

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
  return router
}

describe('OverviewPage', () => {
  it('shows the header line', () => {
    renderAt('/overview')
    expect(screen.getByRole('heading', { level: 1, name: 'Overview' })).toBeInTheDocument()
    expect(screen.getByText('As of 26 Apr 2024 · 100 customers')).toBeInTheDocument()
  })

  it('shows total AUM and total loan exposure as two tiles', () => {
    renderAt('/overview')
    const totals = screen.getByRole('region', { name: 'Book totals' })
    expect(within(totals).getByText('Total AUM')).toBeInTheDocument()
    expect(within(totals).getByText('Rp 811.749.876.893')).toBeInTheDocument()
    expect(within(totals).getByText('Total loan exposure')).toBeInTheDocument()
    expect(within(totals).getByText('Rp 1.582.500.470.995')).toBeInTheDocument()
    expect(within(totals).getByText('Not part of AUM.')).toBeInTheDocument()
  })

  it('lists the customers per opportunity type in rule order, each a link', () => {
    renderAt('/overview')
    const list = screen.getByRole('list', { name: 'Customers per opportunity type' })
    const links = within(list).getAllByRole('link')
    expect(links.map((link) => link.getAttribute('aria-label'))).toEqual([
      'Cash-heavy AUM: 12 customers',
      'No REKSA: 29 customers',
      'No ORI: 37 customers',
      'No BANCA: 29 customers',
      'No AUM: 16 customers',
      'High income, no BANCA: 6 customers',
    ])
    expect(screen.getAllByRole('list', { name: 'Customers per opportunity type' })).toHaveLength(1)
    expect(screen.queryByRole('region', { name: 'Customers per opportunity type' })).toBeNull()
    expect(links[2]).toHaveAttribute('href', '/?rule=investment-gap-ori')
  })

  it('shows the two chart titles and the scatter footer', () => {
    renderAt('/overview')
    expect(screen.getByText('ORI held by 46 of 100 customers')).toBeInTheDocument()
    expect(screen.getByText('84 customers with AUM, 43 with the KYC note')).toBeInTheDocument()
    expect(screen.getByText('16 customers with no AUM are not plotted.')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /^Product penetration: FUNDING 84, ORI 46/ })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /^Income band vs AUM: 84 customers with AUM/ })).toBeInTheDocument()
  })

  it('shows the scatter legend: KYC note and no KYC note', () => {
    renderAt('/overview')
    const legend = screen.getByRole('list', { name: 'Legend' })
    expect(within(legend).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'KYC note',
      'No KYC note',
    ])
  })

  it('opens the filtered worklist from an opportunity count', async () => {
    const user = userEvent.setup()
    const router = renderAt('/overview')
    await user.click(screen.getByRole('link', { name: 'No ORI: 37 customers' }))
    expect(router.state.location.pathname).toBe('/')
    expect(router.state.location.search).toBe('?rule=investment-gap-ori')
    const table = screen.getByRole('table', { name: 'Worklist' })
    expect(within(table).getAllByRole('row').slice(1)).toHaveLength(37)
  })
})

describe('sidebar', () => {
  it('marks Overview as the current page on /overview only', () => {
    renderAt('/overview')
    const nav = screen.getByRole('navigation', { name: 'Main' })
    expect(within(nav).getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page')
    expect(within(nav).getByRole('link', { name: 'Customers' })).not.toHaveAttribute('aria-current')
  })

  it.each(['/', '/customers/4426'])('marks Customers as the current page on %s', (path) => {
    renderAt(path)
    const nav = screen.getByRole('navigation', { name: 'Main' })
    expect(within(nav).getByRole('link', { name: 'Customers' })).toHaveAttribute('aria-current', 'page')
    expect(within(nav).getByRole('link', { name: 'Overview' })).not.toHaveAttribute('aria-current')
  })
})
