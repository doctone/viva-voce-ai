import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { SubmissionDetailPage } from './submissions.$submissionId'
import { createTestQuestion, createTestSubmission, createTestSubmissionViva } from '../../test/factories'
import { storageUploadHandler, submissionVivaHandler, submissionWithQuestionsHandlers } from '../../test/handlers'
import { renderWithRouter } from '../../test/router'
import { server } from '../../test/server'

const testSubmission = createTestSubmission({
  submission_title: 'Mercantile law response',
  submission_text:
    'The evolution of mercantile law in the 18th century represents a pivotal shift from localized guild regulations to a more formalized system of international trade governance.',
  created_at: '2026-04-30T20:00:00.000Z',
})

const generateSubmissionVivaSpy = vi.fn()

vi.mock('../../features/submissions/useGenerateSubmissionViva', () => ({
  useGenerateSubmissionViva: () => generateSubmissionVivaSpy,
}))

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void

  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })

  return { promise, resolve, reject }
}

describe('SubmissionDetailPage', () => {
  it('renders the saved viva questions alongside the submission', async () => {
    generateSubmissionVivaSpy.mockReset()

    server.use(
      ...submissionWithQuestionsHandlers(testSubmission, [
        createTestQuestion({
          category: 'comprehension_and_accuracy',
          question_text: 'Why does the response describe Lord Mansfield as pivotal?',
          teacher_note: 'Listen for understanding of legal reform and why it mattered.',
          is_recommended: true,
          sort_order: 1,
        }),
        createTestQuestion({
          id: '40420000-0000-0000-0000-000000000001',
          category: 'authenticity_and_ownership',
          question_text:
            'Which sentence took the longest to shape, and what were you trying to achieve?',
          teacher_note: 'Listen for drafting choices tied to the actual wording.',
          is_recommended: false,
          sort_order: 9,
          created_at: '2026-04-30T20:06:00.000Z',
        }),
      ]),
      submissionVivaHandler([]),
    )

    renderWithRouter(
      <SubmissionDetailPage />,
      '/submissions/30420000-0000-0000-0000-000000000000',
    )

    expect(screen.queryByRole('heading', { name: 'Preparing viva questions' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Viva questions unavailable' })).not.toBeInTheDocument()
    expect(
      await screen.findByText(/The evolution of mercantile law in the 18th century/),
    ).toBeInTheDocument()
    expect(screen.getByText('Mercantile law response')).toBeInTheDocument()
    expect(
      screen.getByText(/The evolution of mercantile law in the 18th century/),
    ).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Submission' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Viva Questions' })).toBeInTheDocument()

    expect(screen.queryByText('Viva Questions for this Submission')).not.toBeInTheDocument()
  })

  it('switches the main panel from the submission to viva questions', async () => {
    generateSubmissionVivaSpy.mockReset()

    server.use(
      ...submissionWithQuestionsHandlers(
        createTestSubmission({ submission_text: 'Body paragraph one.\n\nBody paragraph two.' }),
        [
          createTestQuestion({
            question_text: 'Why does the response describe Lord Mansfield as pivotal?',
            teacher_note: 'Listen for understanding of legal reform and why it mattered.',
          }),
        ],
      ),
      submissionVivaHandler([]),
    )

    const user = userEvent.setup()

    renderWithRouter(
      <SubmissionDetailPage />,
      '/submissions/30420000-0000-0000-0000-000000000000',
    )

    expect(await screen.findByText('Body paragraph one.')).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Viva Questions' }))

    expect(screen.queryByText('Body paragraph one.')).not.toBeInTheDocument()
    expect(screen.getByText('Viva Questions for this Submission')).toBeInTheDocument()
    expect(screen.getByText('Why does the response describe Lord Mansfield as pivotal?')).toBeInTheDocument()
  })

  it('uploads and displays a viva audio recording', async () => {
    generateSubmissionVivaSpy.mockReset()

    let vivaRequestCount = 0
    const testSubmissionViva = createTestSubmissionViva()

    server.use(
      ...submissionWithQuestionsHandlers(
        createTestSubmission({ submission_text: 'Body text.' }),
        [createTestQuestion({ question_text: 'Test question', teacher_note: 'Test note' })],
      ),
      storageUploadHandler(),
      http.post('https://example-project.supabase.co/rest/v1/submission_viva', () =>
        HttpResponse.json([testSubmissionViva]),
      ),
      http.get('https://example-project.supabase.co/rest/v1/submission_viva', () =>
        HttpResponse.json(vivaRequestCount++ === 0 ? [] : [testSubmissionViva]),
      ),
    )

    const user = userEvent.setup()

    renderWithRouter(
      <SubmissionDetailPage />,
      '/submissions/30420000-0000-0000-0000-000000000000',
    )

    await user.click(await screen.findByRole('tab', { name: 'Viva Questions' }))

    const fileInput = await screen.findByLabelText('Upload viva audio')
    const file = new File(['audio-data'], 'test.webm', { type: 'audio/webm' })
    await user.upload(fileInput, file)

    expect(await screen.findByText('test.webm')).toBeInTheDocument()
    expect(screen.getByTestId('submission-viva-player')).toBeInTheDocument()
  })

  it('shows a calm generation shell while viva questions are being prepared', async () => {
    const deferredGeneration = createDeferred<{
      status: 'completed'
      submissionId: string
    }>()

    generateSubmissionVivaSpy.mockReturnValue(deferredGeneration.promise)

    server.use(
      ...submissionWithQuestionsHandlers(createTestSubmission({ submission_text: 'Body text.' }), []),
      submissionVivaHandler([]),
    )

    renderWithRouter(
      <SubmissionDetailPage />,
      '/submissions/30420000-0000-0000-0000-000000000000',
    )

    expect(
      await screen.findByRole('heading', { name: 'Preparing viva questions' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('The submission has been saved. Viva questions are being prepared now.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('This usually takes a few seconds. If it takes longer, you can stay on this page.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'The Submission' })).not.toBeInTheDocument()

    await act(async () => {
      deferredGeneration.resolve({
        status: 'completed',
        submissionId: '30420000-0000-0000-0000-000000000000',
      })

      await deferredGeneration.promise
    })
  })

  it('shows an in-place retry state when viva question generation fails', async () => {
    generateSubmissionVivaSpy.mockResolvedValue({
      status: 'failed',
      submissionId: '30420000-0000-0000-0000-000000000000',
      errorMessage: 'Question generation failed',
    })

    server.use(
      ...submissionWithQuestionsHandlers(createTestSubmission({ submission_text: 'Body text.' }), []),
      submissionVivaHandler([]),
    )

    renderWithRouter(
      <SubmissionDetailPage />,
      '/submissions/30420000-0000-0000-0000-000000000000',
    )

    expect(
      await screen.findByRole('heading', { name: 'Viva questions unavailable' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('The submission was saved, but viva question generation did not complete.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Question generation failed')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('retries generation from the detail page and then shows the full submission view', async () => {
    generateSubmissionVivaSpy
      .mockResolvedValueOnce({
        status: 'failed',
        submissionId: '30420000-0000-0000-0000-000000000000',
        errorMessage: 'Question generation failed',
      })
      .mockResolvedValueOnce({
        status: 'completed',
        submissionId: '30420000-0000-0000-0000-000000000000',
      })

    let questionRequestCount = 0

    server.use(
      http.get('https://example-project.supabase.co/rest/v1/submissions', () =>
        HttpResponse.json([createTestSubmission({ submission_text: 'Body text.' })]),
      ),
      http.get('https://example-project.supabase.co/rest/v1/viva_questions', () => {
        questionRequestCount += 1

        if (questionRequestCount === 1) {
          return HttpResponse.json([])
        }

        return HttpResponse.json([
          createTestQuestion({
            question_text: 'Why does the response describe Lord Mansfield as pivotal?',
            teacher_note: 'Listen for understanding of legal reform and why it mattered.',
          }),
        ])
      }),
      submissionVivaHandler([]),
    )

    const user = userEvent.setup()

    renderWithRouter(
      <SubmissionDetailPage />,
      '/submissions/30420000-0000-0000-0000-000000000000',
    )

    await user.click(await screen.findByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('Body text.')).toBeInTheDocument()
  })
})
