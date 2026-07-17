import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EmptyState } from './EmptyState'

describe('EmptyState', () => {
  it('renders an eyebrow, title, and description', () => {
    render(
      <EmptyState
        eyebrow="Students"
        title="No student records yet"
        description="Student records will appear here once they are added."
      />,
    )

    expect(screen.getByText('Students')).toBeInTheDocument()
    expect(screen.getByText('No student records yet')).toBeInTheDocument()
    expect(
      screen.getByText('Student records will appear here once they are added.'),
    ).toBeInTheDocument()
  })

  it('renders an optional action', () => {
    render(<EmptyState title="No submissions yet." action={<button>Create one</button>} />)

    expect(screen.getByRole('button', { name: 'Create one' })).toBeInTheDocument()
  })

  it('omits the eyebrow and description when not provided', () => {
    render(<EmptyState title="Nothing here" />)

    expect(screen.getByText('Nothing here')).toBeInTheDocument()
  })
})
