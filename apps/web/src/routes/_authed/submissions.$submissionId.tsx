import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Breadcrumb,
  Button,
  Card,
  Heading,
  PageFrame,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  buttonClassName,
} from "../../components/ui";
import { useEquipmentCheck } from "../../features/submissions/useEquipmentCheck";
import { useGenerateSubmissionViva } from "../../features/submissions/useGenerateSubmissionViva";
import {
  createSupabaseVivaRecordingAccessRepository,
  resolveVivaRecordingAccess,
  type VivaRecordingAccessResult,
} from "../../features/submissions/vivaRecordingAccess";
import {
  computeNextSetPosition,
  computeSequentialPositions,
  estimateQuestionSetDurationMinutes,
  formatQuestionCategory,
  moveQuestionInSet,
  sortQuestionsBySetPosition,
  summarizeCategoryBalance,
  type QuestionSetStatus,
} from "../../features/submissions/vivaQuestionSet";
import {
  createSupabaseVivaSessionRepository,
  startVivaSession,
} from "../../features/submissions/vivaSession";
import { cn } from "~/lib/utils";
import {
  eyebrowClassName,
  mutedTextClassName,
  paperPanelClassName,
  subheadClassName,
} from "~/lib/class-names";
import { getSupabaseBrowserClient } from "../../utils/supabase-browser";
import {
  AddManualQuestionCard,
  type ManualQuestionInput,
  QuestionCard,
} from "./submissions/-QuestionCard";
import { QuestionSetPanel } from "./submissions/-QuestionSetPanel";
import {
  VivaSessionReadinessPanel,
  type VivaSessionStartInput,
} from "./submissions/-VivaSessionReadinessPanel";

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
  set_position?: number | null;
  sort_order?: number;
  submission_id: string;
  teacher_note: string;
};

type SubmissionQuestion = {
  category: string;
  id: string;
  isHighlighted?: boolean;
  label: string;
  questionText: string;
  setPosition: number | null;
  sortOrder: number;
  teacherNote: string;
};

type VivaQuestionSetRecord = {
  id: string;
  status: QuestionSetStatus;
};

type VivaQuestionSetRow = {
  id: string;
  status: QuestionSetStatus;
  submission_id: string;
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
      "id, submission_id, category, question_text, teacher_note, is_recommended, sort_order, set_position",
    )
    .eq("submission_id", submissionId);

  if (error) {
    throw new Error("We could not load submission questions.");
  }

  const rows = (data as VivaQuestionRecord[] | null) ?? [];

  return rows
    .map((question) => ({
      category: question.category,
      id: question.id,
      isHighlighted: question.is_recommended ?? false,
      label: formatQuestionCategory(question.category),
      questionText: question.question_text,
      setPosition: question.set_position ?? null,
      sortOrder: question.sort_order ?? 0,
      teacherNote: question.teacher_note,
    }))
    .sort((left, right) => left.sortOrder - right.sortOrder);
}

async function fetchOrCreateVivaQuestionSet(
  submissionId: string,
): Promise<VivaQuestionSetRecord> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("viva_question_sets")
    .select("id, submission_id, status")
    .eq("submission_id", submissionId);

  if (error) {
    throw new Error("We could not load the Viva Question Set.");
  }

  const existing = (data as VivaQuestionSetRow[] | null)?.[0];

  if (existing) {
    return { id: existing.id, status: existing.status };
  }

  const { data: created, error: insertError } = await supabase
    .from("viva_question_sets")
    .insert({ submission_id: submissionId, status: "draft" })
    .select("id, submission_id, status");

  if (insertError) {
    throw new Error("We could not create the Viva Question Set.");
  }

  const createdRow = (created as VivaQuestionSetRow[] | null)?.[0];

  if (!createdRow) {
    throw new Error("We could not create the Viva Question Set.");
  }

  return { id: createdRow.id, status: createdRow.status };
}

async function updateQuestionSetPositions(
  updates: Array<{ id: string; position: number | null }>,
) {
  const supabase = getSupabaseBrowserClient();
  const results = await Promise.all(
    updates.map(({ id, position }) =>
      supabase
        .from("viva_questions")
        .update({ set_position: position })
        .eq("id", id),
    ),
  );

  if (results.some((result) => result.error)) {
    throw new Error("We could not update the Viva Question Set.");
  }
}

async function updateVivaQuestionSetStatus(
  questionSetId: string,
  status: QuestionSetStatus,
) {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("viva_question_sets")
    .update({
      ready_at: status === "ready" ? new Date().toISOString() : null,
      status,
    })
    .eq("id", questionSetId);

  if (error) {
    throw new Error("We could not update the Viva Question Set.");
  }
}

async function fetchActiveVivaSession(vivaQuestionSetId: string) {
  const supabase = getSupabaseBrowserClient();
  const repository = createSupabaseVivaSessionRepository(supabase);

  return repository.findActiveSession(vivaQuestionSetId);
}

type SubmissionVivaRecord = {
  id: string;
  submission_id: string;
  audio_path: string;
  file_name: string;
  created_at: string;
};

type SubmissionVivaPlayback = SubmissionVivaRecord & {
  access: VivaRecordingAccessResult;
};

async function fetchSubmissionViva(
  submissionId: string,
): Promise<SubmissionVivaPlayback[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("submission_viva")
    .select("id, submission_id, audio_path, file_name, created_at")
    .eq("submission_id", submissionId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("We could not load viva audio.");
  }

  const records = (data as SubmissionVivaRecord[] | null) ?? [];
  const repository = createSupabaseVivaRecordingAccessRepository(supabase);

  return Promise.all(
    records.map(async (record) => ({
      ...record,
      access: await resolveVivaRecordingAccess(record.audio_path, repository),
    })),
  );
}

/** Storage keys must not inherit user-controlled path segments or separators. */
function buildVivaAudioObjectName(fileName: string) {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-96);
  const uniquePrefix =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  return `${uniquePrefix}-${safeName}`;
}

async function uploadSubmissionVivaAudio(submissionId: string, file: File) {
  const supabase = getSupabaseBrowserClient();
  const filePath = `${submissionId}/${buildVivaAudioObjectName(file.name)}`;
  const uploadResult = await supabase.storage
    .from("submission-viva-audio")
    .upload(filePath, file, { upsert: false });

  if (uploadResult.error) {
    throw new Error("We could not upload viva audio.");
  }

  const { error } = await supabase.from("submission_viva").insert({
    submission_id: submissionId,
    audio_path: filePath,
    file_name: file.name,
  });

  if (error) {
    throw new Error("We could not save viva audio.");
  }
}

function describeUnavailableVivaRecording(
  status: Exclude<VivaRecordingAccessResult["status"], "allowed">,
) {
  switch (status) {
    case "expired":
      return "Your session has expired. Sign in again to play this recording.";
    case "missing":
      return "This recording is no longer available.";
    case "denied":
    default:
      return "You do not have permission to play this recording.";
  }
}

async function updateSubmissionQuestionText(
  questionId: string,
  questionText: string,
) {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("viva_questions")
    .update({ question_text: questionText })
    .eq("id", questionId);

  if (error) {
    throw new Error("We could not save the question.");
  }
}

async function addManualSubmissionQuestion(
  submissionId: string,
  input: ManualQuestionInput,
  nextSortOrder: number,
) {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("viva_questions").insert({
    submission_id: submissionId,
    category: input.category,
    question_text: input.questionText,
    teacher_note: input.teacherNote,
    is_recommended: false,
    sort_order: nextSortOrder,
  });

  if (error) {
    throw new Error("We could not add the question.");
  }
}

function formatSubmissionDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

function splitSubmissionTextIntoParagraphs(value: string) {
  return value
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function countSubmissionWords(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

const MAX_VIVA_AUDIO_MB = 500;
const MAX_VIVA_AUDIO_BYTES = MAX_VIVA_AUDIO_MB * 1024 * 1024;

const GENERATION_ATTEMPT_KEY_PREFIX = "viva-generation-attempted:";

function markGenerationAttempted(submissionId: string) {
  try {
    window.sessionStorage.setItem(
      `${GENERATION_ATTEMPT_KEY_PREFIX}${submissionId}`,
      "1",
    );
  } catch {
    // Storage can be unavailable (private mode, blocked cookies). The guard is
    // an optimisation against duplicate generation, never a correctness gate.
  }
}

function hasGenerationBeenAttempted(submissionId: string) {
  try {
    return (
      window.sessionStorage.getItem(
        `${GENERATION_ATTEMPT_KEY_PREFIX}${submissionId}`,
      ) !== null
    );
  } catch {
    return false;
  }
}

/** First sentence or so of the submission, for verifying the work in front of you. */
function buildSubmissionExcerpt(value: string, maxLength = 120) {
  const normalized = value.trim().replace(/\s+/g, " ");

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trimEnd()}…`;
}

function SubmissionBreadcrumb({ title }: { title?: string }) {
  return (
    <Breadcrumb
      items={[
        { label: "Submissions", to: "/submissions" },
        { label: title ?? "Submission" },
      ]}
    />
  );
}

type SubmissionGenerationShellProps = {
  submissionTitle: string;
};

function SubmissionGenerationShell({
  submissionTitle,
}: SubmissionGenerationShellProps) {
  return (
    <div className="grid gap-8">
      <SubmissionBreadcrumb title={submissionTitle} />

      <div className={cn(paperPanelClassName, "grid w-full gap-6 p-8")}>
        <div className="grid gap-3">
          <span className={eyebrowClassName}>Submissions</span>
          <Heading>Preparing viva questions</Heading>
          <p
            className={cn(mutedTextClassName, "max-w-[68ch] text-sm leading-6")}
          >
            The submission has been saved. We are reading{" "}
            <span className="text-on-surface">{submissionTitle}</span> and
            drafting an examiner-ready set of questions, ownership checks, and
            teacher notes.
          </p>
        </div>

        <p
          className={cn(mutedTextClassName, "max-w-[62ch] text-sm leading-6")}
          role="status"
        >
          This usually takes a few seconds. You can stay on this page — it will
          fill in as soon as the questions are ready.
        </p>
      </div>
    </div>
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
    <div className="grid gap-8">
      <SubmissionBreadcrumb />
      <Card as="section" className="gap-5">
        <span className={eyebrowClassName}>Submissions</span>
        <Heading>Viva questions unavailable</Heading>
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
      </Card>
    </div>
  );
}

export function SubmissionDetailPage() {
  const { submissionId } = Route.useParams();
  const queryClient = useQueryClient();
  const generateSubmissionViva = useGenerateSubmissionViva();
  const [generationState, setGenerationState] =
    React.useState<GenerationState>("idle");
  const [isUploadingViva, setIsUploadingViva] = React.useState(false);
  const [vivaUploadErrorMessage, setVivaUploadErrorMessage] = React.useState<
    string | null
  >(null);
  const [generationErrorMessage, setGenerationErrorMessage] = React.useState<
    string | null
  >(null);
  const [hasCompletedGeneration, setHasCompletedGeneration] =
    React.useState(false);
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
  const vivaAudioQuery = useQuery({
    queryFn: () => fetchSubmissionViva(submissionId),
    queryKey: ["submission-viva", submissionId],
  });
  const vivaAudioRecords = vivaAudioQuery.data ?? [];
  const questionSetQuery = useQuery({
    queryFn: () => fetchOrCreateVivaQuestionSet(submissionId),
    queryKey: ["viva-question-set", submissionId],
  });
  const vivaQuestionSetId = questionSetQuery.data?.id;
  const vivaSessionQuery = useQuery({
    enabled: Boolean(vivaQuestionSetId),
    queryFn: () => fetchActiveVivaSession(vivaQuestionSetId as string),
    queryKey: ["viva-session", vivaQuestionSetId ?? null],
  });
  const vivaSessionId = vivaSessionQuery.data?.id;
  const checkEquipment = useEquipmentCheck();

  const saveQuestionText = React.useCallback(
    async (questionId: string, questionText: string) => {
      await updateSubmissionQuestionText(questionId, questionText);
      await queryClient.invalidateQueries({
        queryKey: ["submission-questions", submissionId],
      });
    },
    [queryClient, submissionId],
  );

  const addManualQuestion = React.useCallback(
    async (input: ManualQuestionInput) => {
      const nextSortOrder =
        questions.length > 0
          ? Math.max(...questions.map((question) => question.sortOrder)) + 1
          : 0;

      await addManualSubmissionQuestion(submissionId, input, nextSortOrder);
      await queryClient.invalidateQueries({
        queryKey: ["submission-questions", submissionId],
      });
    },
    [questions, queryClient, submissionId],
  );

  const toggleQuestionInSet = React.useCallback(
    async (questionId: string, included: boolean) => {
      const position = included
        ? computeNextSetPosition(questions.map((question) => question.setPosition))
        : null;

      await updateQuestionSetPositions([{ id: questionId, position }]);
      await queryClient.invalidateQueries({
        queryKey: ["submission-questions", submissionId],
      });
    },
    [questions, queryClient, submissionId],
  );

  const moveSetQuestion = React.useCallback(
    async (questionId: string, direction: "up" | "down") => {
      const orderedQuestions = sortQuestionsBySetPosition(questions);
      const reordered = moveQuestionInSet(orderedQuestions, questionId, direction);
      const positions = computeSequentialPositions(
        reordered.map((question) => question.id),
      );

      await updateQuestionSetPositions(positions);
      await queryClient.invalidateQueries({
        queryKey: ["submission-questions", submissionId],
      });
    },
    [questions, queryClient, submissionId],
  );

  const removeQuestionFromSet = React.useCallback(
    (questionId: string) => toggleQuestionInSet(questionId, false),
    [toggleQuestionInSet],
  );

  const updateSetStatus = React.useCallback(
    async (status: QuestionSetStatus) => {
      if (!questionSetQuery.data) {
        return;
      }

      await updateVivaQuestionSetStatus(questionSetQuery.data.id, status);
      await queryClient.invalidateQueries({
        queryKey: ["viva-question-set", submissionId],
      });
    },
    [questionSetQuery.data, queryClient, submissionId],
  );

  const startSessionForQuestionSet = React.useCallback(
    async (input: VivaSessionStartInput) => {
      if (!questionSetQuery.data) {
        return;
      }

      const supabase = getSupabaseBrowserClient();
      const repository = createSupabaseVivaSessionRepository(supabase);

      await startVivaSession(
        {
          accessibilityAdjustments: input.accessibilityAdjustments,
          consentDeclinedReason: input.consentDeclinedReason,
          consentState: input.consentState,
          equipmentCheckResult: input.equipmentCheckResult,
          expectedDurationMinutes: input.expectedDurationMinutes,
          submissionId,
          vivaQuestionSetId: questionSetQuery.data.id,
        },
        repository,
      );

      await queryClient.invalidateQueries({
        queryKey: ["viva-session", questionSetQuery.data.id],
      });
    },
    [questionSetQuery.data, queryClient, submissionId],
  );

  const runGeneration = React.useCallback(async () => {
    hasTriggeredGenerationRef.current = true;
    markGenerationAttempted(submissionId);
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
    setHasCompletedGeneration(true);
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

    // A refresh remounts this component and resets the ref. Without this guard a
    // reload mid-generation starts a second, duplicate generation run.
    if (hasGenerationBeenAttempted(submissionId)) {
      hasTriggeredGenerationRef.current = true;
      setHasCompletedGeneration(true);
      return;
    }

    void runGeneration();
  }, [
    generationState,
    questions.length,
    questionsQuery.error,
    questionsQuery.isLoading,
    runGeneration,
    submissionId,
    submissionQuery.data,
  ]);

  if (submissionQuery.isLoading) {
    return (
      <div className="grid gap-8">
        <SubmissionBreadcrumb />
        <Card as="section">
          <span className={eyebrowClassName}>Submissions</span>
          <Heading>Loading submission</Heading>
        </Card>
      </div>
    );
  }

  if (submissionQuery.error instanceof Error) {
    return (
      <div className="grid gap-8">
        <SubmissionBreadcrumb />
        <Card as="section">
          <span className={eyebrowClassName}>Submissions</span>
          <Heading>Submission unavailable</Heading>
          <p className="text-sm leading-6 text-error">
            {submissionQuery.error.message}
          </p>
        </Card>
      </div>
    );
  }

  if (questionsQuery.error instanceof Error) {
    return (
      <div className="grid gap-8">
        <SubmissionBreadcrumb />
        <Card as="section">
          <span className={eyebrowClassName}>Submissions</span>
          <Heading>Submission unavailable</Heading>
          <p className="text-sm leading-6 text-error">
            {questionsQuery.error.message}
          </p>
        </Card>
      </div>
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

    // Generation finished but produced nothing. Without this the page would sit
    // on the "preparing" shell forever, with retry blocked by the trigger guard.
    if (generationState === "idle" && hasCompletedGeneration) {
      return (
        <SubmissionGenerationFailure
          errorMessage="We finished reading this submission but did not produce any viva questions."
          onRetry={() => {
            void runGeneration();
          }}
        />
      );
    }

    return (
      <SubmissionGenerationShell
        submissionTitle={submission.submission_title}
      />
    );
  }

  if (questionSetQuery.isLoading) {
    return (
      <div className="grid gap-8">
        <SubmissionBreadcrumb title={submission.submission_title} />
        <Card as="section">
          <span className={eyebrowClassName}>Submissions</span>
          <Heading>Loading Viva Question Set</Heading>
        </Card>
      </div>
    );
  }

  if (questionSetQuery.error instanceof Error) {
    return (
      <div className="grid gap-8">
        <SubmissionBreadcrumb title={submission.submission_title} />
        <Card as="section">
          <span className={eyebrowClassName}>Submissions</span>
          <Heading>Submission unavailable</Heading>
          <p className="text-sm leading-6 text-error">
            {questionSetQuery.error.message}
          </p>
        </Card>
      </div>
    );
  }

  const questionSet = questionSetQuery.data as VivaQuestionSetRecord;
  const setQuestions = sortQuestionsBySetPosition(questions);
  const categoryBalance = summarizeCategoryBalance(setQuestions);
  const estimatedDurationMinutes = estimateQuestionSetDurationMinutes(
    setQuestions.length,
  );

  const submissionParagraphs = splitSubmissionTextIntoParagraphs(
    submission.submission_text,
  );
  const submissionWordCount = countSubmissionWords(submission.submission_text);
  const submissionExcerpt = buildSubmissionExcerpt(submission.submission_text);

  return (
    <PageFrame
      breadcrumb={<SubmissionBreadcrumb title={submission.submission_title} />}
      title={submission.submission_title}
      description={<>Submitted {formatSubmissionDate(submission.created_at)}</>}
    >
      <Tabs defaultValue="viva-questions" className="gap-6">
        <TabsList
          variant="line"
          aria-label="Submission detail views"
          className="max-w-[24rem] justify-start self-start gap-6 border-b border-outline-variant px-0 pb-0"
        >
          <TabsTrigger
            value="submission"
            className="rounded-none border-x-0 border-t-0 px-0 pb-4 pt-0 font-sans text-[12px] font-bold uppercase tracking-[0.08em] text-on-surface-variant data-active:text-primary group-data-[variant=line]/tabs-list:after:bg-primary"
          >
            Submission
          </TabsTrigger>
          <TabsTrigger
            value="viva-questions"
            className="rounded-none border-x-0 border-t-0 px-0 pb-4 pt-0 font-sans text-[12px] font-bold uppercase tracking-[0.08em] text-on-surface-variant data-active:text-primary group-data-[variant=line]/tabs-list:after:bg-primary"
          >
            Viva Questions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="submission" className="mt-0">
          <article className={cn(paperPanelClassName, "p-8")}>
            <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-outline-variant pb-4">
              <span className={eyebrowClassName}>Submission text</span>
              <span className={cn(mutedTextClassName, "text-sm")}>
                {submissionWordCount.toLocaleString("en-GB")} words
              </span>
            </div>
            <div className="mt-6 max-w-[70ch] space-y-4 font-serif text-lg leading-relaxed text-on-surface">
              {submissionParagraphs.map((paragraph, index) => (
                <p key={`${index}-${paragraph.slice(0, 32)}`}>{paragraph}</p>
              ))}
            </div>
          </article>
        </TabsContent>

        <TabsContent value="viva-questions" className="mt-0">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
            <section className="grid gap-4 lg:col-span-7">
              <Heading level={2}>Viva Questions for this Submission</Heading>

              {questions.map((question) => (
                <QuestionCard
                  key={question.id}
                  id={question.id}
                  isHighlighted={question.isHighlighted}
                  isInSet={question.setPosition !== null}
                  label={question.label}
                  questionText={question.questionText}
                  teacherNote={question.teacherNote}
                  onSave={(questionText) =>
                    saveQuestionText(question.id, questionText)
                  }
                  onToggleInSet={(included) =>
                    toggleQuestionInSet(question.id, included)
                  }
                />
              ))}

              <AddManualQuestionCard onAdd={addManualQuestion} />
            </section>

            <aside className="grid min-w-0 content-start gap-8 [&>*]:min-w-0 lg:col-span-5 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-1">
              <div className="grid gap-4">
                <span className={eyebrowClassName}>Stage 1 · Build the set</span>
                <QuestionSetPanel
                  categoryBalance={categoryBalance}
                  estimatedDurationMinutes={estimatedDurationMinutes}
                  status={questionSet.status}
                  questions={setQuestions.map((question) => ({
                    category: question.category,
                    id: question.id,
                    label: question.label,
                    questionText: question.questionText,
                  }))}
                  onMarkReady={() => updateSetStatus("ready")}
                  onRevertToDraft={() => updateSetStatus("draft")}
                  onMoveQuestionUp={(questionId) =>
                    moveSetQuestion(questionId, "up")
                  }
                  onMoveQuestionDown={(questionId) =>
                    moveSetQuestion(questionId, "down")
                  }
                  onRemoveQuestion={removeQuestionFromSet}
                />
              </div>

              <div className="grid gap-4 border-t border-outline-variant pt-8">
                <span className={eyebrowClassName}>Stage 2 · Prepare to conduct</span>
                <VivaSessionReadinessPanel
                  activeSession={
                    vivaSessionQuery.data
                      ? { startedAt: vivaSessionQuery.data.startedAt }
                      : null
                  }
                  estimatedDurationMinutes={estimatedDurationMinutes}
                  onCheckEquipment={checkEquipment}
                  onStart={startSessionForQuestionSet}
                  questionSetStatus={questionSet.status}
                  submissionExcerpt={submissionExcerpt}
                  submissionTitle={submission.submission_title}
                  submittedAt={submission.created_at}
                />

                {vivaSessionQuery.error instanceof Error ? (
                  <p className="text-sm leading-6 text-error" role="alert">
                    {vivaSessionQuery.error.message}
                  </p>
                ) : null}
              </div>

              {vivaSessionQuery.data ? (
                <div className="grid gap-4 border-t border-outline-variant pt-8">
                  <span className={eyebrowClassName}>
                    Stage 3 · Conduct and record
                  </span>
                  <div className="grid gap-3 border border-primary bg-surface-container-lowest p-6">
                    <h2 className={subheadClassName}>Not recording yet</h2>
                    <p className="max-w-[52ch] text-sm leading-6 text-on-surface">
                      The session is open, but no audio is being captured. Open
                      Conduct mode and press Start recording to capture the viva.
                    </p>
                    <div>
                      <Link
                        to="/submissions/$submissionId/conduct"
                        params={{ submissionId }}
                        className={buttonClassName({
                          className: "bg-primary border-primary",
                        })}
                      >
                        Open Conduct mode
                      </Link>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="grid gap-3 border-t border-outline-variant pt-8">
                <span className={eyebrowClassName}>Evidence</span>
                <h2 className={subheadClassName}>Oral Examination Audio</h2>
                <p className={cn(mutedTextClassName, "text-sm leading-6")}>
                  Upload a recorded viva for this submission.
                </p>
                <label
                  className="grid gap-2 text-sm"
                  htmlFor="submissionVivaUpload"
                >
                  Upload viva audio
                  <input
                    aria-label="Upload viva audio"
                    id="submissionVivaUpload"
                    type="file"
                    accept="audio/*"
                    disabled={isUploadingViva}
                    onChange={async (event) => {
                      const file = event.target.files?.[0];

                      if (!file) {
                        return;
                      }

                      if (!file.type.startsWith("audio/")) {
                        setVivaUploadErrorMessage(
                          "That file is not audio. Choose a recording of the viva.",
                        );
                        event.target.value = "";
                        return;
                      }

                      if (file.size > MAX_VIVA_AUDIO_BYTES) {
                        setVivaUploadErrorMessage(
                          `That recording is larger than ${MAX_VIVA_AUDIO_MB}MB. Upload a smaller file or split the recording.`,
                        );
                        event.target.value = "";
                        return;
                      }

                      setIsUploadingViva(true);
                      setVivaUploadErrorMessage(null);

                      try {
                        await uploadSubmissionVivaAudio(submissionId, file);
                        await queryClient.invalidateQueries({
                          queryKey: ["submission-viva", submissionId],
                        });
                      } catch (error) {
                        setVivaUploadErrorMessage(
                          error instanceof Error
                            ? error.message
                            : "We could not upload viva audio.",
                        );
                      } finally {
                        setIsUploadingViva(false);
                      }
                    }}
                  />
                </label>
                <div role="status">
                  {isUploadingViva ? (
                    <p className={cn(mutedTextClassName, "text-sm")}>
                      Uploading viva audio…
                    </p>
                  ) : null}
                </div>
                {vivaUploadErrorMessage ? (
                  <p className="text-sm text-error" role="alert">
                    {vivaUploadErrorMessage}
                  </p>
                ) : null}
                {vivaAudioRecords.map((record) => (
                  <article
                    key={record.id}
                    className="grid gap-2 border border-outline-variant bg-surface-container-lowest p-4"
                  >
                    <p className="text-sm font-medium">{record.file_name}</p>
                    {record.access.status === "allowed" ? (
                      <audio
                        className="w-full"
                        data-testid="submission-viva-player"
                        controls
                        src={record.access.signedUrl}
                      >
                        <track kind="captions" />
                      </audio>
                    ) : (
                      <p
                        className="text-sm text-error"
                        data-testid="submission-viva-unavailable"
                      >
                        {describeUnavailableVivaRecording(record.access.status)}
                      </p>
                    )}
                  </article>
                ))}
                {vivaAudioQuery.isLoading ? (
                  <p className={cn(mutedTextClassName, "text-sm")} role="status">
                    Loading viva audio…
                  </p>
                ) : null}
                {vivaAudioQuery.error instanceof Error ? (
                  <p className="text-sm text-error" role="alert">
                    {vivaAudioQuery.error.message}
                  </p>
                ) : null}
                {!vivaAudioQuery.isLoading &&
                !vivaAudioQuery.error &&
                vivaAudioRecords.length === 0 ? (
                  <p className={cn(mutedTextClassName, "text-sm leading-6")}>
                    No recording has been uploaded for this submission yet.
                  </p>
                ) : null}
              </div>
            </aside>
          </div>
        </TabsContent>
      </Tabs>
    </PageFrame>
  );
}
