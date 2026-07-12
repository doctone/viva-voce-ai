import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { SubmissionDetailPage } from './submissions.$submissionId'
import { createTestQuestion, createTestSubmission, createTestSubmissionViva } from '../../test/factories'
import {
  signedUrlHandler,
  storageUploadHandler,
  submissionVivaHandler,
  submissionWithQuestionsHandlers,
} from '../../test/handlers'
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

  it('distinguishes recommended questions, shows category labels, and shows teacher notes only when present', async () => {
    generateSubmissionVivaSpy.mockReset()

    server.use(
      http.get('https://example-project.supabase.co/rest/v1/submissions', () =>
        HttpResponse.json([
          {
            id: '30420000-0000-0000-0000-000000000000',
            student_id: '10420000-0000-0000-0000-000000000000',
            submission_title: 'Mercantile law response',
            submission_text: 'Body text.',
            created_at: '2026-04-30T20:00:00.000Z',
          },
        ]),
      ),
      http.get('https://example-project.supabase.co/rest/v1/viva_questions', () =>
        HttpResponse.json([
          {
            id: '40420000-0000-0000-0000-000000000000',
            submission_id: '30420000-0000-0000-0000-000000000000',
            category: 'comprehension_and_accuracy',
            question_text: 'Recommended question',
            teacher_note: 'Listen for understanding.',
            is_recommended: true,
            sort_order: 1,
          },
          {
            id: '40420000-0000-0000-0000-000000000001',
            submission_id: '30420000-0000-0000-0000-000000000000',
            category: 'argumentation_and_reasoning',
            question_text: 'Non-recommended question',
            teacher_note: '',
            is_recommended: false,
            sort_order: 2,
          },
          {
            id: '40420000-0000-0000-0000-000000000002',
            submission_id: '30420000-0000-0000-0000-000000000000',
            category: 'authenticity_and_ownership',
            question_text: 'Authenticity question',
            teacher_note: '',
            is_recommended: false,
            sort_order: 3,
          },
        ]),
      ),
      http.get('https://example-project.supabase.co/rest/v1/submission_viva', () => HttpResponse.json([])),
    )

    const user = userEvent.setup()

    renderWithRouter(
      <SubmissionDetailPage />,
      '/submissions/30420000-0000-0000-0000-000000000000',
    )

    await user.click(await screen.findByRole('tab', { name: 'Viva Questions' }))

    expect(screen.getByText('Comprehension And Accuracy')).toBeInTheDocument()
    expect(screen.getByText('Argumentation And Reasoning')).toBeInTheDocument()
    expect(screen.getByText('Authenticity And Ownership')).toBeInTheDocument()

    const recommendedCard = screen.getByText('Recommended question').closest('article')
    const nonRecommendedCard = screen.getByText('Non-recommended question').closest('article')

    expect(recommendedCard).not.toBeNull()
    expect(nonRecommendedCard).not.toBeNull()
    expect(within(recommendedCard as HTMLElement).getByText('Recommended')).toBeInTheDocument()
    expect(within(nonRecommendedCard as HTMLElement).queryByText('Recommended')).not.toBeInTheDocument()

    expect(screen.getByText('Listen for understanding.')).toBeInTheDocument()
    expect(
      within(nonRecommendedCard as HTMLElement).getAllByRole('paragraph'),
    ).toHaveLength(1)
  })

  it('adds a manual question through the Add Manual Question flow', async () => {
    generateSubmissionVivaSpy.mockReset()

    let insertedBody: unknown = null

    server.use(
      http.get('https://example-project.supabase.co/rest/v1/submissions', () =>
        HttpResponse.json([
          {
            id: '30420000-0000-0000-0000-000000000000',
            student_id: '10420000-0000-0000-0000-000000000000',
            submission_title: 'Mercantile law response',
            submission_text: 'Body text.',
            created_at: '2026-04-30T20:00:00.000Z',
          },
        ]),
      ),
      http.get('https://example-project.supabase.co/rest/v1/viva_questions', async ({ request }) => {
        if (insertedBody) {
          return HttpResponse.json([
            {
              id: '40420000-0000-0000-0000-000000000000',
              submission_id: '30420000-0000-0000-0000-000000000000',
              category: 'comprehension_and_accuracy',
              question_text: 'Existing question',
              teacher_note: 'Existing note',
              is_recommended: true,
              sort_order: 1,
            },
            {
              id: '40420000-0000-0000-0000-000000000099',
              submission_id: '30420000-0000-0000-0000-000000000000',
              category: (insertedBody as { category: string }).category,
              question_text: (insertedBody as { question_text: string }).question_text,
              teacher_note: (insertedBody as { teacher_note: string }).teacher_note,
              is_recommended: false,
              sort_order: 2,
            },
          ])
        }

        void request

        return HttpResponse.json([
          {
            id: '40420000-0000-0000-0000-000000000000',
            submission_id: '30420000-0000-0000-0000-000000000000',
            category: 'comprehension_and_accuracy',
            question_text: 'Existing question',
            teacher_note: 'Existing note',
            is_recommended: true,
            sort_order: 1,
          },
        ])
      }),
      http.post('https://example-project.supabase.co/rest/v1/viva_questions', async ({ request }) => {
        insertedBody = await request.json()

        return HttpResponse.json({}, { status: 201 })
      }),
      http.get('https://example-project.supabase.co/rest/v1/submission_viva', () => HttpResponse.json([])),
    )

    const user = userEvent.setup()

    renderWithRouter(
      <SubmissionDetailPage />,
      '/submissions/30420000-0000-0000-0000-000000000000',
    )

    await user.click(await screen.findByRole('tab', { name: 'Viva Questions' }))
    await user.click(await screen.findByRole('button', { name: 'Add Manual Question' }))

    await user.type(screen.getByLabelText('Question text'), 'A brand new manual question')

    await user.click(screen.getByRole('button', { name: 'Save question' }))

    expect(await screen.findByText('A brand new manual question')).toBeInTheDocument()
    expect(insertedBody).toMatchObject({
      submission_id: '30420000-0000-0000-0000-000000000000',
      question_text: 'A brand new manual question',
    })
  })

  it('edits a question and shows the updated text after save', async () => {
    generateSubmissionVivaSpy.mockReset()

    let questionText = 'Original question text'

    server.use(
      http.get('https://example-project.supabase.co/rest/v1/submissions', () =>
        HttpResponse.json([
          {
            id: '30420000-0000-0000-0000-000000000000',
            student_id: '10420000-0000-0000-0000-000000000000',
            submission_title: 'Mercantile law response',
            submission_text: 'Body text.',
            created_at: '2026-04-30T20:00:00.000Z',
          },
        ]),
      ),
      http.get('https://example-project.supabase.co/rest/v1/viva_questions', () =>
        HttpResponse.json([
          {
            id: '40420000-0000-0000-0000-000000000000',
            submission_id: '30420000-0000-0000-0000-000000000000',
            category: 'comprehension_and_accuracy',
            question_text: questionText,
            teacher_note: 'A note',
            is_recommended: true,
            sort_order: 1,
          },
        ]),
      ),
      http.patch('https://example-project.supabase.co/rest/v1/viva_questions', async ({ request }) => {
        const body = (await request.json()) as { question_text: string }
        questionText = body.question_text

        return HttpResponse.json({}, { status: 204 })
      }),
      http.get('https://example-project.supabase.co/rest/v1/submission_viva', () => HttpResponse.json([])),
    )

    const user = userEvent.setup()

    renderWithRouter(
      <SubmissionDetailPage />,
      '/submissions/30420000-0000-0000-0000-000000000000',
    )

    await user.click(await screen.findByRole('tab', { name: 'Viva Questions' }))

    await user.click(
      await screen.findByRole('button', { name: 'Edit question: Original question text' }),
    )

    const editField = screen.getByLabelText('Edit question text for Comprehension And Accuracy')
    await user.clear(editField)
    await user.type(editField, 'Updated question text')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Updated question text')).toBeInTheDocument()
    expect(screen.queryByText('Original question text')).not.toBeInTheDocument()
  })

  it('shows an upload prompt with no audio player when no recording exists', async () => {
    generateSubmissionVivaSpy.mockReset()

    server.use(
      http.get('https://example-project.supabase.co/rest/v1/submissions', () =>
        HttpResponse.json([
          {
            id: '30420000-0000-0000-0000-000000000000',
            student_id: '10420000-0000-0000-0000-000000000000',
            submission_title: 'Mercantile law response',
            submission_text: 'Body text.',
            created_at: '2026-04-30T20:00:00.000Z',
          },
        ]),
      ),
      http.get('https://example-project.supabase.co/rest/v1/viva_questions', () =>
        HttpResponse.json([
          {
            id: '40420000-0000-0000-0000-000000000000',
            submission_id: '30420000-0000-0000-0000-000000000000',
            category: 'comprehension_and_accuracy',
            question_text: 'Test question',
            teacher_note: 'Test note',
            is_recommended: true,
            sort_order: 1,
          },
        ]),
      ),
      http.get('https://example-project.supabase.co/rest/v1/submission_viva', () => HttpResponse.json([])),
    )

    const user = userEvent.setup()

    renderWithRouter(
      <SubmissionDetailPage />,
      '/submissions/30420000-0000-0000-0000-000000000000',
    )

    await user.click(await screen.findByRole('tab', { name: 'Viva Questions' }))

    expect(await screen.findByLabelText('Upload viva audio')).toBeInTheDocument()
    expect(screen.queryByTestId('submission-viva-player')).not.toBeInTheDocument()
  })

  it('renders the audio player immediately when a recording already exists', async () => {
    generateSubmissionVivaSpy.mockReset()

    server.use(
      http.get('https://example-project.supabase.co/rest/v1/submissions', () =>
        HttpResponse.json([
          {
            id: '30420000-0000-0000-0000-000000000000',
            student_id: '10420000-0000-0000-0000-000000000000',
            submission_title: 'Mercantile law response',
            submission_text: 'Body text.',
            created_at: '2026-04-30T20:00:00.000Z',
          },
        ]),
      ),
      http.get('https://example-project.supabase.co/rest/v1/viva_questions', () =>
        HttpResponse.json([
          {
            id: '40420000-0000-0000-0000-000000000000',
            submission_id: '30420000-0000-0000-0000-000000000000',
            category: 'comprehension_and_accuracy',
            question_text: 'Test question',
            teacher_note: 'Test note',
            is_recommended: true,
            sort_order: 1,
          },
        ]),
      ),
      http.get('https://example-project.supabase.co/rest/v1/submission_viva', () =>
        HttpResponse.json([
          {
            id: '50420000-0000-0000-0000-000000000000',
            submission_id: '30420000-0000-0000-0000-000000000000',
            audio_path: 'existing.webm',
            file_name: 'existing.webm',
            created_at: '2026-04-30T20:10:00.000Z',
          },
        ]),
      ),
    )

    const user = userEvent.setup()

    renderWithRouter(
      <SubmissionDetailPage />,
      '/submissions/30420000-0000-0000-0000-000000000000',
    )

    await user.click(await screen.findByRole('tab', { name: 'Viva Questions' }))

    const player = await screen.findByTestId('submission-viva-player')
    expect(player).toBeInTheDocument()
    expect(player.getAttribute('src')).toContain('/object/sign/submission-viva-audio/')
    expect(player.getAttribute('src')).toContain('token=')
    expect(screen.getByText('existing.webm')).toBeInTheDocument()
  })

  it('does not render a player and shows a message when playback is denied', async () => {
    generateSubmissionVivaSpy.mockReset()

    server.use(
      ...submissionWithQuestionsHandlers(
        createTestSubmission({ submission_text: 'Body text.' }),
        [createTestQuestion({ question_text: 'Test question', teacher_note: 'Test note' })],
      ),
      submissionVivaHandler([createTestSubmissionViva()]),
      signedUrlHandler({ status: 403 }),
    )

    const user = userEvent.setup()

    renderWithRouter(
      <SubmissionDetailPage />,
      '/submissions/30420000-0000-0000-0000-000000000000',
    )

    await user.click(await screen.findByRole('tab', { name: 'Viva Questions' }))

    expect(
      await screen.findByText('You do not have permission to play this recording.'),
    ).toBeInTheDocument()
    expect(screen.queryByTestId('submission-viva-player')).not.toBeInTheDocument()
  })

  it('does not render a player and shows a message when the session has expired', async () => {
    generateSubmissionVivaSpy.mockReset()

    server.use(
      ...submissionWithQuestionsHandlers(
        createTestSubmission({ submission_text: 'Body text.' }),
        [createTestQuestion({ question_text: 'Test question', teacher_note: 'Test note' })],
      ),
      submissionVivaHandler([createTestSubmissionViva()]),
      signedUrlHandler({ status: 401 }),
    )

    const user = userEvent.setup()

    renderWithRouter(
      <SubmissionDetailPage />,
      '/submissions/30420000-0000-0000-0000-000000000000',
    )

    await user.click(await screen.findByRole('tab', { name: 'Viva Questions' }))

    expect(
      await screen.findByText('Your session has expired. Sign in again to play this recording.'),
    ).toBeInTheDocument()
    expect(screen.queryByTestId('submission-viva-player')).not.toBeInTheDocument()
  })

  it('does not render a player and shows a message when the recording is missing', async () => {
    generateSubmissionVivaSpy.mockReset()

    server.use(
      ...submissionWithQuestionsHandlers(
        createTestSubmission({ submission_text: 'Body text.' }),
        [createTestQuestion({ question_text: 'Test question', teacher_note: 'Test note' })],
      ),
      submissionVivaHandler([createTestSubmissionViva()]),
      signedUrlHandler({ status: 404 }),
    )

    const user = userEvent.setup()

    renderWithRouter(
      <SubmissionDetailPage />,
      '/submissions/30420000-0000-0000-0000-000000000000',
    )

    await user.click(await screen.findByRole('tab', { name: 'Viva Questions' }))

    expect(
      await screen.findByText('This recording is no longer available.'),
    ).toBeInTheDocument()
    expect(screen.queryByTestId('submission-viva-player')).not.toBeInTheDocument()
  })

  it('shows a loading state while uploading and an error without removing the upload prompt on failure', async () => {
    generateSubmissionVivaSpy.mockReset()

    const uploadDeferred = createDeferred<Response>()

    server.use(
      http.get('https://example-project.supabase.co/rest/v1/submissions', () =>
        HttpResponse.json([
          {
            id: '30420000-0000-0000-0000-000000000000',
            student_id: '10420000-0000-0000-0000-000000000000',
            submission_title: 'Mercantile law response',
            submission_text: 'Body text.',
            created_at: '2026-04-30T20:00:00.000Z',
          },
        ]),
      ),
      http.get('https://example-project.supabase.co/rest/v1/viva_questions', () =>
        HttpResponse.json([
          {
            id: '40420000-0000-0000-0000-000000000000',
            submission_id: '30420000-0000-0000-0000-000000000000',
            category: 'comprehension_and_accuracy',
            question_text: 'Test question',
            teacher_note: 'Test note',
            is_recommended: true,
            sort_order: 1,
          },
        ]),
      ),
      http.post(
        'https://example-project.supabase.co/storage/v1/object/submission-viva-audio/*',
        () => uploadDeferred.promise,
      ),
      http.get('https://example-project.supabase.co/rest/v1/submission_viva', () => HttpResponse.json([])),
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

    expect(await screen.findByText('Uploading viva audio…')).toBeInTheDocument()

    await act(async () => {
      uploadDeferred.resolve(HttpResponse.json({ error: 'upload failed' }, { status: 500 }))
      await uploadDeferred.promise
    })

    expect(await screen.findByText('We could not upload viva audio.')).toBeInTheDocument()
    expect(screen.queryByText('Uploading viva audio…')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Upload viva audio')).toBeInTheDocument()
  })

  it('completes generation for a very short submission text', async () => {
    generateSubmissionVivaSpy.mockResolvedValue({
      status: 'completed',
      submissionId: '30420000-0000-0000-0000-000000000000',
    })

    let questionRequestCount = 0

    server.use(
      http.get('https://example-project.supabase.co/rest/v1/submissions', () =>
        HttpResponse.json([
          {
            id: '30420000-0000-0000-0000-000000000000',
            student_id: '10420000-0000-0000-0000-000000000000',
            submission_title: 'Very short submission',
            submission_text: 'Ok.',
            created_at: '2026-04-30T20:00:00.000Z',
          },
        ]),
      ),
      http.get('https://example-project.supabase.co/rest/v1/viva_questions', () => {
        questionRequestCount += 1

        if (questionRequestCount === 1) {
          return HttpResponse.json([])
        }

        return HttpResponse.json([
          {
            id: '40420000-0000-0000-0000-000000000000',
            submission_id: '30420000-0000-0000-0000-000000000000',
            category: 'comprehension_and_accuracy',
            question_text: 'Question about a short submission',
            teacher_note: 'Note',
            is_recommended: true,
            sort_order: 1,
          },
        ])
      }),
      http.get('https://example-project.supabase.co/rest/v1/submission_viva', () => HttpResponse.json([])),
    )

    renderWithRouter(
      <SubmissionDetailPage />,
      '/submissions/30420000-0000-0000-0000-000000000000',
    )

    expect(await screen.findByText('Ok.')).toBeInTheDocument()
    expect(generateSubmissionVivaSpy).toHaveBeenCalledWith('30420000-0000-0000-0000-000000000000')
  })

  it('shows a helpful retry message when the AI response fails Zod validation', async () => {
    generateSubmissionVivaSpy.mockResolvedValue({
      status: 'failed',
      submissionId: '30420000-0000-0000-0000-000000000000',
      errorMessage:
        'The generated questions did not match the expected format. Please try again.',
    })

    server.use(
      http.get('https://example-project.supabase.co/rest/v1/submissions', () =>
        HttpResponse.json([
          {
            id: '30420000-0000-0000-0000-000000000000',
            student_id: '10420000-0000-0000-0000-000000000000',
            submission_title: 'Mercantile law response',
            submission_text: 'Body text.',
            created_at: '2026-04-30T20:00:00.000Z',
          },
        ]),
      ),
      http.get('https://example-project.supabase.co/rest/v1/viva_questions', () => HttpResponse.json([])),
      http.get('https://example-project.supabase.co/rest/v1/submission_viva', () => HttpResponse.json([])),
    )

    renderWithRouter(
      <SubmissionDetailPage />,
      '/submissions/30420000-0000-0000-0000-000000000000',
    )

    expect(
      await screen.findByText(
        'The generated questions did not match the expected format. Please try again.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })
})
