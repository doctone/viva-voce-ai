import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ConductVivaSessionPage } from './submissions.$submissionId.conduct'
import {
  createTestQuestion,
  createTestSubmission,
  createTestVivaQuestionSet,
  createTestVivaSession,
} from '../../test/factories'
import {
  askedQuestionsHandler,
  submissionWithQuestionsHandlers,
  vivaQuestionSetHandler,
  vivaSessionHandler,
} from '../../test/handlers'
import { renderWithRouter } from '../../test/router'
import { server } from '../../test/server'

const SUPABASE_URL = 'https://example-project.supabase.co'

const testSubmission = createTestSubmission()

const captureSpies = {
  retryFailedChunks: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  togglePause: vi.fn(),
}

let captureState: { failedChunkCount: number; status: string } = {
  failedChunkCount: 0,
  status: 'idle',
}

vi.mock('../../features/submissions/useVivaAudioCapture', () => ({
  useVivaAudioCapture: () => ({
    ...captureSpies,
    failedChunkCount: captureState.failedChunkCount,
    status: captureState.status,
  }),
}))

function renderConductPage(
  submissionId = '30420000-0000-0000-0000-000000000000',
) {
  return renderWithRouter(
    <ConductVivaSessionPage />,
    `/submissions/${submissionId}/conduct`,
  )
}

const questionOne = createTestQuestion({
  id: 'question-1',
  question_text: 'Why does the response describe Lord Mansfield as pivotal?',
  set_position: 0,
  teacher_note: 'Listen for understanding of legal reform.',
})
const questionTwo = createTestQuestion({
  id: 'question-2',
  question_text: 'How does the argument address counter-evidence?',
  set_position: 1,
  teacher_note: 'Look for engagement with opposing views.',
})

describe('ConductVivaSessionPage', () => {
  beforeEach(() => {
    captureState = { failedChunkCount: 0, status: 'idle' }
    captureSpies.retryFailedChunks.mockReset()
    captureSpies.start.mockReset()
    captureSpies.stop.mockReset()
    captureSpies.togglePause.mockReset()
  })

  it('shows a message and creates no Viva Session when none is active', async () => {
    let sessionPostCount = 0

    server.use(
      ...submissionWithQuestionsHandlers(testSubmission, [questionOne]),
      vivaQuestionSetHandler(createTestVivaQuestionSet({ status: 'ready' })),
      vivaSessionHandler([]),
      http.post(`${SUPABASE_URL}/rest/v1/viva_sessions`, () => {
        sessionPostCount += 1
        return HttpResponse.json([createTestVivaSession()], { status: 201 })
      }),
    )

    renderConductPage()

    expect(
      await screen.findByText('No active Viva Session'),
    ).toBeInTheDocument()
    expect(sessionPostCount).toBe(0)
  })

  it('presents the current question, private teacher note, progress, and recording state', async () => {
    const activeSession = createTestVivaSession()

    server.use(
      ...submissionWithQuestionsHandlers(testSubmission, [
        questionOne,
        questionTwo,
      ]),
      vivaQuestionSetHandler(createTestVivaQuestionSet({ status: 'ready' })),
      vivaSessionHandler([activeSession]),
      askedQuestionsHandler([]),
    )

    renderConductPage()

    expect(
      await screen.findByText(questionOne.question_text),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Listen for understanding of legal reform\./),
    ).toBeInTheDocument()
    expect(screen.getByText('Question 1 of 2')).toBeInTheDocument()
    expect(screen.getByText('Not recording')).toBeInTheDocument()
  })

  it('navigates between questions without going out of bounds', async () => {
    const activeSession = createTestVivaSession()

    server.use(
      ...submissionWithQuestionsHandlers(testSubmission, [
        questionOne,
        questionTwo,
      ]),
      vivaQuestionSetHandler(createTestVivaQuestionSet({ status: 'ready' })),
      vivaSessionHandler([activeSession]),
      askedQuestionsHandler([]),
    )

    const user = userEvent.setup()
    renderConductPage()

    await screen.findByText(questionOne.question_text)
    expect(
      screen.getByRole('button', { name: 'Previous question' }),
    ).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Next question' }))

    expect(
      await screen.findByText(questionTwo.question_text),
    ).toBeInTheDocument()
    expect(screen.getByText('Question 2 of 2')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Next question' }),
    ).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Previous question' }))

    expect(
      await screen.findByText(questionOne.question_text),
    ).toBeInTheDocument()
  })

  it('marks the current planned question as asked', async () => {
    const activeSession = createTestVivaSession()
    let askedQuestions: Array<Record<string, unknown>> = []

    server.use(
      ...submissionWithQuestionsHandlers(testSubmission, [questionOne]),
      vivaQuestionSetHandler(createTestVivaQuestionSet({ status: 'ready' })),
      vivaSessionHandler([activeSession]),
      http.get(`${SUPABASE_URL}/rest/v1/asked_questions`, () =>
        HttpResponse.json(askedQuestions),
      ),
      http.post(`${SUPABASE_URL}/rest/v1/asked_questions`, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>
        askedQuestions = [
          { asked_at: '2026-07-15T09:05:00.000Z', id: 'asked-1', ...body },
        ]
        return HttpResponse.json(askedQuestions, { status: 201 })
      }),
    )

    const user = userEvent.setup()
    renderConductPage()

    await user.click(
      await screen.findByRole('button', { name: 'Mark as asked' }),
    )

    await waitFor(() => {
      expect(askedQuestions).toMatchObject([
        { viva_question_id: questionOne.id },
      ])
    })
    expect(await screen.findByText('Asked')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Mark as asked' }),
    ).not.toBeInTheDocument()
  })

  it('records an unplanned follow-up question', async () => {
    const activeSession = createTestVivaSession()
    let insertedBody: Record<string, unknown> | null = null

    server.use(
      ...submissionWithQuestionsHandlers(testSubmission, [questionOne]),
      vivaQuestionSetHandler(createTestVivaQuestionSet({ status: 'ready' })),
      vivaSessionHandler([activeSession]),
      askedQuestionsHandler([]),
      http.post(`${SUPABASE_URL}/rest/v1/asked_questions`, async ({ request }) => {
        insertedBody = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(
          [{ asked_at: '2026-07-15T09:05:00.000Z', id: 'asked-2', ...insertedBody }],
          { status: 201 },
        )
      }),
    )

    const user = userEvent.setup()
    renderConductPage()

    await screen.findByText(questionOne.question_text)

    await user.type(
      screen.getByLabelText('Unplanned follow-up question'),
      'What about the counter-argument?',
    )
    await user.click(
      screen.getByRole('button', { name: 'Record follow-up as asked' }),
    )

    await waitFor(() => {
      expect(insertedBody).toMatchObject({
        question_text: 'What about the counter-argument?',
        viva_question_id: null,
      })
    })
  })

  it('offers a retry action when a recording chunk fails to upload', async () => {
    captureState = { failedChunkCount: 2, status: 'recording' }
    const activeSession = createTestVivaSession()

    server.use(
      ...submissionWithQuestionsHandlers(testSubmission, [questionOne]),
      vivaQuestionSetHandler(createTestVivaQuestionSet({ status: 'ready' })),
      vivaSessionHandler([activeSession]),
      askedQuestionsHandler([]),
    )

    const user = userEvent.setup()
    renderConductPage()

    expect(
      await screen.findByText('2 recording chunks failed to upload.'),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Retry upload' }))

    expect(captureSpies.retryFailedChunks).toHaveBeenCalledTimes(1)
  })

  it('shows a microphone-denied message and lets the teacher try again', async () => {
    captureState = { failedChunkCount: 0, status: 'permission_denied' }
    const activeSession = createTestVivaSession()

    server.use(
      ...submissionWithQuestionsHandlers(testSubmission, [questionOne]),
      vivaQuestionSetHandler(createTestVivaQuestionSet({ status: 'ready' })),
      vivaSessionHandler([activeSession]),
      askedQuestionsHandler([]),
    )

    const user = userEvent.setup()
    renderConductPage()

    expect(
      await screen.findByText(/We couldn't access the microphone\./),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(captureSpies.start).toHaveBeenCalledTimes(1)
  })

  it('pauses and resumes recording', async () => {
    captureState = { failedChunkCount: 0, status: 'recording' }
    const activeSession = createTestVivaSession()

    server.use(
      ...submissionWithQuestionsHandlers(testSubmission, [questionOne]),
      vivaQuestionSetHandler(createTestVivaQuestionSet({ status: 'ready' })),
      vivaSessionHandler([activeSession]),
      askedQuestionsHandler([]),
    )

    const user = userEvent.setup()
    renderConductPage()

    await user.click(
      await screen.findByRole('button', { name: 'Pause recording' }),
    )

    expect(captureSpies.togglePause).toHaveBeenCalledTimes(1)
  })
})
