import { http, HttpResponse } from 'msw'
import {
  createTestSubmission,
  createTestUser,
  createTestVivaQuestionSet,
  type TestAskedQuestion,
  type TestEvidenceMarker,
  type TestObservation,
  type TestQuestion,
  type TestSubmission,
  type TestSubmissionViva,
  type TestUser,
  type TestVivaQuestionSet,
  type TestVivaSession,
} from './factories'

const SUPABASE_URL = 'https://example-project.supabase.co'

export function authenticatedUserHandler(user: TestUser | null = createTestUser()) {
  return http.get(`${SUPABASE_URL}/auth/v1/user`, () => {
    if (!user) {
      return HttpResponse.json({ message: 'Auth session missing!' }, { status: 401 })
    }

    return HttpResponse.json(user)
  })
}

export function submissionsListHandler(
  submissions: Array<
    TestSubmission & { vivaQuestionsCount?: number; submissionVivaCount?: number }
  > = [createTestSubmission()],
) {
  return http.get(`${SUPABASE_URL}/rest/v1/submissions`, () =>
    HttpResponse.json(
      submissions.map(
        ({ vivaQuestionsCount = 0, submissionVivaCount = 0, ...submission }) => ({
          ...submission,
          viva_questions: [{ count: vivaQuestionsCount }],
          submission_viva: [{ count: submissionVivaCount }],
        }),
      ),
    ),
  )
}

export function submissionWithQuestionsHandlers(
  submission: TestSubmission = createTestSubmission(),
  questions: TestQuestion[] = [],
) {
  return [
    http.get(`${SUPABASE_URL}/rest/v1/submissions`, () =>
      HttpResponse.json([submission]),
    ),
    http.get(`${SUPABASE_URL}/rest/v1/viva_questions`, () =>
      HttpResponse.json(questions),
    ),
  ]
}

export function submissionVivaHandler(records: TestSubmissionViva[] = []) {
  return http.get(`${SUPABASE_URL}/rest/v1/submission_viva`, () =>
    HttpResponse.json(records),
  )
}

export function vivaQuestionSetHandler(
  set: TestVivaQuestionSet | null = createTestVivaQuestionSet(),
) {
  return http.get(`${SUPABASE_URL}/rest/v1/viva_question_sets`, () =>
    HttpResponse.json(set ? [set] : []),
  )
}

export function vivaSessionHandler(sessions: TestVivaSession[] = []) {
  return http.get(`${SUPABASE_URL}/rest/v1/viva_sessions`, () =>
    HttpResponse.json(sessions),
  )
}

export function askedQuestionsHandler(records: TestAskedQuestion[] = []) {
  return http.get(`${SUPABASE_URL}/rest/v1/asked_questions`, () =>
    HttpResponse.json(records),
  )
}

export function askedQuestionInsertHandler(
  options: {
    id?: string
    onRequest?: (body: Record<string, unknown>) => void
  } = {},
) {
  const { id = '80420000-0000-0000-0000-000000000000', onRequest } = options

  return http.post(`${SUPABASE_URL}/rest/v1/asked_questions`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>
    onRequest?.(body)

    return HttpResponse.json(
      [{ id, asked_at: '2026-07-12T09:05:00.000Z', ...body }],
      { status: 201 },
    )
  })
}

export function observationsHandler(records: TestObservation[] = []) {
  return http.get(`${SUPABASE_URL}/rest/v1/observations`, () =>
    HttpResponse.json(records),
  )
}

export function observationUpsertHandler(
  options: {
    onRequest?: (body: Record<string, unknown>) => void
    status?: number
  } = {},
) {
  const { onRequest, status = 201 } = options

  return http.post(`${SUPABASE_URL}/rest/v1/observations`, async ({ request }) => {
    if (status !== 201) {
      return HttpResponse.json({ message: 'Request failed' }, { status })
    }

    const body = (await request.json()) as Record<string, unknown>
    onRequest?.(body)

    return HttpResponse.json(
      [{ created_at: '2026-07-12T09:10:00.000Z', ...body }],
      { status },
    )
  })
}

export function evidenceMarkersHandler(records: TestEvidenceMarker[] = []) {
  return http.get(`${SUPABASE_URL}/rest/v1/evidence_markers`, () =>
    HttpResponse.json(records),
  )
}

export function evidenceMarkerUpsertHandler(
  options: { onRequest?: (body: Record<string, unknown>) => void } = {},
) {
  const { onRequest } = options

  return http.post(`${SUPABASE_URL}/rest/v1/evidence_markers`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>
    onRequest?.(body)

    return HttpResponse.json(
      [{ created_at: '2026-07-12T09:15:00.000Z', ...body }],
      { status: 201 },
    )
  })
}

export function submissionCreateHandler(
  options: {
    id?: string
    onRequest?: (body: Record<string, unknown>) => void
  } = {},
) {
  const { id = '30420000-0000-0000-0000-000000000000', onRequest } = options

  return http.post(`${SUPABASE_URL}/rest/v1/submissions`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>
    onRequest?.(body)

    return HttpResponse.json({ id, ...body }, { status: 201 })
  })
}

export function storageUploadHandler(bucket = 'submission-viva-audio') {
  return http.post(`${SUPABASE_URL}/storage/v1/object/${bucket}/*`, () =>
    HttpResponse.json({ Key: `${bucket}/test.webm` }),
  )
}

export function signedUrlHandler(
  options: {
    bucket?: string
    errorBody?: Record<string, unknown>
    status?: number
    token?: string
  } = {},
) {
  const {
    bucket = 'submission-viva-audio',
    errorBody,
    status = 200,
    token = 'test-signed-token',
  } = options

  return http.post(`${SUPABASE_URL}/storage/v1/object/sign/${bucket}/*`, ({ request }) => {
    if (status !== 200) {
      return HttpResponse.json(
        errorBody ?? { error: 'Error', message: 'Request failed', statusCode: String(status) },
        { status },
      )
    }

    const path = new URL(request.url).pathname.replace(
      `/storage/v1/object/sign/${bucket}/`,
      '',
    )

    return HttpResponse.json({
      signedURL: `/object/sign/${bucket}/${path}?token=${token}`,
    })
  })
}

// Baseline "logged in with some data" state; tests override specific endpoints via server.use(...).
export const defaultHandlers = [
  authenticatedUserHandler(),
  submissionsListHandler(),
  storageUploadHandler(),
  signedUrlHandler(),
  vivaQuestionSetHandler(),
  vivaSessionHandler(),
  askedQuestionsHandler(),
  observationsHandler(),
  evidenceMarkersHandler(),
]
