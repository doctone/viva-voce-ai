export type TestSubmission = {
  id: string
  student_id: string
  submission_title: string
  submission_text: string
  created_at: string
}

export function createTestSubmission(
  overrides: Partial<TestSubmission> = {},
): TestSubmission {
  return {
    id: '30420000-0000-0000-0000-000000000000',
    student_id: '10420000-0000-0000-0000-000000000000',
    submission_title: 'Modernist Poetry Oral Defence',
    submission_text:
      'Technology can support learning, but students still need to explain and justify their own ideas.',
    created_at: '2026-03-12T09:00:00.000Z',
    ...overrides,
  }
}

export type TestQuestionCategory =
  | 'comprehension_and_accuracy'
  | 'argumentation_and_reasoning'
  | 'authenticity_and_ownership'

export type TestQuestion = {
  id: string
  submission_id: string
  category: TestQuestionCategory
  question_text: string
  teacher_note: string
  is_recommended: boolean
  sort_order: number
  created_at: string
}

export function createTestQuestion(
  overrides: Partial<TestQuestion> = {},
): TestQuestion {
  return {
    id: '40420000-0000-0000-0000-000000000000',
    submission_id: '30420000-0000-0000-0000-000000000000',
    category: 'comprehension_and_accuracy',
    question_text: 'Why does the response describe Lord Mansfield as pivotal?',
    teacher_note:
      'Listen for understanding of legal reform and why it mattered.',
    is_recommended: true,
    sort_order: 1,
    created_at: '2026-04-30T20:05:00.000Z',
    ...overrides,
  }
}

export type TestUser = {
  id: string
  aud: string
  role: string
  email: string
  created_at: string
}

export function createTestUser(overrides: Partial<TestUser> = {}): TestUser {
  return {
    id: '20420000-0000-0000-0000-000000000000',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'teacher@example.com',
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

export type TestSubmissionViva = {
  id: string
  submission_id: string
  audio_path: string
  file_name: string
  created_at: string
}

export function createTestSubmissionViva(
  overrides: Partial<TestSubmissionViva> = {},
): TestSubmissionViva {
  return {
    id: '50420000-0000-0000-0000-000000000000',
    submission_id: '30420000-0000-0000-0000-000000000000',
    audio_path: '30420000-0000-0000-0000-000000000000/test.webm',
    file_name: 'test.webm',
    created_at: '2026-04-30T20:10:00.000Z',
    ...overrides,
  }
}
