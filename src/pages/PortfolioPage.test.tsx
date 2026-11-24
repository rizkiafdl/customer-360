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

describe('PortfolioPage', () => {
  it('shows the heading and the header line, with All pressed', () => {
    renderAt('/')
    expect(screen.getByRole('heading', { level: 1, name: 'Portfolio' })).toBeInTheDocument()
    expect(screen.getByText('As of 26 Apr 2024 · 100 customers')).toBeInTheDocument()
    const bands = screen.getByRole('group', { name: 'Income band' })
    expect(within(bands).getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(bands).getAllByRole('button')).toHaveLength(9)
  })

  it('shows the four book tiles; the KYC tile links to the customers with the note', () => {
    renderAt('/')
    const totals = screen.getByRole('region', { name: 'Book totals' })
    expect(within(totals).getByText('84 with AUM · 16 without')).toBeInTheDocument()
    expect(within(totals).getByText('Rp 811.749.876.893')).toBeInTheDocument()
    expect(within(totals).getByText('Rp 1.582.500.470.995')).toBeInTheDocument()
    expect(within(totals).getByText('Not part of AUM.')).toBeInTheDocument()
    expect(within(totals).getByRole('link', { name: /With KYC note/ })).toHaveAttribute('href', '/customers?kyc=yes')
  })

  it('lists the opportunity tiles in rule order, each a link with its rule and amount line', () => {
    renderAt('/')
    expect(screen.getByText('84 customers with at least one opportunity')).toBeInTheDocument()
    const list = screen.getByRole('list', { name: 'Opportunities' })
    const links = within(list).getAllByRole('link')
    expect(links.map((link) => link.getAttribute('aria-label'))).toEqual([
      'Cash-heavy AUM: 12 customers',
      'No REKSA: 29 customers',
      'No ORI: 37 customers',
      'No BANCA: 29 customers',
      'No AUM: 16 customers',
      'High income, no BANCA: 6 customers',
    ])
    expect(links[2]).toHaveAttribute('href', '/customers?rule=investment-gap-ori')
    expect(within(links[2]!).getByText('AUM Rp 366.113.426.621')).toBeInTheDocument()
    expect(within(links[5]!).getByText('3 also in No BANCA')).toBeInTheDocument()
  })

  it('links each AUM product row to the customers without it; LOAN has no link', () => {
    renderAt('/')
    const list = screen.getByRole('list', { name: 'Product penetration' })
    expect(within(list).getByRole('link', { name: 'ORI: 46 held, 54 not held' })).toHaveAttribute(
      'href',
      '/customers?lacks=ORI',
    )
    expect(within(list).getAllByRole('link')).toHaveLength(4)
    expect(within(list).getByText('LOAN')).toBeInTheDocument()
  })

  it('shows the scatter', () => {
    renderAt('/')
    expect(screen.getByRole('img', { name: /^Income band vs AUM: 84 customers with AUM/ })).toBeInTheDocument()
  })

  it('filters every number by an income band, and carries the band in the links', async () => {
    const user = userEvent.setup()
    const router = renderAt('/')
    await user.click(screen.getByRole('button', { name: '>5 Juta - 10 Juta' }))
    expect(router.state.location.search).toBe('?band=4')
    expect(screen.getByText('As of 26 Apr 2024 · 7 of 100 customers, income >5 Juta - 10 Juta')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '>5 Juta - 10 Juta' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('link', { name: /^No ORI: / }).getAttribute('href')).toMatch(/&band=4$/)
    await user.click(screen.getByRole('button', { name: 'All' }))
    expect(router.state.location.search).toBe('')
  })

  it('treats a bad band as All', () => {
    renderAt('/?band=abc')
    expect(screen.getByText('As of 26 Apr 2024 · 100 customers')).toBeInTheDocument()
  })

  it('shows no design placeholder or advice text', () => {
    renderAt('/')
    expect(screen.queryByText(/Check before any offer|Activation list|\[N\]/)).toBeNull()
  })
})
