import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Card } from './Card'

describe('Card', () => {
  it('renders a div with the paper panel and section card surface styling by default', () => {
    render(<Card data-testid="card">Content</Card>)

    const card = screen.getByTestId('card')

    expect(card.tagName).toBe('DIV')
    expect(card.className).toContain('border-outline-variant')
    expect(card.className).toContain('shadow-technical')
    expect(card.className).toContain('grid')
  })

  it('renders the element passed via the as prop', () => {
    render(<Card as="section" data-testid="card" />)

    expect(screen.getByTestId('card').tagName).toBe('SECTION')
  })

  it('overrides conflicting utilities with a custom className', () => {
    render(<Card data-testid="card" className="gap-5" />)

    const card = screen.getByTestId('card')

    expect(card.className).toContain('gap-5')
    expect(card.className).not.toContain('gap-4')
  })

  it('forwards additional props to the rendered element, e.g. a form onSubmit', () => {
    const handleSubmit = vi.fn((event: React.FormEvent) => event.preventDefault())

    render(
      <Card as="form" data-testid="card" noValidate onSubmit={handleSubmit}>
        <button type="submit">Save</button>
      </Card>,
    )

    const card = screen.getByTestId('card')

    expect(card.tagName).toBe('FORM')
    expect(card).toHaveAttribute('novalidate')
  })
})
