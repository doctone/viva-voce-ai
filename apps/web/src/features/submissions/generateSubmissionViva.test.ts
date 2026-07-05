import { describe, expect, it, vi } from 'vitest'
import {
  createPrompt,
  generateSubmissionVivaAnalysis,
  type StoredSubmissionQuestion,
  type StructuredVivaQuestions,
  type SubmissionForGeneration,
  type SubmissionVivaGenerationRepository,
} from './generateSubmissionViva'

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

  it('normalizes every category into the stored format, in category order, preserving text and notes verbatim', async () => {
    const repository = createRepository()
    const generateStructuredViva = vi.fn().mockResolvedValue(structuredAnalysis)

    await generateSubmissionVivaAnalysis({
      generateStructuredViva,
      repository,
      submissionId: submission.id,
    })

    const expectedQuestions: StoredSubmissionQuestion[] = [
      ...structuredAnalysis.questions.comprehensionAndAccuracy.map(
        (question, index) => ({
          category: 'comprehension_and_accuracy' as const,
          isRecommended: question.recommendedForLimitedTime,
          questionText: question.question,
          sortOrder: index + 1,
          teacherNote: question.teacherNote,
        }),
      ),
      ...structuredAnalysis.questions.argumentationAndReasoning.map(
        (question, index) => ({
          category: 'argumentation_and_reasoning' as const,
          isRecommended: question.recommendedForLimitedTime,
          questionText: question.question,
          sortOrder: index + 5,
          teacherNote: question.teacherNote,
        }),
      ),
      ...structuredAnalysis.questions.authenticityAndOwnership.map(
        (question, index) => ({
          category: 'authenticity_and_ownership' as const,
          isRecommended: question.recommendedForLimitedTime,
          questionText: question.question,
          sortOrder: index + 9,
          teacherNote: question.teacherNote,
        }),
      ),
    ]

    expect(repository.replaceQuestions).toHaveBeenCalledWith(
      submission.id,
      expectedQuestions,
    )
    expect(
      expectedQuestions.filter(
        (question) =>
          question.category === 'comprehension_and_accuracy' &&
          question.isRecommended,
      ),
    ).toHaveLength(3)
    expect(
      expectedQuestions.filter(
        (question) =>
          question.category === 'comprehension_and_accuracy' &&
          !question.isRecommended,
      ),
    ).toHaveLength(1)
  })

  it('rejects AI output that is missing a category', async () => {
    const repository = createRepository()
    const { authenticityAndOwnership: _omitted, ...remainingCategories } =
      structuredAnalysis.questions
    const generateStructuredViva = vi.fn().mockResolvedValue({
      questions: remainingCategories,
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

  it('rejects AI output with the wrong number of questions in a category', async () => {
    const repository = createRepository()
    const generateStructuredViva = vi.fn().mockResolvedValue({
      ...structuredAnalysis,
      questions: {
        ...structuredAnalysis.questions,
        comprehensionAndAccuracy:
          structuredAnalysis.questions.comprehensionAndAccuracy.slice(0, 3),
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
      extraTopLevelField: 'unexpected',
      questions: {
        ...structuredAnalysis.questions,
        comprehensionAndAccuracy:
          structuredAnalysis.questions.comprehensionAndAccuracy.map(
            (question) => ({ ...question, extraQuestionField: 'unexpected' }),
          ),
      },
    })

    const result = await generateSubmissionVivaAnalysis({
      generateStructuredViva,
      repository,
      submissionId: submission.id,
    })

    expect(result).toEqual({
      status: 'completed',
      submissionId: submission.id,
    })
    const [, storedQuestions] = repository.replaceQuestions.mock.calls[0]
    for (const question of storedQuestions) {
      expect(question).not.toHaveProperty('extraQuestionField')
    }
  })

  it('propagates a meaningful error message when the AI call fails', async () => {
    const repository = createRepository()
    const generateStructuredViva = vi
      .fn()
      .mockRejectedValue(new Error('The AI provider timed out.'))

    const result = await generateSubmissionVivaAnalysis({
      generateStructuredViva,
      repository,
      submissionId: submission.id,
    })

    expect(result).toEqual({
      errorMessage: 'The AI provider timed out.',
      status: 'failed',
      submissionId: submission.id,
    })
    expect(repository.replaceQuestions).not.toHaveBeenCalled()
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

  it('propagates a meaningful error message when saving questions fails, instead of swallowing it', async () => {
    const repository = createRepository()
    repository.replaceQuestions.mockRejectedValue(
      new Error('We could not save the generated viva questions.'),
    )
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
})

describe('createPrompt', () => {
  it("includes the student's submission text and title", () => {
    const prompt = createPrompt(submission)

    expect(prompt).toContain(submission.submissionText)
    expect(prompt).toContain(submission.title)
  })

  it('requests exactly 4 questions per category, matching the structured schema', () => {
    const prompt = createPrompt(submission)

    expect(prompt).toContain('Return exactly 4 questions for each category.')
  })
})

describe('default AI SDK path', () => {
  it('fails with a meaningful error when OPENAI_API_KEY is not configured', async () => {
    const originalKey = process.env.OPENAI_API_KEY
    delete process.env.OPENAI_API_KEY
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

    process.env.OPENAI_API_KEY = originalKey
  })
})
