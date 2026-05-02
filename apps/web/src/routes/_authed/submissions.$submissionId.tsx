import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "../../components/ui/Button";
import { useGenerateSubmissionViva } from "../../features/submissions/useGenerateSubmissionViva";
import {
  cn,
  eyebrowClassName,
  headingOneClassName,
  headingTwoClassName,
  mutedTextClassName,
  paperPanelClassName,
  sectionCardClassName,
} from "../../styles/classes";
import { getSupabaseBrowserClient } from "../../utils/supabase-browser";
import {
  AddManualQuestionCard,
  QuestionCard,
} from "./submissions/-QuestionCard";

export const Route = createFileRoute("/_authed/submissions/$submissionId")({
  component: SubmissionDetailPage,
});

type SubmissionRecord = {
  created_at: string;
  id: string;
  student_id: string;
  submission_text: string;
  submission_title: string;
};

type VivaQuestionRecord = {
  category: string;
  id: string;
  is_recommended?: boolean;
  question_text: string;
  sort_order?: number;
  submission_id: string;
  teacher_note: string;
};

type SubmissionQuestion = {
  id: string;
  isHighlighted?: boolean;
  label: string;
  questionText: string;
  sortOrder: number;
  teacherNote: string;
};

type GenerationState = "idle" | "running" | "failed";

async function fetchSubmission(submissionId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("submissions")
    .select("id, student_id, submission_title, submission_text, created_at")
    .eq("id", submissionId);

  if (error) {
    throw new Error("We could not load the submission.");
  }

  const submission = (data as SubmissionRecord[] | null)?.[0];

  if (!submission) {
    throw new Error("Submission not found.");
  }

  return submission;
}

async function fetchSubmissionQuestions(
  submissionId: string,
): Promise<SubmissionQuestion[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("viva_questions")
    .select(
      "id, submission_id, category, question_text, teacher_note, is_recommended, sort_order",
    )
    .eq("submission_id", submissionId);

  if (error) {
    throw new Error("We could not load submission questions.");
  }

  const rows = (data as VivaQuestionRecord[] | null) ?? [];

  return rows
    .map((question) => ({
      id: question.id,
      isHighlighted: question.is_recommended ?? false,
      label: formatQuestionCategory(question.category),
      questionText: question.question_text,
      sortOrder: question.sort_order ?? 0,
      teacherNote: question.teacher_note,
    }))
    .sort((left, right) => left.sortOrder - right.sortOrder);
}

function formatQuestionCategory(category: string) {
  return category
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatSubmissionDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value));
}

function splitSubmissionTextIntoParagraphs(value: string) {
  return value
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function LoadingPulseLine({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "h-3 rounded-full bg-[color:rgb(0_32_70_/_0.08)] animate-pulse",
        className,
      )}
    />
  );
}

type SubmissionGenerationShellProps = {
  studentId: string;
  submissionTitle: string;
};

function SubmissionGenerationShell({
  studentId,
  submissionTitle,
}: SubmissionGenerationShellProps) {
  return (
    <section className="-mx-6 -mb-16 -mt-8 grid min-h-screen w-[calc(100%+3rem)]">
      <div
        className={cn(
          paperPanelClassName,
          "grid min-h-full w-full grid-rows-[auto_1fr] overflow-hidden",
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-outline-variant px-8 py-6">
          <div className="grid gap-3">
            <span className={eyebrowClassName}>Submissions</span>
            <div className="grid gap-2">
              <h1 className={headingOneClassName}>Preparing viva questions</h1>
              <p
                className={cn(
                  mutedTextClassName,
                  "max-w-[68ch] text-sm leading-6",
                )}
              >
                The submission has been saved. Viva questions are being prepared
                now.
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-3 border border-outline-variant bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
              <span className="relative rounded-full bg-primary px-[5px] py-[5px]" />
            </span>
            <span className="font-sans font-bold uppercase tracking-[0.08em] text-primary">
              In progress
            </span>
          </div>
        </div>

        <div className="grid gap-10 bg-[linear-gradient(180deg,rgba(244,244,240,0.45),rgba(255,255,255,0.96))] px-8 py-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)] lg:items-stretch lg:gap-12">
          <div className="grid content-start gap-6">
            <div className="grid gap-4 border border-outline-variant bg-surface-container-lowest p-6 shadow-technical">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant pb-4">
                <div className="grid gap-2">
                  <span className={eyebrowClassName}>Current submission</span>
                  <h2 className="font-display text-[30px] font-medium leading-[1.2] tracking-[-0.02em] text-primary">
                    {submissionTitle}
                  </h2>
                </div>
                <p className={cn(mutedTextClassName, "text-sm leading-6")}>
                  Student {studentId}
                </p>
              </div>

              <div className="grid gap-3 pt-2">
                <LoadingPulseLine className="w-full" />
                <LoadingPulseLine className="w-[92%]" />
                <LoadingPulseLine className="w-[96%]" />
                <LoadingPulseLine className="w-[84%]" />
                <LoadingPulseLine className="w-[90%]" />
                <LoadingPulseLine className="w-[78%]" />
              </div>
            </div>

            <div className="grid gap-3 border-t border-outline-variant pt-5">
              <p
                className={cn(
                  mutedTextClassName,
                  "max-w-[62ch] text-sm leading-6",
                )}
              >
                The system is drafting an examiner-ready set of prompts,
                ownership checks, and follow-up questions for this submission.
              </p>
              <p className={cn(mutedTextClassName, "text-sm leading-6")}>
                This usually takes a few seconds. If it takes longer, you can
                stay on this page.
              </p>
            </div>
          </div>

          <aside className="grid content-start gap-4 border border-outline-variant bg-[rgb(244_244_240_/_0.82)] p-6">
            <div className="grid gap-2 border-b border-outline-variant pb-4">
              <span className={eyebrowClassName}>Viva assembly</span>
              <h2 className="font-display text-[28px] font-medium leading-[1.25] tracking-[-0.02em] text-primary">
                Building the question set
              </h2>
            </div>

            <div className="grid gap-4">
              {[
                "Scanning the submission for key claims and terms",
                "Drafting oral follow-up questions for the strongest lines of inquiry",
                "Preparing teacher notes for a live viva conversation",
              ].map((step, index) => (
                <div
                  key={step}
                  className="grid gap-2 border border-outline-variant bg-surface-container-lowest px-4 py-4 shadow-technical"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant bg-surface-container text-sm font-bold text-primary animate-pulse"
                      style={{ animationDelay: `${index * 180}ms` }}
                    >
                      {index + 1}
                    </span>
                    <p className="font-sans text-sm leading-6 text-on-surface">
                      {step}
                    </p>
                  </div>
                  <LoadingPulseLine className="ml-11 w-[72%]" />
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

type SubmissionGenerationFailureProps = {
  errorMessage: string | null;
  onRetry: () => void;
};

function SubmissionGenerationFailure({
  errorMessage,
  onRetry,
}: SubmissionGenerationFailureProps) {
  return (
    <section className={cn(paperPanelClassName, sectionCardClassName, "gap-5")}>
      <span className={eyebrowClassName}>Submissions</span>
      <h1 className={headingOneClassName}>Viva questions unavailable</h1>
      <p className={cn(mutedTextClassName, "max-w-[60ch] text-sm leading-6")}>
        The submission was saved, but viva question generation did not complete.
      </p>
      {errorMessage ? (
        <p className="text-sm leading-6 text-error">{errorMessage}</p>
      ) : null}
      <div>
        <Button type="button" onClick={onRetry}>
          Try again
        </Button>
      </div>
    </section>
  );
}

export function SubmissionDetailPage() {
  const { submissionId } = Route.useParams();
  const queryClient = useQueryClient();
  const generateSubmissionViva = useGenerateSubmissionViva();
  const [generationState, setGenerationState] =
    React.useState<GenerationState>("idle");
  const [generationErrorMessage, setGenerationErrorMessage] = React.useState<
    string | null
  >(null);
  const hasTriggeredGenerationRef = React.useRef(false);
  const submissionQuery = useQuery({
    queryFn: () => fetchSubmission(submissionId),
    queryKey: ["submission", submissionId],
  });
  const questionsQuery = useQuery({
    queryFn: () => fetchSubmissionQuestions(submissionId),
    queryKey: ["submission-questions", submissionId],
  });

  const questions = questionsQuery.data ?? [];

  const runGeneration = React.useCallback(async () => {
    hasTriggeredGenerationRef.current = true;
    setGenerationState("running");
    setGenerationErrorMessage(null);

    const result = await generateSubmissionViva(submissionId);

    if (result.status === "failed") {
      setGenerationState("failed");
      setGenerationErrorMessage(
        result.errorMessage ??
          "We saved the submission, but could not generate viva questions.",
      );
      return;
    }

    setGenerationState("idle");
    await queryClient.invalidateQueries({
      queryKey: ["submission-questions", submissionId],
    });
  }, [generateSubmissionViva, queryClient, submissionId]);

  React.useEffect(() => {
    if (
      !submissionQuery.data ||
      questionsQuery.isLoading ||
      questionsQuery.error
    ) {
      return;
    }

    if (
      questions.length > 0 ||
      generationState !== "idle" ||
      hasTriggeredGenerationRef.current
    ) {
      return;
    }

    void runGeneration();
  }, [
    generationState,
    questions.length,
    questionsQuery.error,
    questionsQuery.isLoading,
    runGeneration,
    submissionQuery.data,
  ]);

  if (submissionQuery.isLoading) {
    return (
      <section className={cn(paperPanelClassName, sectionCardClassName)}>
        <span className={eyebrowClassName}>Submissions</span>
        <h1 className={headingOneClassName}>Loading submission</h1>
      </section>
    );
  }

  if (submissionQuery.error instanceof Error) {
    return (
      <section className={cn(paperPanelClassName, sectionCardClassName)}>
        <span className={eyebrowClassName}>Submissions</span>
        <h1 className={headingOneClassName}>Submission unavailable</h1>
        <p className="text-sm leading-6 text-error">
          {submissionQuery.error.message}
        </p>
      </section>
    );
  }

  if (questionsQuery.error instanceof Error) {
    return (
      <section className={cn(paperPanelClassName, sectionCardClassName)}>
        <span className={eyebrowClassName}>Submissions</span>
        <h1 className={headingOneClassName}>Submission unavailable</h1>
        <p className="text-sm leading-6 text-error">
          {questionsQuery.error.message}
        </p>
      </section>
    );
  }

  const submission = submissionQuery.data as SubmissionRecord;

  if (questions.length === 0) {
    if (generationState === "failed") {
      return (
        <SubmissionGenerationFailure
          errorMessage={generationErrorMessage}
          onRetry={() => {
            void runGeneration();
          }}
        />
      );
    }

    return (
      <SubmissionGenerationShell
        studentId={submission.student_id}
        submissionTitle={submission.submission_title}
      />
    );
  }

  const submissionParagraphs = splitSubmissionTextIntoParagraphs(
    submission.submission_text,
  );

  return (
    <section className="grid gap-8">
      <div className="grid gap-3">
        <span className={eyebrowClassName}>Submissions</span>
        <h1 className={headingOneClassName}>{submission.submission_title}</h1>
        <p className={cn(mutedTextClassName, "text-sm leading-6")}>
          Student {submission.student_id} · Submitted{" "}
          {formatSubmissionDate(submission.created_at)}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-12 xl:items-start">
        <section className="space-y-8 xl:col-span-7">
          <article
            className={cn(paperPanelClassName, "relative overflow-hidden p-8")}
          >
            <div className="absolute inset-y-0 left-0 w-1 bg-primary-container" />
            <h2 className="mb-6 border-b border-stone-100 pb-4 font-display text-[32px] font-medium leading-[1.3] tracking-[-0.01em] text-primary">
              The Submission
            </h2>
            <div className="max-w-2xl space-y-4 font-serif text-lg leading-relaxed text-on-surface-variant">
              {submissionParagraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </article>

          <section
            className={cn(paperPanelClassName, "bg-surface-container-low p-8")}
          >
            <h2 className="mb-4 font-display text-[32px] font-medium leading-[1.3] tracking-[-0.01em] text-primary">
              Oral Examination (Audio)
            </h2>
            <p className={cn(mutedTextClassName, "mb-6 text-sm leading-6")}>
              Upload the recorded Viva Voce session to generate an automated
              transcription and analysis.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Button type="button" variant="secondary" disabled>
                Upload recording
              </Button>
              <span className={cn(mutedTextClassName, "text-sm")}>
                Audio upload will be connected in a later step.
              </span>
            </div>
          </section>
        </section>

        <aside className="space-y-4 xl:col-span-5 xl:sticky xl:top-24">
          <div className="mb-4 flex items-center justify-between gap-4 px-2">
            <h2 className={headingTwoClassName}>AI Viva Strategy</h2>
          </div>

          {questions.map((question) => (
            <QuestionCard
              key={question.id}
              isHighlighted={question.isHighlighted}
              label={question.label}
              questionText={question.questionText}
              teacherNote={question.teacherNote}
            />
          ))}

          <AddManualQuestionCard />
        </aside>
      </div>
    </section>
  );
}
