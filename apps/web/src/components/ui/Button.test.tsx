import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Button, buttonClassName } from './Button'

describe('Button', () => {
  it('uses one fixed shared size for primary and secondary buttons', () => {
    const primaryClassName = buttonClassName({ variant: 'primary' })
    const secondaryClassName = buttonClassName({ variant: 'secondary' })

    expect(primaryClassName).toContain('h-11')
    expect(primaryClassName).toContain('px-[18px]')
    expect(secondaryClassName).toContain('h-11')
    expect(secondaryClassName).toContain('px-[18px]')
  })

  it('supports the app legacy props on top of the shared button API', () => {
    render(
      <Button fullWidth isLoading variant="primary">
        Save
      </Button>,
    )

    const button = screen.getByRole('button', { name: 'Working...' })

    expect(button).toBeDisabled()
    expect(button.className).toContain('w-full')
    expect(buttonClassName({ variant: 'ghost' })).toContain('bg-transparent')
  })

  it('keeps disabled buttons present with their own structural styling', () => {
    render(
      <Button disabled variant="primary">
        New Submission
      </Button>,
    )

    const button = screen.getByRole('button', { name: 'New Submission' })

    expect(button).toBeDisabled()
    expect(button.className).toContain('border-outline-variant')
    expect(button.className).toContain('bg-surface-container-high')
    expect(button.className).toContain('text-on-surface-variant')
  })
})
