import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { routes } from './routes'

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
  return router
}

describe('routes', () => {
  it('shows the worklist at /', () => {
    renderAt('/')
    expect(screen.getByRole('heading', { level: 1, name: 'Customers' })).toBeInTheDocument()
    const table = screen.getByRole('table', { name: 'Worklist' })
    expect(within(table).getByRole('link', { name: 'Customer 4426' })).toHaveAttribute('href', '/customers/4426')
  })

  it('shows the app shell with the as-of date', () => {
    renderAt('/')
    expect(screen.getByText('As of 26 Apr 2024')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument()
  })

  it('opens a customer at /customers/:id', () => {
    renderAt('/customers/4426')
    expect(screen.getByRole('heading', { level: 1, name: 'Customer 4426' })).toBeInTheDocument()
  })

  it.each(['/customers/abc', '/customers/1'])('shows "Customer not found" for %s', (path) => {
    renderAt(path)
    expect(screen.getByRole('heading', { level: 1, name: 'Customer not found' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to customers' })).toHaveAttribute('href', '/')
  })

  it('shows "Page not found" for an unknown path', () => {
    renderAt('/nope')
    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument()
  })

  it('keeps the "Back to customers" link out of brand red, also on hover', () => {
    renderAt('/nope')
    // Spec 4.6: red is for primary buttons, active nav, and the focus ring only.
    const link = screen.getByRole('link', { name: 'Back to customers' })
    expect(link).toHaveClass('text-foreground', 'underline', 'hover:text-foreground')
    expect(link.className).not.toMatch(/brand/)
  })

  it('gives the search input its own accessible name', async () => {
    const user = userEvent.setup()
    renderAt('/')
    await user.click(screen.getByRole('combobox', { name: 'Search customer' }))
    expect(screen.getByRole('combobox', { name: 'Search customers' })).toHaveAttribute('placeholder', 'Customer ID')
  })

  it('opens a customer from the search', async () => {
    const user = userEvent.setup()
    const router = renderAt('/')
    await user.click(screen.getByRole('combobox', { name: 'Search customer' }))
    await user.type(screen.getByPlaceholderText('Customer ID'), '4857')
    await user.click(screen.getByRole('option', { name: /Customer 4857/ }))
    expect(router.state.location.pathname).toBe('/customers/4857')
    expect(screen.getByRole('heading', { level: 1, name: 'Customer 4857' })).toBeInTheDocument()
  })
})
