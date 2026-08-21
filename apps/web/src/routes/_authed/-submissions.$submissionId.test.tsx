import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SubmissionDetailPage } from './submissions.$submissionId'
import {
  createTestQuestion,
  createTestSubmission,
  createTestSubmissionViva,
} from '../../test/factories'
import {
  signedUrlHandler,
  storageUploadHandler,
  submissionVivaHandler,
  submissionWithQuestionsHandlers,
  vivaQuestionSetHandler,
  vivaSessionHandler,
} from '../../test/handlers'
import {
  createTestVivaQuestionSet,
  createTestVivaSession,
} from '../../test/factories'
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


const SUPABASE_REST = 'https://example-project.supabase.co/rest/v1'

type FakeRecorderInstance = {
  emitChunk: (data: Blob) => void
  state: string
}

/**
 * jsdom has neither getUserMedia nor MediaRecorder, so a viva can only be
 * recorded in a test if both are stood up. The fake emits timeslices on demand
 * rather than on a timer, so a test can say "15 seconds passed" in one line.
 */
function installFakeRecorder({ permission = 'granted' as 'granted' | 'denied' } = {}) {
  const instances: FakeRecorderInstance[] = []
  const stoppedTracks: string[] = []

  class FakeMediaRecorder {
    static isTypeSupported = (mimeType: string) => mimeType === 'audio/webm;codecs=opus'

    state = 'inactive'
    private dataListeners: Array<(event: { data: Blob }) => void> = []
    private stopListeners: Array<() => void> = []

    constructor(_stream: MediaStream, _options: { mimeType: string }) {
      instances.push({
        emitChunk: (data: Blob) => {
          for (const listener of this.dataListeners) {
            listener({ data })
          }
        },
        state: this.state,
      })
    }

    addEventListener(
      type: string,
      listener: ((event: { data: Blob }) => void) & (() => void),
    ) {
      if (type === 'stop') {
        this.stopListeners.push(listener)
        return
      }

      this.dataListeners.push(listener)
    }

    start() {
      this.state = 'recording'
    }

    pause() {
      this.state = 'paused'
    }

    resume() {
      this.state = 'recording'
    }

    stop() {
      this.state = 'inactive'

      // The real recorder flushes whatever it is holding and only then fires
      // `stop`. A take shorter than one timeslice arrives entirely this way.
      for (const listener of this.dataListeners) {
        listener({ data: new Blob(['final-flush']) })
      }

      for (const listener of this.stopListeners) {
        listener()
      }
    }
  }

  vi.stubGlobal('MediaRecorder', FakeMediaRecorder)
  vi.stubGlobal('navigator', {
    ...navigator,
    mediaDevices: {
      getUserMedia: async () => {
        if (permission === 'denied') {
          throw new Error('Permission denied')
        }

        return {
          getTracks: () => [
            {
              stop: () => {
                stoppedTracks.push('audio')
              },
            },
          ],
        } as unknown as MediaStream
      },
    },
  })

  return { instances, stoppedTracks }
}

function recordingHandlers({
  existingRecordings = [] as Array<{ audio_path: string; id: string }>,
} = {}) {
  const createdSessions: Array<Record<string, unknown>> = []
  const uploadedChunks: Array<Record<string, unknown>> = []
  const savedRecordings: Array<Record<string, unknown>> = []
  const deletedRecordingRequests: string[] = []
  const removedStoragePaths: string[] = []

  return {
    createdSessions,
    deletedRecordingRequests,
    removedStoragePaths,
    savedRecordings,
    uploadedChunks,
    handlers: [
      vivaQuestionSetHandler(createTestVivaQuestionSet()),
      vivaSessionHandler([]),
      http.post(`${SUPABASE_REST}/viva_sessions`, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>
        createdSessions.push(body)

        return HttpResponse.json([
          {
            accessibility_adjustments: '',
            consent_declined_reason: null,
            consent_state: body.consent_state,
            equipment_check_result: body.equipment_check_result,
            expected_duration_minutes: body.expected_duration_minutes,
            id: '70420000-0000-0000-0000-000000000000',
            started_at: '2026-08-19T09:00:00.000Z',
            status: 'active',
            submission_id: body.submission_id,
            viva_question_set_id: body.viva_question_set_id,
          },
        ])
      }),
      http.post(`${SUPABASE_REST}/viva_recording_chunks`, async ({ request }) => {
        uploadedChunks.push((await request.json()) as Record<string, unknown>)

        return HttpResponse.json({}, { status: 201 })
      }),
      http.get(`${SUPABASE_REST}/viva_transcript_segments`, () =>
        HttpResponse.json([]),
      ),
      http.post(`${SUPABASE_REST}/submission_viva`, async ({ request }) => {
        savedRecordings.push((await request.json()) as Record<string, unknown>)

        return HttpResponse.json(
          [{ audio_path: 'submission/new.webm', id: 'saved-recording' }],
          { status: 201 },
        )
      }),
      http.get(`${SUPABASE_REST}/submission_viva`, () =>
        HttpResponse.json([
          ...existingRecordings,
          { audio_path: 'submission/new.webm', id: 'saved-recording' },
        ]),
      ),
      http.delete(`${SUPABASE_REST}/submission_viva`, ({ request }) => {
        deletedRecordingRequests.push(new URL(request.url).search)

        return HttpResponse.json([], { status: 204 })
      }),
      http.delete(
        'https://example-project.supabase.co/storage/v1/object/submission-viva-audio',
        async ({ request }) => {
          const body = (await request.json()) as { prefixes: string[] }
          removedStoragePaths.push(...body.prefixes)

          return HttpResponse.json([])
        },
      ),
      storageUploadHandler(),
    ],
  }
}

describe('SubmissionDetailPage', () => {
  beforeEach(() => {
    // The page records that it has already tried to generate for a submission,
    // so a refresh mid-generation cannot start a second run. Tests share one
    // submission id, so that record has to be cleared between them.
    window.sessionStorage.clear()
  })

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

    // The page opens on the work, not on the reading view: the questions are
    // what a teacher came here to act on.
    expect(
      await screen.findByText('Why does the response describe Lord Mansfield as pivotal?'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Mercantile law response' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Record viva' }),
    ).toBeInTheDocument()
  })

  it('leads with the record call to action and shows the full submission below it', async () => {
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

    renderWithRouter(
      <SubmissionDetailPage />,
      '/submissions/30420000-0000-0000-0000-000000000000',
    )

    // Every part of the page is on screen at once: no tab hides the reading
    // view behind the questions.
    expect(
      await screen.findByRole('button', { name: 'Record viva' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Body paragraph one.')).toBeInTheDocument()
    expect(screen.getByText('Body paragraph two.')).toBeInTheDocument()
    expect(
      screen.getByText('Why does the response describe Lord Mansfield as pivotal?'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
  })


  it('creates a viva session and uploads audio once recording starts', async () => {
    generateSubmissionVivaSpy.mockReset()
    const recorder = installFakeRecorder()
    const recording = recordingHandlers()

    server.use(
      ...submissionWithQuestionsHandlers(testSubmission, [createTestQuestion()]),
      submissionVivaHandler([]),
      ...recording.handlers,
    )

    const user = userEvent.setup()

    renderWithRouter(
      <SubmissionDetailPage />,
      '/submissions/30420000-0000-0000-0000-000000000000',
    )

    await user.click(await screen.findByRole('button', { name: 'Record viva' }))

    expect(await screen.findByRole('button', { name: 'Stop Recording' })).toBeInTheDocument()
    expect(screen.getByText('Recording', { selector: '[role="status"]' })).toBeInTheDocument()

    // The session is only created once the microphone is actually available.
    await waitFor(() => expect(recording.createdSessions).toHaveLength(1))
    expect(recording.createdSessions[0]).toMatchObject({
      consent_state: 'consent_given',
      equipment_check_result: 'passed',
    })

    await act(async () => {
      recorder.instances[0].emitChunk(new Blob(['first-15-seconds']))
    })

    await waitFor(() => expect(recording.uploadedChunks).toHaveLength(1))
    expect(recording.uploadedChunks[0]).toMatchObject({ sequence: 0 })
  })

  it('saves a playable recording against the submission when the teacher stops', async () => {
    generateSubmissionVivaSpy.mockReset()
    const recorder = installFakeRecorder()
    const recording = recordingHandlers()

    server.use(
      ...submissionWithQuestionsHandlers(testSubmission, [createTestQuestion()]),
      submissionVivaHandler([]),
      ...recording.handlers,
    )

    const user = userEvent.setup()

    renderWithRouter(
      <SubmissionDetailPage />,
      '/submissions/30420000-0000-0000-0000-000000000000',
    )

    await user.click(await screen.findByRole('button', { name: 'Record viva' }))
    await screen.findByRole('button', { name: 'Stop Recording' })

    await act(async () => {
      recorder.instances[0].emitChunk(new Blob(['first-15-seconds']))
    })

    await user.click(screen.getByRole('button', { name: 'Stop Recording' }))

    await waitFor(() => expect(recording.savedRecordings).toHaveLength(1))
    expect(recording.savedRecordings[0]).toMatchObject({
      submission_id: '30420000-0000-0000-0000-000000000000',
    })
    expect(recorder.stoppedTracks).toEqual(['audio'])
  })


  it('replaces the previous recording so a submission keeps only the latest', async () => {
    generateSubmissionVivaSpy.mockReset()
    const recorder = installFakeRecorder()
    const recording = recordingHandlers({
      existingRecordings: [
        { audio_path: 'submission/earlier-take.webm', id: 'earlier-recording' },
      ],
    })

    server.use(
      ...submissionWithQuestionsHandlers(testSubmission, [createTestQuestion()]),
      ...recording.handlers,
    )

    const user = userEvent.setup()

    renderWithRouter(
      <SubmissionDetailPage />,
      '/submissions/30420000-0000-0000-0000-000000000000',
    )

    await user.click(await screen.findByRole('button', { name: 'Record viva' }))
    await screen.findByRole('button', { name: 'Stop Recording' })
    await user.click(screen.getByRole('button', { name: 'Stop Recording' }))

    // The earlier take goes only once the new one is durable.
    await waitFor(() =>
      expect(recording.removedStoragePaths).toEqual([
        'submission/earlier-take.webm',
      ]),
    )
    expect(recording.deletedRecordingRequests).toHaveLength(1)
    expect(recording.deletedRecordingRequests[0]).toContain('earlier-recording')
    expect(recording.savedRecordings).toHaveLength(1)
  })


  it('explains how to recover when the microphone is refused', async () => {
    generateSubmissionVivaSpy.mockReset()
    installFakeRecorder({ permission: 'denied' })
    const recording = recordingHandlers()

    server.use(
      ...submissionWithQuestionsHandlers(testSubmission, [createTestQuestion()]),
      submissionVivaHandler([]),
      ...recording.handlers,
    )

    const user = userEvent.setup()

    renderWithRouter(
      <SubmissionDetailPage />,
      '/submissions/30420000-0000-0000-0000-000000000000',
    )

    await user.click(await screen.findByRole('button', { name: 'Record viva' }))

    expect(
      await screen.findByText(
        'We could not reach the microphone. Allow microphone access in your browser, then try again.',
      ),
    ).toBeInTheDocument()
    // A refused prompt must not leave a Viva Session behind.
    expect(recording.createdSessions).toEqual([])
    expect(screen.getByRole('button', { name: 'Record viva' })).toBeInTheDocument()
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
      screen.getByText(/We are reading/),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/This usually takes a few seconds/),
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

  it('shows the stored transcript on a fresh visit, without a recording being started', async () => {
    generateSubmissionVivaSpy.mockReset()

    // Nothing in this page life starts a recording, so the only way to the
    // transcript is looking the submission's session up from the database —
    // which is what navigating back from the submissions table does.
    server.use(
      ...submissionWithQuestionsHandlers(testSubmission, [
        createTestQuestion({ sort_order: 1 }),
      ]),
      submissionVivaHandler([
        createTestSubmissionViva({ file_name: 'viva.webm' }),
      ]),
      vivaQuestionSetHandler(),
      vivaSessionHandler([createTestVivaSession({ status: 'ended' })]),
      http.get(`${SUPABASE_REST}/viva_transcript_segments`, () =>
        HttpResponse.json([
          { sequence: 1, text: 'and that is why I chose that opening line.' },
          { sequence: 0, text: 'I wanted to start with the storm' },
        ]),
      ),
      signedUrlHandler(),
    )

    renderWithRouter(
      <SubmissionDetailPage />,
      '/submissions/30420000-0000-0000-0000-000000000000',
    )

    expect(
      await screen.findByText(
        /I wanted to start with the storm and that is why I chose that opening line\./,
      ),
    ).toBeInTheDocument()
  })

  it('keeps waiting when a reload interrupts a generation run, then shows the questions', async () => {
    generateSubmissionVivaSpy.mockReset()

    // A reload abandons the client promise, but the server keeps writing. The
    // page has to recover by polling rather than claiming the run produced
    // nothing — and it must not start a duplicate run.
    window.sessionStorage.setItem(
      'viva-generation:30420000-0000-0000-0000-000000000000',
      JSON.stringify({ startedAt: Date.now(), status: 'running' }),
    )

    let questionRequestCount = 0

    server.use(
      http.get(`${SUPABASE_REST}/submissions`, () =>
        HttpResponse.json([createTestSubmission({ submission_text: 'Body text.' })]),
      ),
      http.get(`${SUPABASE_REST}/viva_questions`, () => {
        questionRequestCount += 1

        return HttpResponse.json(
          questionRequestCount > 1
            ? [
                createTestQuestion({
                  category: 'comprehension_and_accuracy',
                  question_text: 'Why does the response describe Lord Mansfield as pivotal?',
                  sort_order: 1,
                }),
              ]
            : [],
        )
      }),
      submissionVivaHandler([]),
      vivaQuestionSetHandler(null),
    )

    renderWithRouter(
      <SubmissionDetailPage />,
      '/submissions/30420000-0000-0000-0000-000000000000',
    )

    expect(
      await screen.findByRole('heading', { name: 'Preparing viva questions' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Viva questions unavailable' }),
    ).not.toBeInTheDocument()

    expect(
      await screen.findByText(
        'Why does the response describe Lord Mansfield as pivotal?',
        undefined,
        { timeout: 5000 },
      ),
    ).toBeInTheDocument()

    expect(generateSubmissionVivaSpy).not.toHaveBeenCalled()
  })

  it('reports a finished run that produced no questions', async () => {
    generateSubmissionVivaSpy.mockReset()

    window.sessionStorage.setItem(
      'viva-generation:30420000-0000-0000-0000-000000000000',
      JSON.stringify({ status: 'completed' }),
    )

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
    expect(generateSubmissionVivaSpy).not.toHaveBeenCalled()
  })

  it('restores the recorded error when a reload follows a failed run', async () => {
    generateSubmissionVivaSpy.mockReset()

    window.sessionStorage.setItem(
      'viva-generation:30420000-0000-0000-0000-000000000000',
      JSON.stringify({
        errorMessage: 'Expected exactly 3 recommended questions in comprehension_and_accuracy.',
        status: 'failed',
      }),
    )

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
      screen.getByText(
        'Expected exactly 3 recommended questions in comprehension_and_accuracy.',
      ),
    ).toBeInTheDocument()
    expect(generateSubmissionVivaSpy).not.toHaveBeenCalled()
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

    expect(
      await screen.findByText('Why does the response describe Lord Mansfield as pivotal?'),
    ).toBeInTheDocument()
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

    const recommendedCard = (
      await screen.findByText('Recommended question')
    ).closest('article')
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

    expect(
      await screen.findByText('Question about a short submission'),
    ).toBeInTheDocument()
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
