import { generateObject } from 'ai'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  generateSubmissionVivaAnalysis,
  type StoredSubmissionQuestion,
  type StructuredVivaQuestions,
  type SubmissionForGeneration,
  type SubmissionVivaGenerationRepository,
} from './generateSubmissionViva'

vi.mock('ai', () => ({ generateObject: vi.fn() }))
vi.mock('@ai-sdk/openai', () => ({ openai: vi.fn(() => 'mock-model') }))

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

  it('normalizes every category into the stored format with correct order, recommendation flags, and verbatim text', async () => {
    const repository = createRepository()
    const generateStructuredViva = vi.fn().mockResolvedValue(structuredAnalysis)

    await generateSubmissionVivaAnalysis({
      generateStructuredViva,
      repository,
      submissionId: submission.id,
    })

    const [, storedQuestions] = repository.replaceQuestions.mock.calls[0] as [
      string,
      StoredSubmissionQuestion[],
    ]

    const expectedOrder = [
      ...structuredAnalysis.questions.comprehensionAndAccuracy.map(
        (question) => ({
          ...question,
          category: 'comprehension_and_accuracy' as const,
        }),
      ),
      ...structuredAnalysis.questions.argumentationAndReasoning.map(
        (question) => ({
          ...question,
          category: 'argumentation_and_reasoning' as const,
        }),
      ),
      ...structuredAnalysis.questions.authenticityAndOwnership.map(
        (question) => ({
          ...question,
          category: 'authenticity_and_ownership' as const,
        }),
      ),
    ]

    expect(storedQuestions).toHaveLength(12)
    expectedOrder.forEach((expected, index) => {
      expect(storedQuestions[index]).toEqual({
        category: expected.category,
        isRecommended: expected.recommendedForLimitedTime,
        questionText: expected.question,
        sortOrder: index + 1,
        teacherNote: expected.teacherNote,
      })
    })
    ;(
      [
        'comprehension_and_accuracy',
        'argumentation_and_reasoning',
        'authenticity_and_ownership',
      ] as const
    ).forEach((category) => {
      const categoryQuestions = storedQuestions.filter(
        (question) => question.category === category,
      )
      expect(
        categoryQuestions.filter((question) => question.isRecommended),
      ).toHaveLength(3)
      expect(
        categoryQuestions.filter((question) => !question.isRecommended),
      ).toHaveLength(1)
    })
  })

  it('rejects AI output that is missing a category', async () => {
    const repository = createRepository()
    const missingCategory = {
      questions: {
        authenticityAndOwnership:
          structuredAnalysis.questions.authenticityAndOwnership,
        comprehensionAndAccuracy:
          structuredAnalysis.questions.comprehensionAndAccuracy,
      },
    } as unknown as StructuredVivaQuestions
    const generateStructuredViva = vi.fn().mockResolvedValue(missingCategory)

    const result = await generateSubmissionVivaAnalysis({
      generateStructuredViva,
      repository,
      submissionId: submission.id,
    })

    expect(result).toEqual({
      errorMessage: 'Required',
      status: 'failed',
      submissionId: submission.id,
    })
    expect(repository.replaceQuestions).not.toHaveBeenCalled()
  })

  it('rejects AI output with the wrong number of questions in a category', async () => {
    const repository = createRepository()
    const tooFewQuestions = {
      ...structuredAnalysis,
      questions: {
        ...structuredAnalysis.questions,
        authenticityAndOwnership:
          structuredAnalysis.questions.authenticityAndOwnership.slice(0, 3),
      },
    } as StructuredVivaQuestions
    const generateStructuredViva = vi.fn().mockResolvedValue(tooFewQuestions)

    const result = await generateSubmissionVivaAnalysis({
      generateStructuredViva,
      repository,
      submissionId: submission.id,
    })

    expect(result).toEqual({
      errorMessage: 'Array must contain exactly 4 element(s)',
      status: 'failed',
      submissionId: submission.id,
    })
    expect(repository.replaceQuestions).not.toHaveBeenCalled()
  })

  it('ignores unexpected extra fields in the AI output instead of failing', async () => {
    const repository = createRepository()
    const withExtraFields = {
      ...structuredAnalysis,
      questions: {
        ...structuredAnalysis.questions,
        comprehensionAndAccuracy:
          structuredAnalysis.questions.comprehensionAndAccuracy.map(
            (question, index) =>
              index === 0
                ? { ...question, unexpectedQuestionField: 'ignore me' }
                : question,
          ),
      },
      unexpectedTopLevelField: 'ignore me too',
    } as unknown as StructuredVivaQuestions
    const generateStructuredViva = vi.fn().mockResolvedValue(withExtraFields)

    const result = await generateSubmissionVivaAnalysis({
      generateStructuredViva,
      repository,
      submissionId: submission.id,
    })

    expect(result).toEqual({
      status: 'completed',
      submissionId: submission.id,
    })
    const [, storedQuestions] = repository.replaceQuestions.mock.calls[0] as [
      string,
      StoredSubmissionQuestion[],
    ]
    storedQuestions.forEach((question) => {
      expect(question).not.toHaveProperty('unexpectedQuestionField')
    })
  })

  it('propagates a meaningful error message when the AI call fails', async () => {
    const repository = createRepository()
    const generateStructuredViva = vi
      .fn()
      .mockRejectedValue(new Error('Upstream AI provider is unavailable.'))

    const result = await generateSubmissionVivaAnalysis({
      generateStructuredViva,
      repository,
      submissionId: submission.id,
    })

    expect(result).toEqual({
      errorMessage: 'Upstream AI provider is unavailable.',
      status: 'failed',
      submissionId: submission.id,
    })
    expect(repository.replaceQuestions).not.toHaveBeenCalled()
  })

  it('propagates a meaningful error message when saving the generated questions fails', async () => {
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

  describe('the default AI SDK prompt', () => {
    const originalApiKey = process.env.OPENAI_API_KEY

    beforeEach(() => {
      process.env.OPENAI_API_KEY = 'test-key'
      vi.mocked(generateObject).mockResolvedValue({
        object: structuredAnalysis,
      } as never)
    })

    afterEach(() => {
      process.env.OPENAI_API_KEY = originalApiKey
      vi.mocked(generateObject).mockReset()
    })

    it('includes the submission text in the prompt sent to the model', async () => {
      const repository = createRepository()

      await generateSubmissionVivaAnalysis({
        repository,
        submissionId: submission.id,
      })

      const call = vi.mocked(generateObject).mock.calls[0][0] as {
        prompt: string
      }
      expect(call.prompt).toContain(submission.submissionText)
    })

    it('requests exactly 4 questions per category', async () => {
      const repository = createRepository()

      await generateSubmissionVivaAnalysis({
        repository,
        submissionId: submission.id,
      })

      const call = vi.mocked(generateObject).mock.calls[0][0] as {
        prompt: string
      }
      expect(call.prompt).toMatch(/exactly 4 questions/i)
    })
  })
})
