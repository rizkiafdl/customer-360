import { render, screen } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { routes } from './routes'

describe('routes', () => {
  it('renders the home page at /', () => {
    render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: ['/'] })} />)
    expect(screen.getByRole('heading', { name: 'Customer 360' })).toBeInTheDocument()
    expect(screen.getByText('100 customers loaded.')).toBeInTheDocument()
  })
})
