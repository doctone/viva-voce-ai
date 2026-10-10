import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Button } from './Button'

describe('Button', () => {
  it('shows a busy indicator while loading and keeps the label readable', () => {
    render(<Button isLoading>Save</Button>)

    const button = screen.getByRole('button', { name: /Save/ })

    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
  })
})
