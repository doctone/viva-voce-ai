import { http, HttpResponse } from 'msw'
import {
  createTestSubmission,
  createTestUser,
  type TestQuestion,
  type TestSubmission,
  type TestSubmissionViva,
  type TestUser,
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
  submissions: TestSubmission[] = [createTestSubmission()],
) {
  return http.get(`${SUPABASE_URL}/rest/v1/submissions`, () =>
    HttpResponse.json(submissions),
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

// Baseline "logged in with some data" state; tests override specific endpoints via server.use(...).
export const defaultHandlers = [
  authenticatedUserHandler(),
  submissionsListHandler(),
  storageUploadHandler(),
]
