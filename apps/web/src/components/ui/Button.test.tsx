import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Button, buttonClassName } from './Button'

describe('Button', () => {
  it('scales from dense rows through the default up to touch-first controls', () => {
    expect(buttonClassName({ size: 'sm' })).toContain('h-8')
    expect(buttonClassName()).toContain('h-10')
    expect(buttonClassName({ size: 'lg' })).toContain('h-11')
  })

  it('names a destructive action in the error colour, not the brand navy', () => {
    render(<Button variant="destructive">Delete Recording</Button>)

    const button = screen.getByRole('button', { name: 'Delete Recording' })

    expect(button.className).toContain('bg-error')
    expect(button.className).not.toContain('bg-primary-container')
  })

  it('shows a busy indicator while loading and keeps the label readable', () => {
    render(<Button isLoading>Save</Button>)

    const button = screen.getByRole('button', { name: /Save/ })

    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(button.querySelector('[data-slot="button-spinner"]')).toBeInTheDocument()
  })

  it('renders an icon-only button as a square that still has an accessible name', () => {
    render(
      <Button aria-label="Close" iconOnly>
        <svg />
      </Button>,
    )

    const button = screen.getByRole('button', { name: 'Close' })

    expect(button.className).toContain('w-10')
    expect(button.className).toContain('px-0')
  })

  it('sizes every variant off the same scale, so a pair of buttons always lines up', () => {
    const primaryClassName = buttonClassName({ variant: 'primary' })
    const secondaryClassName = buttonClassName({ variant: 'secondary' })
    const destructiveClassName = buttonClassName({ variant: 'destructive' })

    for (const className of [
      primaryClassName,
      secondaryClassName,
      destructiveClassName,
    ]) {
      expect(className).toContain('h-10')
      expect(className).toContain('px-4')
    }
  })

  it('supports the app legacy props on top of the shared button API', () => {
    render(
      <Button fullWidth isLoading variant="primary">
        Save
      </Button>,
    )

    const button = screen.getByRole('button', { name: /Save/ })

    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
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
