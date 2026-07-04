import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  generateSubmissionVivaAnalysis,
  type StoredSubmissionQuestion,
  type StructuredVivaQuestions,
  type SubmissionForGeneration,
  type SubmissionVivaGenerationRepository,
} from './generateSubmissionViva'

const generateObjectMock = vi.fn()

vi.mock('ai', () => ({
  generateObject: (...args: unknown[]) => generateObjectMock(...args),
}))

vi.mock('@ai-sdk/openai', () => ({
  openai: (modelName: string) => ({ modelName }),
}))

const submission: SubmissionForGeneration = {
  id: '30420000-0000-0000-0000-000000000000',
  submissionText:
    'Technology can support learning, but students still need to explain and justify their own ideas.',
  title: 'Technology in schools',
}

const structuredAnalysis: StructuredVivaQuestions = {
  questions: {
    authenticityAndOwnership: [
      {
        question:
          'Which sentence best shows your own view, and why did you phrase it that way?',
        recommendedForLimitedTime: true,
        teacherNote:
          'Listen for clear ownership of sentence choices and tone.',
      },
      {
        question:
          'What change did you make while drafting that improved the piece most?',
        recommendedForLimitedTime: true,
        teacherNote:
          'Listen for a specific drafting decision and its effect.',
      },
      {
        question:
          'Which word in your response was hardest to choose, and why?',
        recommendedForLimitedTime: true,
        teacherNote:
          'Listen for precise vocabulary reasoning tied to the written response.',
      },
      {
        question:
          'If you rewrote one sentence, which would it be and what would you change?',
        recommendedForLimitedTime: false,
        teacherNote:
          'Listen for reflection on clarity, emphasis, or control.',
      },
    ],
    argumentationAndReasoning: [
      {
        question:
          'Why do you think balance matters more than simply adding more devices to lessons?',
        recommendedForLimitedTime: true,
        teacherNote:
          'Listen for a justified line of reasoning rather than a repeated opinion.',
      },
      {
        question:
          'Which example in your writing gives the strongest support for your argument, and why?',
        recommendedForLimitedTime: true,
        teacherNote:
          'Listen for evaluation of evidence rather than summary.',
      },
      {
        question:
          'How would you respond to someone who says technology always saves time for deeper learning?',
        recommendedForLimitedTime: true,
        teacherNote:
          'Listen for engagement with challenge and complexity.',
      },
      {
        question:
          'What is the difference between access to information and genuine understanding in your argument?',
        recommendedForLimitedTime: false,
        teacherNote:
          'Listen for a sharp explanation of the contrast the student introduces.',
      },
    ],
    comprehensionAndAccuracy: [
      {
        question:
          'What do you mean by saying technology can create an illusion of understanding?',
        recommendedForLimitedTime: true,
        teacherNote:
          'Listen for accurate explanation of the phrase from the student response.',
      },
      {
        question:
          'Which part of your response best explains why sustained attention matters?',
        recommendedForLimitedTime: true,
        teacherNote:
          'Listen for secure understanding of the student’s own explanation.',
      },
      {
        question:
          'What classroom example would best illustrate your point about distraction?',
        recommendedForLimitedTime: true,
        teacherNote:
          'Listen for a concrete example that matches the claim in the writing.',
      },
      {
        question:
          'Why did you include the point about technology supporting creativity?',
        recommendedForLimitedTime: false,
        teacherNote:
          'Listen for understanding of the counterpoint and its purpose.',
      },
    ],
  },
}

function createRepository() {
  return {
    getSubmission: vi.fn().mockResolvedValue(submission),
    replaceQuestions: vi.fn().mockResolvedValue(undefined),
  } satisfies SubmissionVivaGenerationRepository
}

describe('generateSubmissionVivaAnalysis', () => {
  beforeEach(() => {
    generateObjectMock.mockReset()
  })

  it('replaces all viva questions for the submission', async () => {
    const repository = createRepository()
    const generateStructuredViva = vi.fn().mockResolvedValue(structuredAnalysis)

    const result = await generateSubmissionVivaAnalysis({
      generateStructuredViva,
      repository,
      submissionId: submission.id,
    })

    expect(result).toEqual({
      status: 'completed',
      submissionId: submission.id,
    })
    expect(generateStructuredViva).toHaveBeenCalledWith(submission)
    expect(repository.replaceQuestions).toHaveBeenCalledWith(
      submission.id,
      expect.arrayContaining<StoredSubmissionQuestion>([
        expect.objectContaining({
          category: 'comprehension_and_accuracy',
          isRecommended: true,
          sortOrder: 1,
          teacherNote:
            'Listen for accurate explanation of the phrase from the student response.',
        }),
        expect.objectContaining({
          category: 'argumentation_and_reasoning',
          isRecommended: true,
          sortOrder: 5,
        }),
        expect.objectContaining({
          category: 'authenticity_and_ownership',
          isRecommended: false,
          sortOrder: 12,
        }),
      ]),
    )
  })

  it('stores a failed analysis when the structured output is incomplete', async () => {
    const repository = createRepository()
    const generateStructuredViva = vi.fn().mockResolvedValue({
      ...structuredAnalysis,
      questions: {
        ...structuredAnalysis.questions,
        comprehensionAndAccuracy:
          structuredAnalysis.questions.comprehensionAndAccuracy.map(
            (question, index) => ({
              ...question,
              recommendedForLimitedTime: index < 2,
            }),
          ),
      },
    })

    const result = await generateSubmissionVivaAnalysis({
      generateStructuredViva,
      repository,
      submissionId: submission.id,
    })

    expect(result).toEqual({
      errorMessage:
        'Expected exactly 3 recommended questions in comprehension_and_accuracy.',
      status: 'failed',
      submissionId: submission.id,
    })
    expect(repository.replaceQuestions).not.toHaveBeenCalled()
  })

  it('stores a failed analysis when a category has too many recommended questions', async () => {
    const repository = createRepository()
    const generateStructuredViva = vi.fn().mockResolvedValue({
      ...structuredAnalysis,
      questions: {
        ...structuredAnalysis.questions,
        comprehensionAndAccuracy:
          structuredAnalysis.questions.comprehensionAndAccuracy.map(
            (question) => ({
              ...question,
              recommendedForLimitedTime: true,
            }),
          ),
      },
    })

    const result = await generateSubmissionVivaAnalysis({
      generateStructuredViva,
      repository,
      submissionId: submission.id,
    })

    expect(result).toEqual({
      errorMessage:
        'Expected exactly 3 recommended questions in comprehension_and_accuracy.',
      status: 'failed',
      submissionId: submission.id,
    })
    expect(repository.replaceQuestions).not.toHaveBeenCalled()
  })

  it('maps every category to its stored category and preserves question text verbatim', async () => {
    const repository = createRepository()
    const generateStructuredViva = vi.fn().mockResolvedValue(structuredAnalysis)

    await generateSubmissionVivaAnalysis({
      generateStructuredViva,
      repository,
      submissionId: submission.id,
    })

    const storedQuestions = repository.replaceQuestions.mock
      .calls[0][1] as StoredSubmissionQuestion[]

    const byCategory = (
      category: StoredSubmissionQuestion['category'],
    ) => storedQuestions.filter((question) => question.category === category)

    expect(byCategory('comprehension_and_accuracy')).toHaveLength(4)
    expect(byCategory('argumentation_and_reasoning')).toHaveLength(4)
    expect(byCategory('authenticity_and_ownership')).toHaveLength(4)

    expect(
      byCategory('comprehension_and_accuracy').map(
        (question) => question.questionText,
      ),
    ).toEqual(
      structuredAnalysis.questions.comprehensionAndAccuracy.map(
        (question) => question.question,
      ),
    )

    for (const category of [
      'comprehension_and_accuracy',
      'argumentation_and_reasoning',
      'authenticity_and_ownership',
    ] as const) {
      const questions = byCategory(category)
      expect(questions.filter((question) => question.isRecommended)).toHaveLength(3)
      expect(questions[3].isRecommended).toBe(false)
    }
  })

  it('assigns sort order sequentially across categories, comprehension first then argumentation then authenticity', async () => {
    const repository = createRepository()
    const generateStructuredViva = vi.fn().mockResolvedValue(structuredAnalysis)

    await generateSubmissionVivaAnalysis({
      generateStructuredViva,
      repository,
      submissionId: submission.id,
    })

    const storedQuestions = repository.replaceQuestions.mock
      .calls[0][1] as StoredSubmissionQuestion[]

    expect(storedQuestions.map((question) => question.sortOrder)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
    ])
    expect(
      storedQuestions.slice(0, 4).every(
        (question) => question.category === 'comprehension_and_accuracy',
      ),
    ).toBe(true)
    expect(
      storedQuestions.slice(4, 8).every(
        (question) => question.category === 'argumentation_and_reasoning',
      ),
    ).toBe(true)
    expect(
      storedQuestions.slice(8, 12).every(
        (question) => question.category === 'authenticity_and_ownership',
      ),
    ).toBe(true)
  })

  it('rejects AI output that is missing a category', async () => {
    const repository = createRepository()
    const { authenticityAndOwnership: _omitted, ...remainingCategories } =
      structuredAnalysis.questions
    const generateStructuredViva = vi.fn().mockResolvedValue({
      questions: remainingCategories,
    } as unknown as StructuredVivaQuestions)

    const result = await generateSubmissionVivaAnalysis({
      generateStructuredViva,
      repository,
      submissionId: submission.id,
    })

    expect(result.status).toBe('failed')
    expect(result.errorMessage).toBeTruthy()
    expect(repository.replaceQuestions).not.toHaveBeenCalled()
  })

  it('rejects AI output with the wrong number of questions in a category', async () => {
    const repository = createRepository()
    const generateStructuredViva = vi.fn().mockResolvedValue({
      ...structuredAnalysis,
      questions: {
        ...structuredAnalysis.questions,
        argumentationAndReasoning:
          structuredAnalysis.questions.argumentationAndReasoning.slice(0, 3),
      },
    })

    const result = await generateSubmissionVivaAnalysis({
      generateStructuredViva,
      repository,
      submissionId: submission.id,
    })

    expect(result.status).toBe('failed')
    expect(result.errorMessage).toBeTruthy()
    expect(repository.replaceQuestions).not.toHaveBeenCalled()
  })

  it('strips unexpected extra fields from AI output instead of failing', async () => {
    const repository = createRepository()
    const generateStructuredViva = vi.fn().mockResolvedValue({
      ...structuredAnalysis,
      questions: {
        ...structuredAnalysis.questions,
        comprehensionAndAccuracy:
          structuredAnalysis.questions.comprehensionAndAccuracy.map(
            (question) => ({
              ...question,
              unexpectedField: 'should be stripped',
            }),
          ),
      },
    } as unknown as StructuredVivaQuestions)

    const result = await generateSubmissionVivaAnalysis({
      generateStructuredViva,
      repository,
      submissionId: submission.id,
    })

    expect(result.status).toBe('completed')
    const storedQuestions = repository.replaceQuestions.mock
      .calls[0][1] as StoredSubmissionQuestion[]
    for (const question of storedQuestions) {
      expect(question).not.toHaveProperty('unexpectedField')
    }
  })

  it('propagates a meaningful error message when the AI call fails', async () => {
    const repository = createRepository()
    const generateStructuredViva = vi
      .fn()
      .mockRejectedValue(new Error('AI provider request timed out.'))

    const result = await generateSubmissionVivaAnalysis({
      generateStructuredViva,
      repository,
      submissionId: submission.id,
    })

    expect(result).toEqual({
      errorMessage: 'AI provider request timed out.',
      status: 'failed',
      submissionId: submission.id,
    })
    expect(repository.replaceQuestions).not.toHaveBeenCalled()
  })

  it('propagates a meaningful error message when the Supabase upsert fails', async () => {
    const repository = {
      getSubmission: vi.fn().mockResolvedValue(submission),
      replaceQuestions: vi
        .fn()
        .mockRejectedValue(new Error('We could not save the generated viva questions.')),
    } satisfies SubmissionVivaGenerationRepository
    const generateStructuredViva = vi.fn().mockResolvedValue(structuredAnalysis)

    const result = await generateSubmissionVivaAnalysis({
      generateStructuredViva,
      repository,
      submissionId: submission.id,
    })

    expect(result).toEqual({
      errorMessage: 'We could not save the generated viva questions.',
      status: 'failed',
      submissionId: submission.id,
    })
  })

  it('stores a failed analysis when the submission cannot be found', async () => {
    const repository = {
      getSubmission: vi.fn().mockResolvedValue(null),
      replaceQuestions: vi.fn().mockResolvedValue(undefined),
    } satisfies SubmissionVivaGenerationRepository
    const generateStructuredViva = vi.fn()

    const result = await generateSubmissionVivaAnalysis({
      generateStructuredViva,
      repository,
      submissionId: submission.id,
    })

    expect(result).toEqual({
      errorMessage: 'Submission not found.',
      status: 'failed',
      submissionId: submission.id,
    })
    expect(generateStructuredViva).not.toHaveBeenCalled()
  })
})

describe('generateSubmissionVivaAnalysis prompt construction (default AI call)', () => {
  beforeEach(() => {
    generateObjectMock.mockReset()
    generateObjectMock.mockResolvedValue({ object: structuredAnalysis })
    vi.stubEnv('OPENAI_API_KEY', 'test-api-key')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('sends a prompt containing the submission text and the per-category question requirements', async () => {
    const repository = createRepository()

    const result = await generateSubmissionVivaAnalysis({
      repository,
      submissionId: submission.id,
    })

    expect(result.status).toBe('completed')
    expect(generateObjectMock).toHaveBeenCalledTimes(1)

    const call = generateObjectMock.mock.calls[0][0] as { prompt: string }
    expect(call.prompt).toContain(submission.submissionText)
    expect(call.prompt).toContain(submission.title)
    expect(call.prompt).toContain('Return exactly 2 questions for each category.')
    expect(call.prompt).toContain(
      'Mark exactly 3 questions in each category as recommended for limited time.',
    )
  })

  it('fails with a meaningful error when OPENAI_API_KEY is not configured', async () => {
    vi.stubEnv('OPENAI_API_KEY', '')
    const repository = createRepository()

    const result = await generateSubmissionVivaAnalysis({
      repository,
      submissionId: submission.id,
    })

    expect(result).toEqual({
      errorMessage: 'OPENAI_API_KEY is not configured.',
      status: 'failed',
      submissionId: submission.id,
    })
    expect(generateObjectMock).not.toHaveBeenCalled()
  })
})
