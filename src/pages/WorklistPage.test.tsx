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
  const table = screen.getByRole('table', { name: 'Worklist' })
  return within(table).getAllByRole('row').slice(1)
}

/** The text of one column for every body row. */
function column(index: number) {
  return bodyRows().map((row) => within(row).getAllByRole('cell')[index]?.textContent ?? '')
}

const TOP_REASON = 5

describe('WorklistPage', () => {
  it('lists all 100 customers in the default order', () => {
    renderAt('/')
    expect(screen.getByRole('heading', { level: 1, name: 'Customers' })).toBeInTheDocument()
    expect(screen.getByText('100 customers.')).toBeInTheDocument()
    const rows = bodyRows()
    expect(rows).toHaveLength(100)
    expect(column(0).slice(0, 3)).toEqual(['1', '2', '3'])
    const first = within(rows[0]!).getByRole('link', { name: 'Customer 8797' })
    expect(first).toHaveAttribute('href', '/customers/8797')
  })

  it('makes only the customer cell a link', () => {
    renderAt('/')
    expect(within(bodyRows()[0]!).getAllByRole('link')).toHaveLength(1)
  })

  it('shows "No rule fired" and the KYC marker for a customer with only the KYC note', () => {
    renderAt('/?q=3569')
    const [row] = bodyRows()
    expect(within(row!).getByText('No rule fired')).toBeInTheDocument()
    expect(within(row!).getByText('KYC note')).toBeInTheDocument()
  })

  it('filters by opportunity type from the URL', () => {
    renderAt('/?rule=investment-gap-ori')
    expect(bodyRows()).toHaveLength(37)
    expect(screen.getByText('37 of 100 customers. Opportunity: No ORI.')).toBeInTheDocument()
  })

  it('ignores an unknown rule in the URL', () => {
    renderAt('/?rule=nope')
    expect(bodyRows()).toHaveLength(100)
  })

  it('writes the ID filter to the URL', async () => {
    const user = userEvent.setup()
    const router = renderAt('/')
    await user.type(screen.getByRole('textbox', { name: 'Filter by customer ID' }), '8797')
    expect(router.state.location.search).toBe('?q=8797')
    expect(bodyRows()).toHaveLength(1)
  })

  it('keeps the caret in place when editing the middle of the ID', async () => {
    const user = userEvent.setup()
    const router = renderAt('/?q=8797')
    const input = screen.getByRole<HTMLInputElement>('textbox', { name: 'Filter by customer ID' })
    input.focus()
    input.setSelectionRange(1, 1)
    await user.keyboard('55')
    expect(input).toHaveValue('855797')
    expect(router.state.location.search).toBe('?q=855797')
  })

  it('empties the ID box with "Clear filters"', async () => {
    const user = userEvent.setup()
    renderAt('/?q=44')
    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(screen.getByRole('textbox', { name: 'Filter by customer ID' })).toHaveValue('')
  })

  it('keeps only digits in the ID box', async () => {
    const user = userEvent.setup()
    const router = renderAt('/')
    const input = screen.getByRole('textbox', { name: 'Filter by customer ID' })
    await user.type(input, '4a4 ')
    expect(input).toHaveValue('44')
    expect(router.state.location.search).toBe('?q=44')
  })

  it('sorts the Customer column in ascending order on the first click', async () => {
    const user = userEvent.setup()
    renderAt('/')
    await user.click(screen.getByRole('button', { name: 'Customer' }))
    const ids = column(1).map((text) => Number(text.replace('Customer ', '')))
    expect(ids).toEqual([...ids].sort((a, b) => a - b))
  })

  it('shows the new ID when a link changes the URL', async () => {
    const router = renderAt('/?q=44')
    await act(() => router.navigate('/?q=12'))
    expect(screen.getByRole('textbox', { name: 'Filter by customer ID' })).toHaveValue('12')
  })

  it('writes the opportunity type to the URL', async () => {
    const user = userEvent.setup()
    const router = renderAt('/')
    await user.click(screen.getByRole('combobox', { name: 'Opportunity type' }))
    await user.click(screen.getByRole('option', { name: 'No ORI' }))
    expect(router.state.location.search).toBe('?rule=investment-gap-ori')
    expect(bodyRows()).toHaveLength(37)
  })

  it('restores all rows with "Clear filters"', async () => {
    const user = userEvent.setup()
    const router = renderAt('/?rule=investment-gap-ori&q=4')
    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(router.state.location.search).toBe('')
    expect(bodyRows()).toHaveLength(100)
  })

  it('says so when no customer matches', () => {
    renderAt('/?q=999999')
    expect(screen.getByText('No customers match these filters.')).toBeInTheDocument()
  })

  it('keeps "No rule fired" rows last when sorting by top reason, both directions', async () => {
    const user = userEvent.setup()
    renderAt('/')
    const header = screen.getByRole('button', { name: 'Top reason' })
    await user.click(header)
    let reasons = column(TOP_REASON)
    expect(reasons[0]).toMatch(/of AUM in cash/)
    expect(reasons.slice(-16).every((r) => r === 'No rule fired')).toBe(true)
    await user.click(header)
    reasons = column(TOP_REASON)
    expect(reasons[0]).toMatch(/^AUM /)
    expect(reasons.slice(-16).every((r) => r === 'No rule fired')).toBe(true)
  })

  it('restores the default order when sorting by rank', async () => {
    const user = userEvent.setup()
    renderAt('/')
    await user.click(screen.getByRole('button', { name: 'AUM' }))
    await user.click(screen.getByRole('button', { name: 'Rank' }))
    expect(column(0).slice(0, 3)).toEqual(['1', '2', '3'])
  })
})
