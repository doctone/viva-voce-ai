import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse, delay } from 'msw'
import { describe, expect, it } from 'vitest'
import { SubmissionsPage } from './-SubmissionsPage'
import { createTestSubmission } from '../../../test/factories'
import { submissionsListHandler } from '../../../test/handlers'
import { renderWithRouter } from '../../../test/router'
import { server } from '../../../test/server'

const testSubmission = createTestSubmission({
  student_id: 'STU-1042',
  submission_title: 'Modernist Poetry Oral Defence',
  created_at: '2026-03-12T09:00:00.000Z',
})

describe('SubmissionsPage', () => {
  it('renders a table of submissions with student ID, title, and a human-readable date', async () => {
    server.use(submissionsListHandler([testSubmission]))

    renderWithRouter(<SubmissionsPage />, '/submissions')

    expect(await screen.findByText('STU-1042')).toBeInTheDocument()
    expect(screen.getByText('Modernist Poetry Oral Defence')).toBeInTheDocument()
    expect(screen.getByText('12 Mar 2026')).toBeInTheDocument()
    expect(screen.queryByText('2026-03-12T09:00:00.000Z')).not.toBeInTheDocument()
  })

  it('shows the submission status as a chip based on question and recording progress', async () => {
    server.use(
      submissionsListHandler([
        { ...testSubmission, vivaQuestionsCount: 0, submissionVivaCount: 0 },
        {
          ...createTestSubmission({
            id: '30420000-0000-0000-0000-000000000001',
            student_id: 'STU-1098',
            submission_title: 'Postcolonial Literature Reflection',
          }),
          vivaQuestionsCount: 12,
          submissionVivaCount: 0,
        },
        {
          ...createTestSubmission({
            id: '30420000-0000-0000-0000-000000000002',
            student_id: 'STU-1120',
            submission_title: 'Victorian Novel Analysis',
          }),
          vivaQuestionsCount: 12,
          submissionVivaCount: 1,
        },
      ]),
    )

    renderWithRouter(<SubmissionsPage />, '/submissions')

    expect(await screen.findByText('Pending Questions')).toBeInTheDocument()
    expect(screen.getByText('Ready for Viva')).toBeInTheDocument()
    expect(screen.getByText('Recorded')).toBeInTheDocument()
  })

  it('shows a helpful empty state when there are no submissions', async () => {
    server.use(submissionsListHandler([]))

    renderWithRouter(<SubmissionsPage />, '/submissions')

    expect(await screen.findByText('No submissions yet.')).toBeInTheDocument()
  })

  it('shows a New Submission link that navigates to the new submission form', async () => {
    server.use(submissionsListHandler([]))

    const user = userEvent.setup()

    renderWithRouter(<SubmissionsPage />, '/submissions', {
      '/submissions/new': <div>New submission form</div>,
    })

    await user.click(await screen.findByRole('link', { name: 'New Submission' }))

    expect(await screen.findByText('New submission form')).toBeInTheDocument()
  })

  it('navigates to the detail page when a submission row is clicked', async () => {
    server.use(submissionsListHandler([testSubmission]))

    const user = userEvent.setup()

    renderWithRouter(<SubmissionsPage />, '/submissions', {
      '/submissions/$submissionId': <div>Submission detail</div>,
    })

    await user.click(await screen.findByRole('link', { name: 'Modernist Poetry Oral Defence' }))

    expect(await screen.findByText('Submission detail')).toBeInTheDocument()
  })

  it('shows a loading indicator while submissions are loading', async () => {
    server.use(
      http.get('https://example-project.supabase.co/rest/v1/submissions', async () => {
        await delay('infinite')
        return HttpResponse.json([])
      }),
    )

    renderWithRouter(<SubmissionsPage />, '/submissions')

    expect(await screen.findByText('Loading submissions...')).toBeInTheDocument()
    expect(screen.queryByText('No submissions yet.')).not.toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('shows an error state when the Supabase query fails', async () => {
    server.use(
      http.get('https://example-project.supabase.co/rest/v1/submissions', () => {
        return HttpResponse.json({ message: 'Query failed' }, { status: 500 })
      }),
    )

    renderWithRouter(<SubmissionsPage />, '/submissions')

    expect(await screen.findByText('We could not load submissions.')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.queryByText('No submissions yet.')).not.toBeInTheDocument()
    })
  })
})
