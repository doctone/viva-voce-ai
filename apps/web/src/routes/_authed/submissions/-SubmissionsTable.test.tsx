import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { SubmissionsTable } from './-SubmissionsTable'
import { renderWithRouter } from '../../../test/router'

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
})
