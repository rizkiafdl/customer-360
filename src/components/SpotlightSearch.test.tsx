import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Outlet, RouterProvider, createMemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { SpotlightSearch } from './SpotlightSearch'

const options = () => screen.queryAllByRole('option')

function renderSearch() {
  const router = createMemoryRouter(
    [
      {
        path: '*',
        element: (
          <>
            <input aria-label="Other field" />
            <SpotlightSearch />
            <Outlet />
          </>
        ),
        children: [{ path: '*', element: null }],
      },
    ],
    { initialEntries: ['/'] },
  )
  render(<RouterProvider router={router} />)
  return router
}

describe('SpotlightSearch', () => {
  it('shows the trigger name, popup, shortcuts, and the Ctrl K label', () => {
    renderSearch()
    const button = screen.getByRole('button', { name: 'Search customer, filter or page' })
    expect(button).toHaveAttribute('aria-haspopup', 'dialog')
    expect(button).toHaveAttribute('aria-keyshortcuts', 'Meta+K Control+K')
    expect(screen.getByText('Ctrl K')).toHaveAttribute('aria-hidden', 'true')
  })

  it('opens on click with the input focused', async () => {
    const user = userEvent.setup()
    renderSearch()
    await user.click(screen.getByRole('button', { name: 'Search customer, filter or page' }))
    expect(screen.getByRole('dialog', { name: 'Search' })).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toHaveFocus()
  })

  it('closes on Escape and returns focus to the trigger', async () => {
    const user = userEvent.setup()
    renderSearch()
    const trigger = screen.getByRole('button', { name: 'Search customer, filter or page' })
    await user.click(trigger)
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('toggles with Control+K, also from another input', async () => {
    const user = userEvent.setup()
    renderSearch()
    await user.click(screen.getByRole('textbox', { name: 'Other field' }))
    await user.keyboard('{Control>}k{/Control}')
    expect(screen.getByRole('dialog', { name: 'Search' })).toBeInTheDocument()
    await user.keyboard('{Control>}k{/Control}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens with Meta+K', async () => {
    const user = userEvent.setup()
    renderSearch()
    await user.keyboard('{Meta>}k{/Meta}')
    expect(screen.getByRole('dialog', { name: 'Search' })).toBeInTheDocument()
  })

  it('closes from the esc button', async () => {
    const user = userEvent.setup()
    renderSearch()
    await user.click(screen.getByRole('button', { name: 'Search customer, filter or page' }))
    await user.click(screen.getByRole('button', { name: 'Close search (esc)' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('starts empty each time it opens', async () => {
    const user = userEvent.setup()
    renderSearch()
    const trigger = screen.getByRole('button', { name: 'Search customer, filter or page' })
    await user.click(trigger)
    await user.type(screen.getByRole('combobox'), '87')
    await user.keyboard('{Escape}')
    await user.click(trigger)
    expect(screen.getByRole('combobox')).toHaveValue('')
    expect(options()[0]).toHaveAttribute('aria-selected', 'true')
  })

  it('closes and navigates when a row is chosen', async () => {
    const user = userEvent.setup()
    const router = renderSearch()
    await user.click(screen.getByRole('button', { name: 'Search customer, filter or page' }))
    await user.type(screen.getByRole('combobox'), '4857{Enter}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/customers/4857')
  })
})
