import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PageFrame } from './PageFrame'

describe('PageFrame', () => {
  it('renders the eyebrow, title, description, actions, breadcrumb, and children', () => {
    render(
      <PageFrame
        breadcrumb={<div>Breadcrumb slot</div>}
        eyebrow="Workspace"
        title="Submissions"
        description="Review recent submissions."
        actions={<button>New Submission</button>}
      >
        <p>Body content</p>
      </PageFrame>,
    )

    expect(screen.getByText('Breadcrumb slot')).toBeInTheDocument()
    expect(screen.getByText('Workspace')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Submissions' })).toBeInTheDocument()
    expect(screen.getByText('Review recent submissions.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New Submission' })).toBeInTheDocument()
    expect(screen.getByText('Body content')).toBeInTheDocument()
  })

  it('renders without optional slots', () => {
    render(<PageFrame title="Student Records" />)

    expect(screen.getByRole('heading', { name: 'Student Records' })).toBeInTheDocument()
  })
})
