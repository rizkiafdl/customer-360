import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Dialog } from 'radix-ui'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { RECENT_CUSTOMERS_KEY } from '@/lib/recent-customers'
import { Spotlight } from './Spotlight'

// formatIDR output has a no-break space (U+00A0) around the number; the
// `title` attribute is compared byte for byte (unlike rendered text, which
// Testing Library normalizes), so this converts just the "Rp …" token.
const nb = (rpToken: string) => rpToken.replaceAll(' ', ' ')

const options = () => screen.queryAllByRole('option')

function renderSpotlight() {
  const onClose = vi.fn()
  const router = createMemoryRouter(
    [
      {
        path: '*',
        element: (
          <Dialog.Root open>
            <Spotlight onClose={onClose} />
          </Dialog.Root>
        ),
      },
    ],
    { initialEntries: ['/'] },
  )
  render(<RouterProvider router={router} />)
  return { router, onClose }
}

describe('Spotlight', () => {
  it('names the dialog and wires the combobox to the listbox', () => {
    renderSpotlight()
    const dialog = screen.getByRole('dialog', { name: 'Search' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')

    const combobox = screen.getByRole('combobox', { name: 'Search customers, filters and pages' })
    expect(combobox).toHaveAttribute('placeholder', 'Customer ID, opportunity or page')
    expect(combobox).toHaveAttribute('aria-expanded', 'true')
    expect(combobox).toHaveAttribute('aria-autocomplete', 'list')

    const listbox = screen.getByRole('listbox', { name: 'Results' })
    expect(combobox).toHaveAttribute('aria-controls', listbox.id)

    const opts = options()
    expect(combobox).toHaveAttribute('aria-activedescendant', opts[0]!.id)
    expect(opts[0]).toHaveAttribute('aria-selected', 'true')
    expect(opts[1]).toHaveAttribute('aria-selected', 'false')
    expect(combobox).toHaveFocus()
  })

  it('lists Recently active, Quick filters, and Go to for an empty query', () => {
    renderSpotlight()
    expect(screen.getByText('Recently active')).toBeInTheDocument()
    expect(screen.getByText('Quick filters')).toBeInTheDocument()
    expect(screen.getByText('Go to')).toBeInTheDocument()
    expect(screen.getByText('Try typing 87')).toBeInTheDocument()
    expect(screen.queryByText('Recently viewed')).not.toBeInTheDocument()
    expect(options()).toHaveLength(10)
    expect(options()[0]).toHaveAccessibleName(/^Customer 2759/)
  })

  it('puts stored recent customers first', () => {
    localStorage.setItem(RECENT_CUSTOMERS_KEY, '[2759,99999]')
    renderSpotlight()
    expect(screen.getByText('Recently viewed')).toBeInTheDocument()
    expect(options()[0]).toHaveAccessibleName(/^Customer 2759/)
    expect(options()[1]).toHaveAccessibleName(/^Customer 7550/)
  })

  it('shows the full AUM as the subtitle title', async () => {
    const user = userEvent.setup()
    renderSpotlight()
    await user.type(screen.getByRole('combobox'), '87')
    expect(options()).toHaveLength(2)
    expect(screen.getByText('AUM Rp 1,3 M · Cash-heavy 84%')).toHaveAttribute('title', `AUM ${nb('Rp 1.262.383.866')}`)
  })

  it('shows the no-match line for zzz', async () => {
    const user = userEvent.setup()
    renderSpotlight()
    await user.type(screen.getByRole('combobox'), 'zzz')
    expect(within(screen.getByRole('listbox')).getByText('No customer, filter or page matches “zzz”.')).toBeInTheDocument()
    expect(options()).toHaveLength(0)
    expect(screen.getByRole('combobox')).not.toHaveAttribute('aria-activedescendant')
  })

  it('announces the no-match line', async () => {
    const user = userEvent.setup()
    renderSpotlight()
    const combobox = screen.getByRole('combobox')
    await user.type(combobox, 'zzz')
    expect(screen.getByRole('status')).toHaveTextContent('No customer, filter or page matches “zzz”.')
    await user.clear(combobox)
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('wraps the active row with the arrow keys', async () => {
    const user = userEvent.setup()
    renderSpotlight()
    const combobox = screen.getByRole('combobox')
    await user.keyboard('{ArrowUp}')
    expect(options()[9]).toHaveAttribute('aria-selected', 'true')
    expect(combobox).toHaveAttribute('aria-activedescendant', options()[9]!.id)
    await user.keyboard('{ArrowDown}')
    expect(options()[0]).toHaveAttribute('aria-selected', 'true')
  })

  it('resets the active row when the query changes', async () => {
    const user = userEvent.setup()
    renderSpotlight()
    await user.keyboard('{ArrowDown}{ArrowDown}')
    await user.type(screen.getByRole('combobox'), 'n')
    expect(options()[0]).toHaveAttribute('aria-selected', 'true')
  })

  it('makes the row under a moving mouse active', () => {
    renderSpotlight()
    fireEvent.mouseMove(options()[3]!)
    expect(options()[3]).toHaveAttribute('aria-selected', 'true')
  })

  it('shows ↵ Open and hides the count on the active row only', async () => {
    const user = userEvent.setup()
    renderSpotlight()
    await user.type(screen.getByRole('combobox'), 'no')
    expect(within(options()[0]!).getByText('↵ Open')).toBeInTheDocument()
    expect(within(options()[0]!).getByText('29')).toHaveClass('sr-only')
    expect(within(options()[1]!).getByText('37')).not.toHaveClass('sr-only')
    expect(within(options()[1]!).queryByText('↵ Open')).not.toBeInTheDocument()
  })

  it('keeps the count in the active filter option name', async () => {
    const user = userEvent.setup()
    renderSpotlight()
    await user.type(screen.getByRole('combobox'), 'no')
    expect(options()[0]).toHaveAccessibleName(/29$/)
  })

  it('opens the customer on Enter', async () => {
    const user = userEvent.setup()
    const { router, onClose } = renderSpotlight()
    await user.type(screen.getByRole('combobox'), '4857{Enter}')
    expect(router.state.location.pathname).toBe('/customers/4857')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('opens a filter on click', async () => {
    const user = userEvent.setup()
    const { router } = renderSpotlight()
    await user.type(screen.getByRole('combobox'), 'kyc')
    await user.click(screen.getByRole('option', { name: /^With KYC note/ }))
    expect(router.state.location.pathname).toBe('/customers')
    expect(router.state.location.search).toBe('?kyc=yes')
  })

  it('does nothing on Enter with no rows', async () => {
    const user = userEvent.setup()
    const { router, onClose } = renderSpotlight()
    await user.type(screen.getByRole('combobox'), 'zzz{Enter}')
    expect(router.state.location.pathname).toBe('/')
    expect(onClose).not.toHaveBeenCalled()
  })

  it('does not open a row on Enter during composition', async () => {
    const user = userEvent.setup()
    const { router } = renderSpotlight()
    const combobox = screen.getByRole('combobox')
    await user.type(combobox, '87')
    fireEvent.keyDown(combobox, { key: 'Enter', isComposing: true })
    expect(router.state.location.pathname).toBe('/')
    expect(screen.getByRole('dialog', { name: 'Search' })).toBeInTheDocument()
  })

  it('keeps focus in the input on mousedown in the list', () => {
    renderSpotlight()
    expect(fireEvent.mouseDown(options()[0]!)).toBe(false)
  })

  it('has the esc button', () => {
    renderSpotlight()
    const button = screen.getByRole('button', { name: 'Close search (esc)' })
    expect(button).toHaveTextContent('esc')
  })
})
