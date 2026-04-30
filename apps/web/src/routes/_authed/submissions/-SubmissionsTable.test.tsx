import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SubmissionsTable } from './-SubmissionsTable'
import { render, renderWithRouter } from '../../../test/router'

const sampleRows = [
  {
    id: '30420000-0000-0000-0000-000000000000',
    studentId: 'STU-1042',
    submissionTitle: 'Modernist Poetry Oral Defence',
    dateSubmitted: '12 Mar 2026',
  },
  {
    id: '30420000-0000-0000-0000-000000000001',
    studentId: 'STU-1098',
    submissionTitle: 'Postcolonial Literature Reflection',
    dateSubmitted: '10 Mar 2026',
  },
]

describe('SubmissionsTable', () => {
  it('renders the configured columns and submission rows', async () => {
    renderWithRouter(<SubmissionsTable rows={sampleRows} />, '/submissions')

    expect(await screen.findByRole('table', { name: 'Submissions' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Student ID' })).toBeInTheDocument()
    expect(
      screen.getByRole('columnheader', { name: 'Submission Title' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Date Submitted' })).toBeInTheDocument()

    expect(screen.getByText('STU-1042')).toBeInTheDocument()
    expect(screen.getByText('Modernist Poetry Oral Defence')).toBeInTheDocument()
    expect(screen.getByText('10 Mar 2026')).toBeInTheDocument()

    expect(
      screen.getByRole('link', { name: 'Modernist Poetry Oral Defence' }),
    ).toHaveAttribute('href', '/submissions/30420000-0000-0000-0000-000000000000')
  })

  it('shows an intentional empty state when there are no rows', async () => {
    renderWithRouter(<SubmissionsTable rows={[]} />, '/submissions')

    expect(await screen.findByText('No submissions yet.')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Student submissions will appear here once coursework is ready for review.',
      ),
    ).toBeInTheDocument()
  })
})
