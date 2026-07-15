import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { SubmissionDetailPage } from './submissions.$submissionId'
import {
  createTestAskedQuestion,
  createTestQuestion,
  createTestSubmission,
  createTestSubmissionViva,
  createTestVivaQuestionSet,
  createTestVivaSession,
  type TestAskedQuestion,
  type TestEvidenceMarker,
  type TestObservation,
} from '../../test/factories'
import {
  signedUrlHandler,
  storageUploadHandler,
  submissionVivaHandler,
  submissionWithQuestionsHandlers,
  vivaQuestionSetHandler,
  vivaSessionHandler,
} from '../../test/handlers'
import { renderWithRouter } from '../../test/router'
import { server } from '../../test/server'

const SUPABASE_URL = 'https://example-project.supabase.co'

const testSubmission = createTestSubmission({
  submission_title: 'Mercantile law response',
  submission_text:
    'The evolution of mercantile law in the 18th century represents a pivotal shift from localized guild regulations to a more formalized system of international trade governance.',
  created_at: '2026-04-30T20:00:00.000Z',
})

const generateSubmissionVivaSpy = vi.fn()
const equipmentCheckSpy = vi.fn()

vi.mock('../../features/submissions/useGenerateSubmissionViva', () => ({
  useGenerateSubmissionViva: () => generateSubmissionVivaSpy,
}))

vi.mock('../../features/submissions/useEquipmentCheck', () => ({
  useEquipmentCheck: () => equipmentCheckSpy,
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

    const recommendedCard = screen.getByText('Recommended question').closest('article')
    const nonRecommendedCard = screen.getByText('Non-recommended question').closest('article')
    const authenticityCard = screen.getByText('Authenticity question').closest('article')

    expect(recommendedCard).not.toBeNull()
    expect(nonRecommendedCard).not.toBeNull()
    expect(authenticityCard).not.toBeNull()

    expect(
      within(recommendedCard as HTMLElement).getByText('Comprehension And Accuracy'),
    ).toBeInTheDocument()
    expect(
      within(nonRecommendedCard as HTMLElement).getByText('Argumentation And Reasoning'),
    ).toBeInTheDocument()
    expect(
      within(authenticityCard as HTMLElement).getByText('Authenticity And Ownership'),
    ).toBeInTheDocument()

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

  it('selects a question into the Viva Question Set and shows it in the panel', async () => {
    generateSubmissionVivaSpy.mockReset()

    let question = createTestQuestion({
      question_text: 'Why does the response describe Lord Mansfield as pivotal?',
      teacher_note: 'Listen for understanding of legal reform and why it mattered.',
      set_position: null,
    })

    server.use(
      http.get(`${SUPABASE_URL}/rest/v1/submissions`, () =>
        HttpResponse.json([createTestSubmission({ submission_text: 'Body text.' })]),
      ),
      http.get(`${SUPABASE_URL}/rest/v1/viva_questions`, () => HttpResponse.json([question])),
      http.patch(`${SUPABASE_URL}/rest/v1/viva_questions`, async ({ request }) => {
        const body = (await request.json()) as { set_position: number | null }
        question = { ...question, set_position: body.set_position }

        return HttpResponse.json({}, { status: 204 })
      }),
      vivaQuestionSetHandler(createTestVivaQuestionSet({ status: 'draft' })),
      submissionVivaHandler([]),
    )

    const user = userEvent.setup()

    renderWithRouter(
      <SubmissionDetailPage />,
      '/submissions/30420000-0000-0000-0000-000000000000',
    )

    await user.click(await screen.findByRole('tab', { name: 'Viva Questions' }))

    expect(
      screen.getByText(
        'No questions selected yet. Add questions from the list to build your Viva Question Set.',
      ),
    ).toBeInTheDocument()

    await user.click(
      screen.getByLabelText('Add to Viva Question Set', { exact: false }),
    )

    expect(await screen.findByText(/1\. Comprehension And Accuracy/)).toBeInTheDocument()
    expect(screen.getByText('2 min')).toBeInTheDocument()
    expect(
      screen.queryByText(
        'No questions selected yet. Add questions from the list to build your Viva Question Set.',
      ),
    ).not.toBeInTheDocument()
  })

  it('removes a question from the Viva Question Set from the panel', async () => {
    generateSubmissionVivaSpy.mockReset()

    let question = createTestQuestion({
      question_text: 'Why does the response describe Lord Mansfield as pivotal?',
      teacher_note: 'Listen for understanding of legal reform and why it mattered.',
      set_position: 0,
    })

    server.use(
      http.get(`${SUPABASE_URL}/rest/v1/submissions`, () =>
        HttpResponse.json([createTestSubmission({ submission_text: 'Body text.' })]),
      ),
      http.get(`${SUPABASE_URL}/rest/v1/viva_questions`, () => HttpResponse.json([question])),
      http.patch(`${SUPABASE_URL}/rest/v1/viva_questions`, async ({ request }) => {
        const body = (await request.json()) as { set_position: number | null }
        question = { ...question, set_position: body.set_position }

        return HttpResponse.json({}, { status: 204 })
      }),
      vivaQuestionSetHandler(createTestVivaQuestionSet({ status: 'draft' })),
      submissionVivaHandler([]),
    )

    const user = userEvent.setup()

    renderWithRouter(
      <SubmissionDetailPage />,
      '/submissions/30420000-0000-0000-0000-000000000000',
    )

    await user.click(await screen.findByRole('tab', { name: 'Viva Questions' }))

    expect(await screen.findByText(/1\. Comprehension And Accuracy/)).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', {
        name: 'Remove question from set: Why does the response describe Lord Mansfield as pivotal?',
      }),
    )

    expect(
      await screen.findByText(
        'No questions selected yet. Add questions from the list to build your Viva Question Set.',
      ),
    ).toBeInTheDocument()
  })

  it('reorders Viva Question Set questions with Move up and Move down', async () => {
    generateSubmissionVivaSpy.mockReset()

    let questions = [
      createTestQuestion({
        id: '40420000-0000-0000-0000-000000000000',
        category: 'comprehension_and_accuracy',
        question_text: 'First question',
        set_position: 0,
      }),
      createTestQuestion({
        id: '40420000-0000-0000-0000-000000000001',
        category: 'argumentation_and_reasoning',
        question_text: 'Second question',
        set_position: 1,
      }),
    ]

    server.use(
      http.get(`${SUPABASE_URL}/rest/v1/submissions`, () =>
        HttpResponse.json([createTestSubmission({ submission_text: 'Body text.' })]),
      ),
      http.get(`${SUPABASE_URL}/rest/v1/viva_questions`, () => HttpResponse.json(questions)),
      http.patch(`${SUPABASE_URL}/rest/v1/viva_questions`, async ({ request }) => {
        const body = (await request.json()) as { set_position: number | null }
        const url = new URL(request.url)
        const idFilter = url.searchParams.get('id')
        const id = idFilter?.replace('eq.', '')

        questions = questions.map((existingQuestion) =>
          existingQuestion.id === id
            ? { ...existingQuestion, set_position: body.set_position }
            : existingQuestion,
        )

        return HttpResponse.json({}, { status: 204 })
      }),
      vivaQuestionSetHandler(createTestVivaQuestionSet({ status: 'draft' })),
      submissionVivaHandler([]),
    )

    const user = userEvent.setup()

    renderWithRouter(
      <SubmissionDetailPage />,
      '/submissions/30420000-0000-0000-0000-000000000000',
    )

    await user.click(await screen.findByRole('tab', { name: 'Viva Questions' }))

    expect(await screen.findByText(/1\. Comprehension And Accuracy/)).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: 'Move question up: Second question' }),
    )

    await screen.findByText(/1\. Argumentation And Reasoning/)
    const reorderedQuestions = questions.slice().sort((left, right) => (left.set_position ?? 0) - (right.set_position ?? 0))
    expect(reorderedQuestions.map((question) => question.question_text)).toEqual([
      'Second question',
      'First question',
    ])
  })

  it('marks the Viva Question Set ready and can revert it to draft', async () => {
    generateSubmissionVivaSpy.mockReset()

    let questionSet = createTestVivaQuestionSet({ status: 'draft' })

    server.use(
      ...submissionWithQuestionsHandlers(createTestSubmission({ submission_text: 'Body text.' }), [
        createTestQuestion({ set_position: 0 }),
      ]),
      http.get(`${SUPABASE_URL}/rest/v1/viva_question_sets`, () => HttpResponse.json([questionSet])),
      http.patch(`${SUPABASE_URL}/rest/v1/viva_question_sets`, async ({ request }) => {
        const body = (await request.json()) as { status: 'draft' | 'ready' }
        questionSet = { ...questionSet, status: body.status }

        return HttpResponse.json({}, { status: 204 })
      }),
      submissionVivaHandler([]),
    )

    const user = userEvent.setup()

    renderWithRouter(
      <SubmissionDetailPage />,
      '/submissions/30420000-0000-0000-0000-000000000000',
    )

    await user.click(await screen.findByRole('tab', { name: 'Viva Questions' }))

    expect(await screen.findByText('Draft')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Mark set ready for viva' }))

    expect(await screen.findByText('Ready for Viva')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Revert set to draft' }))

    expect(await screen.findByText('Draft')).toBeInTheDocument()
  })

  it('cannot start a Viva Session while the Viva Question Set is a draft', async () => {
    generateSubmissionVivaSpy.mockReset()
    equipmentCheckSpy.mockReset()

    server.use(
      ...submissionWithQuestionsHandlers(testSubmission, [
        createTestQuestion({ set_position: 0 }),
      ]),
      vivaQuestionSetHandler(createTestVivaQuestionSet({ status: 'draft' })),
      vivaSessionHandler([]),
      submissionVivaHandler([]),
    )

    const user = userEvent.setup()

    renderWithRouter(
      <SubmissionDetailPage />,
      '/submissions/30420000-0000-0000-0000-000000000000',
    )

    await user.click(await screen.findByRole('tab', { name: 'Viva Questions' }))

    expect(
      await screen.findByText(
        'Mark the Viva Question Set ready before starting a Viva Session.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Start Viva Session' }),
    ).not.toBeInTheDocument()
  })

  it('starts a Viva Session once the readiness checklist is complete, and does not allow starting a second one', async () => {
    generateSubmissionVivaSpy.mockReset()
    equipmentCheckSpy.mockReset()
    equipmentCheckSpy.mockResolvedValue('passed')

    let insertedSessionBody: Record<string, unknown> | null = null
    let insertCount = 0
    const createdSession = createTestVivaSession()

    server.use(
      ...submissionWithQuestionsHandlers(testSubmission, [
        createTestQuestion({ set_position: 0 }),
      ]),
      vivaQuestionSetHandler(createTestVivaQuestionSet({ status: 'ready' })),
      submissionVivaHandler([]),
      http.get(`${SUPABASE_URL}/rest/v1/viva_sessions`, () =>
        HttpResponse.json(insertedSessionBody ? [createdSession] : []),
      ),
      http.post(`${SUPABASE_URL}/rest/v1/viva_sessions`, async ({ request }) => {
        insertCount += 1
        insertedSessionBody = (await request.json()) as Record<string, unknown>

        return HttpResponse.json([createdSession], { status: 201 })
      }),
    )

    const user = userEvent.setup()

    renderWithRouter(
      <SubmissionDetailPage />,
      '/submissions/30420000-0000-0000-0000-000000000000',
    )

    await user.click(await screen.findByRole('tab', { name: 'Viva Questions' }))

    await user.click(
      await screen.findByRole('checkbox', {
        name: /I've confirmed this is the correct student/,
      }),
    )
    await user.click(
      screen.getByRole('radio', { name: 'Consent given to record this viva' }),
    )
    await user.click(screen.getByRole('button', { name: 'Run microphone check' }))
    await screen.findByText('Microphone check passed')

    await user.click(screen.getByRole('button', { name: 'Start Viva Session' }))

    expect(await screen.findByText('Viva Session in progress')).toBeInTheDocument()
    expect(insertCount).toBe(1)
    expect(insertedSessionBody).toMatchObject({
      consent_state: 'consent_given',
      equipment_check_result: 'passed',
    })
    expect(
      screen.queryByRole('button', { name: 'Start Viva Session' }),
    ).not.toBeInTheDocument()
  })

  it('captures Observations and Evidence Markers against Asked Questions during an active Viva Session', async () => {
    generateSubmissionVivaSpy.mockReset()
    equipmentCheckSpy.mockReset()

    const activeSession = createTestVivaSession()
    const plannedQuestion = createTestQuestion({ set_position: 0 })
    const createdAskedQuestion = createTestAskedQuestion({
      viva_question_id: plannedQuestion.id,
      question_text: plannedQuestion.question_text,
    })

    let askedQuestions: TestAskedQuestion[] = []
    let observations: TestObservation[] = []
    let evidenceMarkers: TestEvidenceMarker[] = []
    let observationRequestBody: Record<string, unknown> | null = null
    let evidenceMarkerRequestBody: Record<string, unknown> | null = null

    server.use(
      ...submissionWithQuestionsHandlers(testSubmission, [plannedQuestion]),
      vivaQuestionSetHandler(createTestVivaQuestionSet({ status: 'ready' })),
      submissionVivaHandler([]),
      vivaSessionHandler([activeSession]),
      http.get(`${SUPABASE_URL}/rest/v1/asked_questions`, () =>
        HttpResponse.json(askedQuestions),
      ),
      http.post(`${SUPABASE_URL}/rest/v1/asked_questions`, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>
        askedQuestions = [{ ...createdAskedQuestion, ...body }]
        return HttpResponse.json(askedQuestions, { status: 201 })
      }),
      http.get(`${SUPABASE_URL}/rest/v1/observations`, () =>
        HttpResponse.json(observations),
      ),
      http.post(`${SUPABASE_URL}/rest/v1/observations`, async ({ request }) => {
        observationRequestBody = (await request.json()) as Record<string, unknown>
        observations = [
          {
            asked_question_id: createdAskedQuestion.id,
            content: observationRequestBody.content as string,
            teacher_id: '20420000-0000-0000-0000-000000000000',
            created_at: '2026-07-12T09:10:00.000Z',
            updated_at: '2026-07-12T09:10:00.000Z',
          },
        ]
        return HttpResponse.json(observations, { status: 201 })
      }),
      http.get(`${SUPABASE_URL}/rest/v1/evidence_markers`, () =>
        HttpResponse.json(evidenceMarkers),
      ),
      http.post(`${SUPABASE_URL}/rest/v1/evidence_markers`, async ({ request }) => {
        evidenceMarkerRequestBody = (await request.json()) as Record<string, unknown>
        evidenceMarkers = [
          {
            asked_question_id: createdAskedQuestion.id,
            marker_type: evidenceMarkerRequestBody.marker_type as TestEvidenceMarker['marker_type'],
            teacher_id: '20420000-0000-0000-0000-000000000000',
            created_at: '2026-07-12T09:15:00.000Z',
            updated_at: '2026-07-12T09:15:00.000Z',
          },
        ]
        return HttpResponse.json(evidenceMarkers, { status: 201 })
      }),
    )

    const user = userEvent.setup()

    renderWithRouter(
      <SubmissionDetailPage />,
      '/submissions/30420000-0000-0000-0000-000000000000',
    )

    await user.click(await screen.findByRole('tab', { name: 'Viva Questions' }))

    expect(await screen.findByText('Viva Session in progress')).toBeInTheDocument()

    await user.click(await screen.findByRole('button', { name: 'Mark as asked' }))

    expect(
      await screen.findByRole('button', { name: plannedQuestion.question_text }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Clear understanding' }))

    await waitFor(() => {
      expect(evidenceMarkerRequestBody).toMatchObject({
        marker_type: 'clear_understanding',
      })
    })

    await user.type(
      screen.getByLabelText('Observation'),
      'Confident and well reasoned.',
    )

    await waitFor(
      () => {
        expect(observationRequestBody).toMatchObject({
          content: 'Confident and well reasoned.',
        })
      },
      { timeout: 3000 },
    )

    expect(await screen.findByText('Saved')).toBeInTheDocument()
  })

  it('links to Conduct mode once a Viva Session is active', async () => {
    generateSubmissionVivaSpy.mockReset()
    equipmentCheckSpy.mockReset()

    const activeSession = createTestVivaSession()

    server.use(
      ...submissionWithQuestionsHandlers(testSubmission, [
        createTestQuestion({ set_position: 0 }),
      ]),
      vivaQuestionSetHandler(createTestVivaQuestionSet({ status: 'ready' })),
      submissionVivaHandler([]),
      vivaSessionHandler([activeSession]),
    )

    const user = userEvent.setup()

    renderWithRouter(
      <SubmissionDetailPage />,
      '/submissions/30420000-0000-0000-0000-000000000000',
    )

    await user.click(await screen.findByRole('tab', { name: 'Viva Questions' }))

    const conductLink = await screen.findByRole('link', {
      name: 'Conduct Viva Session',
    })

    expect(conductLink).toHaveAttribute(
      'href',
      '/submissions/30420000-0000-0000-0000-000000000000/conduct',
    )
  })

  it('cancels the readiness checklist without starting a Viva Session', async () => {
    generateSubmissionVivaSpy.mockReset()
    equipmentCheckSpy.mockReset()
    equipmentCheckSpy.mockResolvedValue('passed')

    let postCount = 0

    server.use(
      ...submissionWithQuestionsHandlers(testSubmission, [
        createTestQuestion({ set_position: 0 }),
      ]),
      vivaQuestionSetHandler(createTestVivaQuestionSet({ status: 'ready' })),
      submissionVivaHandler([]),
      vivaSessionHandler([]),
      http.post(`${SUPABASE_URL}/rest/v1/viva_sessions`, () => {
        postCount += 1
        return HttpResponse.json([createTestVivaSession()], { status: 201 })
      }),
    )

    const user = userEvent.setup()

    renderWithRouter(
      <SubmissionDetailPage />,
      '/submissions/30420000-0000-0000-0000-000000000000',
    )

    await user.click(await screen.findByRole('tab', { name: 'Viva Questions' }))

    const studentConfirmedCheckbox = await screen.findByRole('checkbox', {
      name: /I've confirmed this is the correct student/,
    })
    await user.click(studentConfirmedCheckbox)
    await user.click(
      screen.getByRole('radio', { name: 'Consent given to record this viva' }),
    )

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(studentConfirmedCheckbox).not.toBeChecked()
    expect(
      screen.getByRole('radio', { name: 'Consent given to record this viva' }),
    ).not.toBeChecked()
    expect(postCount).toBe(0)
  })
})
