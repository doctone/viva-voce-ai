import { screen, waitFor, within } from '@testing-library/react'
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

const threeSubmissions = [
  { ...testSubmission, vivaQuestionsCount: 0, submissionVivaCount: 0 },
  {
    ...createTestSubmission({
      id: '30420000-0000-0000-0000-000000000001',
      student_id: 'STU-1098',
      submission_title: 'Postcolonial Literature Reflection',
      created_at: '2026-03-10T09:00:00.000Z',
    }),
    vivaQuestionsCount: 12,
    submissionVivaCount: 0,
  },
  {
    ...createTestSubmission({
      id: '30420000-0000-0000-0000-000000000002',
      student_id: 'STU-1120',
      submission_title: 'Victorian Novel Analysis',
      created_at: '2026-03-08T09:00:00.000Z',
    }),
    vivaQuestionsCount: 12,
    submissionVivaCount: 1,
  },
]

describe('SubmissionsPage', () => {
  it('renders a table of submissions with title, student reference, and a human-readable date', async () => {
    server.use(submissionsListHandler([testSubmission]))

    renderWithRouter(<SubmissionsPage />, '/submissions')

    expect(await screen.findByText('Student STU-1042')).toBeInTheDocument()
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

    const table = within(await screen.findByRole('table', { name: 'Submissions' }))

    expect(table.getByText('Awaiting Questions')).toBeInTheDocument()
    expect(table.getByText('Ready to Record')).toBeInTheDocument()
    expect(table.getByText('Recorded')).toBeInTheDocument()
  })

  it('narrows the list to submissions matching a search term', async () => {
    server.use(submissionsListHandler(threeSubmissions))

    const user = userEvent.setup()

    renderWithRouter(<SubmissionsPage />, '/submissions')

    expect(await screen.findByText('Victorian Novel Analysis')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Search'), 'postcolonial')

    expect(
      screen.getByText('Postcolonial Literature Reflection'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Victorian Novel Analysis')).not.toBeInTheDocument()
    expect(screen.getByText('Showing 1 of 3 submissions')).toBeInTheDocument()
  })

  it('narrows the list to a single workflow status', async () => {
    server.use(submissionsListHandler(threeSubmissions))

    const user = userEvent.setup()

    renderWithRouter(<SubmissionsPage />, '/submissions')

    await user.click(await screen.findByRole('button', { name: /^Recorded/ }))

    expect(screen.getByText('Victorian Novel Analysis')).toBeInTheDocument()
    expect(
      screen.queryByText('Modernist Poetry Oral Defence'),
    ).not.toBeInTheDocument()
    expect(screen.getByText('Showing 1 of 3 submissions')).toBeInTheDocument()
  })

  it('shows how many submissions sit in each status on the filter controls', async () => {
    server.use(submissionsListHandler(threeSubmissions))

    renderWithRouter(<SubmissionsPage />, '/submissions')

    expect(await screen.findByRole('button', { name: 'All 3' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Awaiting Questions 1' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Ready to Record 1' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Recorded 1' })).toBeInTheDocument()
  })

  it('offers a way back when the filters match nothing', async () => {
    server.use(submissionsListHandler(threeSubmissions))

    const user = userEvent.setup()

    renderWithRouter(<SubmissionsPage />, '/submissions')

    await user.type(await screen.findByLabelText('Search'), 'chaucer')

    expect(
      screen.getByText('No submissions match these filters.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Clear Filters' }))

    expect(await screen.findByRole('table')).toBeInTheDocument()
    expect(screen.getByText('Modernist Poetry Oral Defence')).toBeInTheDocument()
  })

  it('lets the teacher retry after a failed load', async () => {
    let attempts = 0

    server.use(
      http.get('https://example-project.supabase.co/rest/v1/submissions', () => {
        attempts += 1

        if (attempts === 1) {
          return HttpResponse.json({ message: 'Query failed' }, { status: 500 })
        }

        return HttpResponse.json([
          {
            ...testSubmission,
            viva_questions: [{ count: 0 }],
            submission_viva: [{ count: 0 }],
          },
        ])
      }),
    )

    const user = userEvent.setup()

    renderWithRouter(<SubmissionsPage />, '/submissions')

    await user.click(await screen.findByRole('button', { name: 'Try Again' }))

    expect(
      await screen.findByText('Modernist Poetry Oral Defence'),
    ).toBeInTheDocument()
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
