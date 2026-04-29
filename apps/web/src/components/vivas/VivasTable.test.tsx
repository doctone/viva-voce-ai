import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { VivasTable } from './VivasTable'

const sampleRows = [
  {
    studentId: 'STU-1042',
    submissionTitle: 'Modernist Poetry Oral Defence',
    dateSubmitted: '12 Mar 2026',
  },
  {
    studentId: 'STU-1098',
    submissionTitle: 'Postcolonial Literature Reflection',
    dateSubmitted: '10 Mar 2026',
  },
]

describe('VivasTable', () => {
  it('renders the configured columns and submission rows', () => {
    render(<VivasTable rows={sampleRows} />)

    expect(screen.getByRole('table', { name: 'Viva submissions' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Student ID' })).toBeInTheDocument()
    expect(
      screen.getByRole('columnheader', { name: 'Submission Title' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Date Submitted' })).toBeInTheDocument()

    expect(screen.getByText('STU-1042')).toBeInTheDocument()
    expect(screen.getByText('Modernist Poetry Oral Defence')).toBeInTheDocument()
    expect(screen.getByText('10 Mar 2026')).toBeInTheDocument()
  })

  it('shows an intentional empty state when there are no rows', () => {
    render(<VivasTable rows={[]} />)

    expect(screen.getByText('No viva submissions yet.')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Student submissions will appear here once coursework is ready for review.',
      ),
    ).toBeInTheDocument()
  })
})
