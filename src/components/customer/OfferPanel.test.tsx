import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { getCustomer360 } from '@/lib/selectors/customer360'
import { OfferPanel } from './OfferPanel'

describe('OfferPanel', () => {
  // Customer 1041 has offer cards and the KYC note. The page test covers the note without cards.
  it('puts the KYC note after the offers list and outside it', () => {
    const panel = getCustomer360(1041)?.offers
    if (!panel?.note || panel.cards.length === 0) throw new Error('customer 1041 no longer has cards and a note')
    const { container } = render(<OfferPanel panel={panel} />)

    const list = screen.getByRole('list', { name: 'Offers' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(panel.cards.length)
    expect(within(list).queryByText(panel.note.label)).toBeNull()

    const note = screen.getByText(panel.note.label).closest('article')
    expect(note).not.toBeNull()
    expect(list.compareDocumentPosition(note!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(container.querySelectorAll('article')).toHaveLength(panel.cards.length + 1)
  })
})
