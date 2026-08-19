import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { SubmissionsTable } from './-SubmissionsTable'
import { render, renderWithRouter } from '../../../test/router'

const sampleRows = [
  {
    id: '30420000-0000-0000-0000-000000000000',
    studentId: 'STU-1042',
    submissionTitle: 'Modernist Poetry Oral Defence',
    dateSubmitted: '12 Mar 2026',
    submittedAt: '2026-03-12T09:00:00.000Z',
    status: 'pending' as const,
  },
  {
    id: '30420000-0000-0000-0000-000000000001',
    studentId: 'STU-1098',
    submissionTitle: 'Postcolonial Literature Reflection',
    dateSubmitted: '10 Mar 2026',
    submittedAt: '2026-03-10T09:00:00.000Z',
    status: 'recorded' as const,
  },
]

describe('SubmissionsTable', () => {
  it('renders the configured columns and submission rows', async () => {
    renderWithRouter(<SubmissionsTable rows={sampleRows} />, '/submissions')

    expect(await screen.findByRole('table', { name: 'Submissions' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Submission' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Submitted' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Status' })).toBeInTheDocument()

    expect(screen.getByText('Student STU-1042')).toBeInTheDocument()
    expect(screen.getByText('Modernist Poetry Oral Defence')).toBeInTheDocument()
    expect(screen.getByText('10 Mar 2026')).toBeInTheDocument()
    expect(screen.getByText('Awaiting Questions')).toBeInTheDocument()
    expect(screen.getByText('Recorded')).toBeInTheDocument()

    expect(
      screen.getByRole('link', { name: 'Modernist Poetry Oral Defence' }),
    ).toHaveAttribute('href', '/submissions/30420000-0000-0000-0000-000000000000')
  })

  it('renders a "Ready to Record" status once questions exist but no recording has been uploaded', async () => {
    renderWithRouter(
      <SubmissionsTable
        rows={[
          {
            id: '30420000-0000-0000-0000-000000000002',
            studentId: 'STU-1120',
            submissionTitle: 'Victorian Novel Analysis',
            dateSubmitted: '08 Mar 2026',
            submittedAt: '2026-03-08T09:00:00.000Z',
            status: 'questions_ready',
          },
        ]}
      />,
      '/submissions',
    )

    expect(await screen.findByText('Ready to Record')).toBeInTheDocument()
  })

  it('lists the newest submission first before any sorting is chosen', async () => {
    renderWithRouter(<SubmissionsTable rows={sampleRows} />, '/submissions')

    const [, firstRow] = await screen.findAllByRole('row')

    expect(within(firstRow).getByText('Student STU-1042')).toBeInTheDocument()
    expect(
      screen.getByRole('columnheader', { name: 'Submitted' }),
    ).toHaveAttribute('aria-sort', 'descending')
  })

  it('reverses to oldest first when the date header is used', async () => {
    const user = userEvent.setup()

    renderWithRouter(<SubmissionsTable rows={sampleRows} />, '/submissions')

    await user.click(await screen.findByRole('button', { name: 'Submitted' }))

    const [, firstRow] = screen.getAllByRole('row')

    expect(within(firstRow).getByText('Student STU-1098')).toBeInTheDocument()
    expect(
      screen.getByRole('columnheader', { name: 'Submitted' }),
    ).toHaveAttribute('aria-sort', 'ascending')
  })

  it('orders by workflow progress, not alphabetically, when sorting by status', async () => {
    const user = userEvent.setup()

    renderWithRouter(<SubmissionsTable rows={sampleRows} />, '/submissions')

    await user.click(await screen.findByRole('button', { name: 'Status' }))

    const [, firstRow, secondRow] = screen.getAllByRole('row')

    expect(within(firstRow).getByText('Awaiting Questions')).toBeInTheDocument()
    expect(within(secondRow).getByText('Recorded')).toBeInTheDocument()
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
