import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Button } from './button'

describe('Button', () => {
  it('darkens the primary button on hover with --primary-hover, so white text keeps 4.5:1', () => {
    // bg-primary/80 lightens the red toward the page and drops white text to 3.73:1 in light.
    render(<Button>Open</Button>)
    const button = screen.getByRole('button', { name: 'Open' })
    expect(button).toHaveClass('hover:bg-primary-hover')
    expect(button.className).not.toMatch(/hover:bg-primary\//)
  })
})
