import { render, screen, within } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { routes } from '@/routes'

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
  return router
}

describe('top bar', () => {
  it('marks Portfolio as the current page on /', () => {
    renderAt('/')
    const nav = screen.getByRole('navigation', { name: 'Main' })
    expect(within(nav).getByRole('link', { name: 'Portfolio' })).toHaveAttribute('aria-current', 'page')
    expect(within(nav).getByRole('link', { name: 'Customers' })).not.toHaveAttribute('aria-current')
  })

  it.each(['/customers', '/customers/4426'])('marks Customers as the current page on %s', (path) => {
    renderAt(path)
    const nav = screen.getByRole('navigation', { name: 'Main' })
    expect(within(nav).getByRole('link', { name: 'Customers' })).toHaveAttribute('aria-current', 'page')
    expect(within(nav).getByRole('link', { name: 'Portfolio' })).not.toHaveAttribute('aria-current')
  })

  it('shows the product name, the snapshot date, the search, and the theme switch, and no sidebar', () => {
    renderAt('/')
    const header = screen.getByRole('banner')
    expect(within(header).getByText('Customer 360')).toBeInTheDocument()
    expect(within(header).getByText('Snapshot as of 26 Apr 2024')).toBeInTheDocument()
    expect(within(header).getByRole('button', { name: 'Switch to dark theme' })).toBeInTheDocument()
    expect(document.querySelector('[data-slot="sidebar"]')).toBeNull()
  })

  it('sends /overview to the Portfolio page at /', () => {
    const router = renderAt('/overview')
    expect(router.state.location.pathname).toBe('/')
    expect(screen.getByRole('heading', { level: 1, name: 'Portfolio' })).toBeInTheDocument()
  })
})
