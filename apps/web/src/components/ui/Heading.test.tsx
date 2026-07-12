import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Heading } from './Heading'

describe('Heading', () => {
  it('renders an h1 with the level-one typography by default', () => {
    render(<Heading>New submission</Heading>)

    const heading = screen.getByRole('heading', { level: 1, name: 'New submission' })

    expect(heading.tagName).toBe('H1')
    expect(heading.className).toContain('text-[36px]')
  })

  it('renders an h2 with the level-two typography for level={2}', () => {
    render(<Heading level={2}>How it works</Heading>)

    const heading = screen.getByRole('heading', { level: 2, name: 'How it works' })

    expect(heading.tagName).toBe('H2')
    expect(heading.className).toContain('text-[32px]')
  })

  it('merges a custom className on top of the level typography', () => {
    render(
      <Heading level={2} className="mb-2">
        Evidence-led support
      </Heading>,
    )

    const heading = screen.getByRole('heading', { level: 2 })

    expect(heading.className).toContain('mb-2')
    expect(heading.className).toContain('text-[32px]')
  })
})
