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
    status: 'pending' as const,
  },
  {
    id: '30420000-0000-0000-0000-000000000001',
    studentId: 'STU-1098',
    submissionTitle: 'Postcolonial Literature Reflection',
    dateSubmitted: '10 Mar 2026',
    status: 'recorded' as const,
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
    expect(screen.getByRole('columnheader', { name: 'Status' })).toBeInTheDocument()

    expect(screen.getByText('STU-1042')).toBeInTheDocument()
    expect(screen.getByText('Modernist Poetry Oral Defence')).toBeInTheDocument()
    expect(screen.getByText('10 Mar 2026')).toBeInTheDocument()
    expect(screen.getByText('Pending Questions')).toBeInTheDocument()
    expect(screen.getByText('Recorded')).toBeInTheDocument()

    expect(
      screen.getByRole('link', { name: 'Modernist Poetry Oral Defence' }),
    ).toHaveAttribute('href', '/submissions/30420000-0000-0000-0000-000000000000')
  })

  it('renders a "Ready for Viva" status once questions exist but no recording has been uploaded', async () => {
    renderWithRouter(
      <SubmissionsTable
        rows={[
          {
            id: '30420000-0000-0000-0000-000000000002',
            studentId: 'STU-1120',
            submissionTitle: 'Victorian Novel Analysis',
            dateSubmitted: '08 Mar 2026',
            status: 'questions_ready',
          },
        ]}
      />,
      '/submissions',
    )

    expect(await screen.findByText('Ready for Viva')).toBeInTheDocument()
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
