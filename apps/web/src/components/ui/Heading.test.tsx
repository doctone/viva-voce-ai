import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Heading } from './Heading'

describe('Heading', () => {
  it.each([
    { level: undefined, expectedLevel: 1, name: 'New submission' },
    { level: 2 as const, expectedLevel: 2, name: 'How it works' },
  ])('renders a level-$expectedLevel heading', ({ level, expectedLevel, name }) => {
    render(<Heading level={level}>{name}</Heading>)

    expect(screen.getByRole('heading', { level: expectedLevel, name })).toBeInTheDocument()
  })
})
