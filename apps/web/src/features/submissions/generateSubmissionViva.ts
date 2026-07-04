import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import { getSupabaseServerClient } from "../../utils/supabase-server";

const questionSchema = z.object({
  question: z.string().trim().min(1),
  recommendedForLimitedTime: z.boolean(),
  teacherNote: z.string().trim().min(1),
});

const structuredVivaQuestionsSchema = z
  .object({
    questions: z.object({
      authenticityAndOwnership: z.array(questionSchema).length(4),
      argumentationAndReasoning: z.array(questionSchema).length(4),
      comprehensionAndAccuracy: z.array(questionSchema).length(4),
    }),
  })
  .superRefine((value, ctx) => {
    const categories = [
      ["comprehension_and_accuracy", value.questions.comprehensionAndAccuracy],
      [
        "argumentation_and_reasoning",
        value.questions.argumentationAndReasoning,
      ],
      ["authenticity_and_ownership", value.questions.authenticityAndOwnership],
    ] as const;

    categories.forEach(([category, questions]) => {
      const recommendedCount = questions.filter(
        (question) => question.recommendedForLimitedTime,
      ).length;

      if (recommendedCount !== 3) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Expected exactly 3 recommended questions in ${category}.`,
          path: ["questions", category],
        });
      }
    });
  });

export type StructuredVivaQuestions = z.infer<
  typeof structuredVivaQuestionsSchema
>;

export type SubmissionForGeneration = {
  id: string;
  submissionText: string;
  title: string;
};

export type StoredSubmissionQuestion = {
  category:
    | "authenticity_and_ownership"
    | "argumentation_and_reasoning"
    | "comprehension_and_accuracy";
  isRecommended: boolean;
  questionText: string;
  sortOrder: number;
  teacherNote: string;
};

export type SubmissionVivaGenerationRepository = {
  getSubmission: (
    submissionId: string,
  ) => Promise<SubmissionForGeneration | null>;
  replaceQuestions: (
    submissionId: string,
    questions: StoredSubmissionQuestion[],
  ) => Promise<void>;
};

type GenerateStructuredViva = (
  submission: SubmissionForGeneration,
) => Promise<StructuredVivaQuestions>;

type GenerateSubmissionVivaArgs = {
  generateStructuredViva?: GenerateStructuredViva;
  repository?: SubmissionVivaGenerationRepository;
  submissionId: string;
};

type SubmissionVivaGenerationResult = {
  errorMessage?: string;
  status: "completed" | "failed";
  submissionId: string;
};

type SubmissionRecord = {
  id: string;
  submission_text: string;
  submission_title: string;
};

function createPrompt(submission: SubmissionForGeneration) {
  return [
    "You are an expert KS4 English teacher and writing assessor.",
    "",
    "Create a viva question bank for the student response.",
    "",
    "Requirements:",
    "- The student is aged 14 to 16, so every question must be appropriate for KS4.",
    "- Do not accuse the student of cheating.",
    "- Do not claim that AI use can be detected with certainty.",
    "- Authenticity questions must explore whether the student can explain, defend, and reflect on their own writing choices.",
    "- Make each question specific to the student text rather than generic.",
    "- Return exactly 4 questions for each category.",
    "- Mark exactly 3 questions in each category as recommended for limited time.",
    "",
    `Submission title: ${submission.title}`,
    "",
    "Student text:",
    submission.submissionText,
  ].join("\n");
}

function normalizeStructuredQuestions(
  analysis: StructuredVivaQuestions,
): StoredSubmissionQuestion[] {
  const normalizedAnalysis = structuredVivaQuestionsSchema.parse(analysis);
  const questions: StoredSubmissionQuestion[] = [];
  const orderedCategories = [
    [
      "comprehension_and_accuracy",
      normalizedAnalysis.questions.comprehensionAndAccuracy,
    ],
    [
      "argumentation_and_reasoning",
      normalizedAnalysis.questions.argumentationAndReasoning,
    ],
    [
      "authenticity_and_ownership",
      normalizedAnalysis.questions.authenticityAndOwnership,
    ],
  ] as const;

  orderedCategories.forEach(([category, categoryQuestions]) => {
    categoryQuestions.forEach((question) => {
      questions.push({
        category,
        isRecommended: question.recommendedForLimitedTime,
        questionText: question.question,
        sortOrder: questions.length + 1,
        teacherNote: question.teacherNote,
      });
    });
  });

  return questions;
}

async function generateStructuredVivaWithAiSdk(
  submission: SubmissionForGeneration,
): Promise<StructuredVivaQuestions> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const modelName = process.env.AI_VIVA_MODEL ?? "gpt-5.4";
  const { object } = await generateObject({
    model: openai(modelName),
    schema: structuredVivaQuestionsSchema,
    system:
      "You are an expert KS4 English teacher and writing assessor. Return only the requested structured viva question data.",
    prompt: createPrompt(submission),
  });

  return object;
}

export async function generateSubmissionVivaAnalysis({
  generateStructuredViva = generateStructuredVivaWithAiSdk,
  repository = createSupabaseSubmissionVivaGenerationRepository(),
  submissionId,
}: GenerateSubmissionVivaArgs): Promise<SubmissionVivaGenerationResult> {
  try {
    const submission = await repository.getSubmission(submissionId);

    if (!submission) {
      throw new Error("Submission not found.");
    }

    const structuredQuestions = await generateStructuredViva(submission);
    const normalizedQuestions =
      normalizeStructuredQuestions(structuredQuestions);

    await repository.replaceQuestions(submissionId, normalizedQuestions);

    return {
      status: "completed",
      submissionId,
    };
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? (error.issues[0]?.message ?? "Viva question generation failed.")
        : error instanceof Error
          ? error.message
          : "Viva question generation failed.";

    return {
      errorMessage: message,
      status: "failed",
      submissionId,
    };
  }
}

export function createSupabaseSubmissionVivaGenerationRepository(): SubmissionVivaGenerationRepository {
  return {
    async getSubmission(submissionId) {
      const supabase = getSupabaseServerClient();
      const { data, error } = await supabase
        .from("submissions")
        .select("id, submission_title, submission_text")
        .eq("id", submissionId);

      if (error) {
        throw new Error(
          "We could not load the submission for viva generation.",
        );
      }

      const submission = (data as SubmissionRecord[] | null)?.[0];

      if (!submission) {
        return null;
      }

      return {
        id: submission.id,
        submissionText: submission.submission_text,
        title: submission.submission_title,
      };
    },
    async replaceQuestions(submissionId, questions) {
      const supabase = getSupabaseServerClient();
      const { error: deleteError } = await supabase
        .from("viva_questions")
        .delete()
        .eq("submission_id", submissionId);

      if (deleteError) {
        throw new Error("We could not clear the previous viva questions.");
      }

      const { error: insertError } = await supabase
        .from("viva_questions")
        .insert(
          questions.map((question) => ({
            category: question.category,
            is_recommended: question.isRecommended,
            question_text: question.questionText,
            sort_order: question.sortOrder,
            submission_id: submissionId,
            teacher_note: question.teacherNote,
          })),
        );

      if (insertError) {
        throw new Error("We could not save the generated viva questions.");
      }
    },
  };
}
