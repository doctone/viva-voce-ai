import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Breadcrumb,
  Button,
  Card,
  Heading,
  PageFrame,
  buttonClassName,
} from "../../components/ui";
import { useGenerateSubmissionViva } from "../../features/submissions/useGenerateSubmissionViva";
import {
  claimVivaGenerationRun,
  describeVivaGenerationFailure,
  isVivaGenerationRecordStale,
  readVivaGenerationRecord,
  startVivaGenerationRun,
  writeVivaGenerationRecord,
  GENERATION_STALE_AFTER_MS,
  RECOVERED_GENERATION_POLL_MS,
  type VivaGenerationResult,
} from "../../features/submissions/vivaGenerationRun";
import { useLiveTranscription } from "../../features/submissions/useLiveTranscription";
import { useTranscribeVivaChunk } from "../../features/submissions/useTranscribeVivaChunk";
import { useVivaAudioCapture } from "../../features/submissions/useVivaAudioCapture";
import {
  assembleTranscript,
  type TranscriptSegment,
} from "../../features/submissions/vivaTranscription";
import { selectVisibleTranscript } from "../../features/submissions/liveTranscription";
import {
  selectSupersededRecordings,
  type SubmissionRecordingRef,
} from "../../features/submissions/submissionRecording";
import {
  computeElapsedSeconds,
  type RecordingStatus,
} from "../../features/submissions/vivaRecordingCapture";
import {
  createSupabaseVivaSessionRepository,
  endVivaSession,
  startFreshVivaSession,
} from "../../features/submissions/vivaSession";
import {
  createSupabaseVivaRecordingAccessRepository,
  resolveVivaRecordingAccess,
  type VivaRecordingAccessResult,
} from "../../features/submissions/vivaRecordingAccess";
import {
  estimateQuestionSetDurationMinutes,
  formatQuestionCategory,
  type QuestionSetStatus,
} from "../../features/submissions/vivaQuestionSet";
import { cn } from "~/lib/utils";
import {
  eyebrowClassName,
  mutedTextClassName,
  paperPanelClassName,
  readingClassName,
} from "~/lib/class-names";
import { getSupabaseBrowserClient } from "../../utils/supabase-browser";
import {
  AddManualQuestionCard,
  type ManualQuestionInput,
  QuestionCard,
} from "./submissions/-QuestionCard";
import { RecordVivaPanel } from "./submissions/-RecordVivaPanel";

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

  const { data, error } = await supabase
    .from("submission_viva")
    .insert({
      submission_id: submissionId,
      audio_path: filePath,
      file_name: file.name,
    })
    .select("id, audio_path");

  const saved = (data as Array<{ audio_path: string; id: string }> | null)?.[0];

  if (error || !saved) {
    throw new Error("We could not save viva audio.");
  }

  return { audioPath: saved.audio_path, id: saved.id };
}

/**
 * A submission keeps one recording, so a new one replaces whatever was there.
 *
 * Replacement happens after the new recording is durable, never before: a take
 * that fails to upload must not also destroy the recording it was replacing.
 */
async function replaceEarlierRecordings(submissionId: string, keepId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("submission_viva")
    .select("id, audio_path")
    .eq("submission_id", submissionId);

  if (error) {
    return;
  }

  const recordings: SubmissionRecordingRef[] = (
    (data as Array<{ audio_path: string; id: string }> | null) ?? []
  ).map((row) => ({ audioPath: row.audio_path, id: row.id }));

  const superseded = selectSupersededRecordings(recordings, keepId);

  if (superseded.length === 0) {
    return;
  }

  await supabase.storage
    .from("submission-viva-audio")
    .remove(superseded.map((recording) => recording.audioPath));

  await supabase
    .from("submission_viva")
    .delete()
    .in(
      "id",
      superseded.map((recording) => recording.id),
    );
}

/**
 * The submission's most recent Viva Session, so a transcript recorded in an
 * earlier page life can be read back. A submission keeps one recording, and
 * only one session per question set can be active at a time, so the latest
 * session is the one whose transcript belongs beside that recording.
 */
async function fetchLatestVivaSessionId(
  submissionId: string,
): Promise<string | null> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("viva_sessions")
    .select("id")
    .eq("submission_id", submissionId)
    .order("started_at", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error("We could not load the viva session.");
  }

  return (data as Array<{ id: string }> | null)?.[0]?.id ?? null;
}

async function fetchTranscriptSegments(
  vivaSessionId: string,
): Promise<TranscriptSegment[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("viva_transcript_segments")
    .select("sequence, text")
    .eq("viva_session_id", vivaSessionId);

  if (error) {
    throw new Error("We could not load the transcript.");
  }

  return (data as TranscriptSegment[] | null) ?? [];
}

type VivaQuestionSetRow = {
  id: string;
  status: QuestionSetStatus;
  submission_id: string;
};

/**
 * The question set is the parent a Viva Session hangs off. Nothing in the
 * record-first flow asks a teacher to create one, so it is created on demand
 * the first time they record.
 */
async function findOrCreateVivaQuestionSetId(
  submissionId: string,
): Promise<string> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("viva_question_sets")
    .select("id, submission_id, status")
    .eq("submission_id", submissionId);

  if (error) {
    throw new Error("We could not prepare this viva for recording.");
  }

  const existing = (data as VivaQuestionSetRow[] | null)?.[0];

  if (existing) {
    return existing.id;
  }

  const { data: created, error: insertError } = await supabase
    .from("viva_question_sets")
    .insert({ submission_id: submissionId, status: "ready" })
    .select("id, submission_id, status");

  const createdRow = (created as VivaQuestionSetRow[] | null)?.[0];

  if (insertError || !createdRow) {
    throw new Error("We could not prepare this viva for recording.");
  }

  return createdRow.id;
}

async function uploadRecordedViva(submissionId: string, blob: Blob) {
  const extension = blob.type.startsWith("audio/mp4") ? "m4a" : "webm";
  const recordedAt = new Date().toISOString().replace(/[:.]/g, "-");
  const file = new File([blob], `viva-${recordedAt}.${extension}`, {
    type: blob.type,
  });

  const saved = await uploadSubmissionVivaAudio(submissionId, file);
  await replaceEarlierRecordings(submissionId, saved.id);
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

// Generation-run bookkeeping lives in the feature module so the new-submission
// page and this page share one source of truth for a run's state.

/** First sentence or so of the submission, for verifying the work in front of you. */
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

function SectionHeader({
  id,
  meta,
  title,
}: {
  id: string;
  meta?: string;
  title: string;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-outline-variant pb-3">
      <h2 className={eyebrowClassName} id={id}>
        {title}
      </h2>
      {meta ? (
        <span className={cn(mutedTextClassName, "text-sm")}>{meta}</span>
      ) : null}
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
  // A run started in a previous page life: no promise to await, so the questions
  // are recovered by polling.
  const [isRecoveringGeneration, setIsRecoveringGeneration] =
    React.useState(false);
  const [recordingStartedAt, setRecordingStartedAt] = React.useState<
    string | null
  >(null);
  const [pausedElapsedSeconds, setPausedElapsedSeconds] = React.useState(0);
  const [now, setNow] = React.useState(() => new Date());
  const [isSavingRecording, setIsSavingRecording] = React.useState(false);
  // The last chunks upload and transcribe after the teacher stops, so the
  // transcript keeps refreshing for a while rather than being fetched once.
  const [isSettlingTranscript, setIsSettlingTranscript] = React.useState(false);
  const [failedTranscriptionCount, setFailedTranscriptionCount] =
    React.useState(0);
  const [recordingErrorMessage, setRecordingErrorMessage] = React.useState<
    string | null
  >(null);
  const vivaSessionIdRef = React.useRef<string | null>(null);
  const hasTriggeredGenerationRef = React.useRef(false);
  const submissionQuery = useQuery({
    queryFn: () => fetchSubmission(submissionId),
    queryKey: ["submission", submissionId],
  });
  const questionsQuery = useQuery({
    queryFn: () => fetchSubmissionQuestions(submissionId),
    queryKey: ["submission-questions", submissionId],
    refetchInterval: isRecoveringGeneration
      ? RECOVERED_GENERATION_POLL_MS
      : false,
  });

  const questions = questionsQuery.data ?? [];
  const vivaAudioQuery = useQuery({
    queryFn: () => fetchSubmissionViva(submissionId),
    queryKey: ["submission-viva", submissionId],
  });
  const vivaAudioRecords = vivaAudioQuery.data ?? [];

  // Runs only once the microphone is available, so a declined prompt never
  // leaves a Viva Session behind. A granted prompt is the equipment check.
  const resolveVivaSessionId = React.useCallback(async () => {
    const vivaQuestionSetId = await findOrCreateVivaQuestionSetId(submissionId);
    const repository = createSupabaseVivaSessionRepository(
      getSupabaseBrowserClient(),
    );

    const session = await startFreshVivaSession(
      {
        accessibilityAdjustments: "",
        consentDeclinedReason: null,
        consentState: "consent_given",
        equipmentCheckResult: "passed",
        expectedDurationMinutes: estimateQuestionSetDurationMinutes(
          questionsQuery.data?.length ?? 0,
        ),
        submissionId,
        vivaQuestionSetId,
      },
      repository,
    );

    vivaSessionIdRef.current = session.id;
    setStartedVivaSessionId(session.id);

    return session.id;
  }, [questionsQuery.data?.length, submissionId]);

  const transcribeVivaChunk = useTranscribeVivaChunk();
  const [startedVivaSessionId, setStartedVivaSessionId] = React.useState<
    string | null
  >(null);
  // Without this the page would only ever know a session it created itself, so
  // leaving for the submissions table and coming back would blank a transcript
  // that is sitting in the database.
  const vivaSessionQuery = useQuery({
    queryFn: () => fetchLatestVivaSessionId(submissionId),
    queryKey: ["viva-session", submissionId],
  });
  // A session started in this page life is newer than anything the query has
  // seen, so it takes precedence until the query catches up.
  const vivaSessionId = startedVivaSessionId ?? vivaSessionQuery.data ?? null;

  const handleChunkUploaded = React.useCallback(
    (uploadedSessionId: string, sequence: number) => {
      // A transcription that fails must not disturb a viva in progress — the
      // audio is already durable — but it must not vanish either, or nobody
      // can tell a working transcript from a broken one.
      void transcribeVivaChunk(uploadedSessionId, sequence)
        .then((result) => {
          if (result.outcome === "failed" || result.outcome === "chunk_unavailable") {
            setFailedTranscriptionCount((count) => count + 1);
          }
        })
        .catch(() => setFailedTranscriptionCount((count) => count + 1));
    },
    [transcribeVivaChunk],
  );

  const capture = useVivaAudioCapture(resolveVivaSessionId, handleChunkUploaded);
  const captureStatus: RecordingStatus = capture.status;

  const transcriptQuery = useQuery({
    enabled: Boolean(vivaSessionId),
    queryFn: () => fetchTranscriptSegments(vivaSessionId as string),
    queryKey: ["viva-transcript", vivaSessionId],
    // Text trails the conversation by a chunk, so it is polled rather than
    // fetched once — and only while there is a live viva to trail.
    refetchInterval:
      captureStatus === "recording" ||
      captureStatus === "paused" ||
      isSettlingTranscript
        ? 3_000
        : false,
  });

  const storedTranscript = assembleTranscript(transcriptQuery.data ?? []);
  const liveTranscription = useLiveTranscription(
    capture.getMediaStream,
    captureStatus === "recording",
  );

  // While recording, the teacher reads the live feed. Once stopped, the stored
  // transcript takes over — but only once it has something to show, so the box
  // never blanks while the last chunks are still being transcribed.
  const isLive = captureStatus === "recording" || captureStatus === "paused";
  const transcript = selectVisibleTranscript({
    isRecording: isLive,
    liveText: liveTranscription.text,
    storedText: storedTranscript,
  });

  // One ticking clock while recording; paused time is banked so the timer does
  // not jump forward over a pause.
  React.useEffect(() => {
    if (captureStatus !== "recording") {
      return;
    }

    const timer = window.setInterval(() => setNow(new Date()), 500);

    return () => window.clearInterval(timer);
  }, [captureStatus]);

  const elapsedSeconds =
    captureStatus === "recording" && recordingStartedAt
      ? pausedElapsedSeconds + computeElapsedSeconds(recordingStartedAt, now)
      : pausedElapsedSeconds;

  const startRecording = React.useCallback(async () => {
    setRecordingErrorMessage(null);
    setPausedElapsedSeconds(0);

    try {
      await capture.start();
      setRecordingStartedAt(new Date().toISOString());
      setNow(new Date());
    } catch (error) {
      setRecordingErrorMessage(
        error instanceof Error
          ? error.message
          : "We could not start recording this viva.",
      );
    }
  }, [capture]);

  const togglePauseRecording = React.useCallback(() => {
    if (captureStatus === "recording" && recordingStartedAt) {
      setPausedElapsedSeconds(
        (banked) => banked + computeElapsedSeconds(recordingStartedAt, new Date()),
      );
      setRecordingStartedAt(null);
    }

    if (captureStatus === "paused") {
      setRecordingStartedAt(new Date().toISOString());
      setNow(new Date());
    }

    capture.togglePause();
  }, [capture, captureStatus, recordingStartedAt]);

  const stopRecording = React.useCallback(async () => {
    if (captureStatus === "recording" && recordingStartedAt) {
      setPausedElapsedSeconds(
        (banked) => banked + computeElapsedSeconds(recordingStartedAt, new Date()),
      );
    }

    setRecordingStartedAt(null);
    setIsSavingRecording(true);
    setRecordingErrorMessage(null);

    // Waits for the recorder to flush its final timeslice, so a take shorter
    // than one chunk is still saved whole.
    const blob = await capture.stop();

    setIsSettlingTranscript(true);
    window.setTimeout(() => setIsSettlingTranscript(false), 45_000);

    if (!blob) {
      setIsSavingRecording(false);
      setRecordingErrorMessage(
        "That recording captured no audio, so nothing was saved.",
      );
      return;
    }

    try {
      await uploadRecordedViva(submissionId, blob);
      await queryClient.invalidateQueries({
        queryKey: ["submission-viva", submissionId],
      });
    } catch (error) {
      setRecordingErrorMessage(
        error instanceof Error
          ? error.message
          : "We could not save this recording.",
      );
    } finally {
      setIsSavingRecording(false);
    }

    // Ending the session is what lets the next take start its own chunk
    // sequence. Failing to end it must not lose the recording just saved.
    const endedSessionId = vivaSessionIdRef.current;

    if (endedSessionId) {
      try {
        await endVivaSession(
          endedSessionId,
          createSupabaseVivaSessionRepository(getSupabaseBrowserClient()),
        );
      } catch {
        // Left active. The next take will surface the collision rather than
        // silently overwrite audio that is already evidence.
      }

      vivaSessionIdRef.current = null;
    }
  }, [capture, captureStatus, queryClient, recordingStartedAt, submissionId]);

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

  /**
   * Awaits a run whether this page started it or the new-submission page did.
   * The registry writes the durable record; this only reflects it in the UI.
   */
  const awaitGeneration = React.useCallback(
    async (run: Promise<VivaGenerationResult>) => {
      hasTriggeredGenerationRef.current = true;
      setIsRecoveringGeneration(false);
      setGenerationState("running");
      setGenerationErrorMessage(null);

      const result = await run;

      if (result.status === "failed") {
        setGenerationState("failed");
        setGenerationErrorMessage(describeVivaGenerationFailure(result));
        return;
      }

      setGenerationState("idle");
      setHasCompletedGeneration(true);
      await queryClient.invalidateQueries({
        queryKey: ["submission-questions", submissionId],
      });
    },
    [queryClient, submissionId],
  );

  const runGeneration = React.useCallback(async () => {
    await awaitGeneration(
      startVivaGenerationRun(submissionId, generateSubmissionViva),
    );
  }, [awaitGeneration, generateSubmissionViva, submissionId]);

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

    // The new-submission page starts generation before navigating here, so the
    // run is usually already in flight and still awaitable — that path keeps the
    // real error message, which a reload cannot.
    const inFlight = claimVivaGenerationRun(submissionId);

    if (inFlight) {
      void awaitGeneration(inFlight);
      return;
    }

    // A refresh remounts this component and resets the ref, so without a record
    // of the previous run a reload would start a second, duplicate generation.
    const record = readVivaGenerationRecord(submissionId);

    if (record && !isVivaGenerationRecordStale(record, Date.now())) {
      hasTriggeredGenerationRef.current = true;

      if (record.status === "running") {
        // The reload abandoned the client promise, but the server keeps writing
        // questions. Poll for them rather than restarting or claiming failure.
        setIsRecoveringGeneration(true);
        return;
      }

      if (record.status === "failed") {
        setGenerationState("failed");
        setGenerationErrorMessage(record.errorMessage);
        return;
      }

      // Genuinely finished and produced nothing.
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

  // A recovered run has no promise to await, so the stale cutoff is what ends
  // the wait if the server never lands the questions.
  React.useEffect(() => {
    if (!isRecoveringGeneration) {
      return;
    }

    const record = readVivaGenerationRecord(submissionId);

    if (!record || record.status !== "running") {
      return;
    }

    const remainingMs =
      record.startedAt + GENERATION_STALE_AFTER_MS - Date.now();

    if (remainingMs <= 0) {
      setIsRecoveringGeneration(false);
      setHasCompletedGeneration(true);
      return;
    }

    const timeout = setTimeout(() => {
      setIsRecoveringGeneration(false);
      setHasCompletedGeneration(true);
    }, remainingMs);

    return () => clearTimeout(timeout);
  }, [isRecoveringGeneration, submissionId]);

  React.useEffect(() => {
    if (isRecoveringGeneration && questions.length > 0) {
      setIsRecoveringGeneration(false);
      writeVivaGenerationRecord(submissionId, { status: "completed" });
    }
  }, [isRecoveringGeneration, questions.length, submissionId]);

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

  const estimatedDurationMinutes = estimateQuestionSetDurationMinutes(
    questions.length,
  );

  const submissionParagraphs = splitSubmissionTextIntoParagraphs(
    submission.submission_text,
  );
  const submissionWordCount = countSubmissionWords(submission.submission_text);

  return (
    <PageFrame
      breadcrumb={<SubmissionBreadcrumb title={submission.submission_title} />}
      title={submission.submission_title}
      description={
        <>
          Submitted {formatSubmissionDate(submission.created_at)} ·{" "}
          {submissionWordCount.toLocaleString("en-GB")} words ·{" "}
          {questions.length}{" "}
          {questions.length === 1 ? "viva question" : "viva questions"}
        </>
      }
    >
      <div className="grid gap-12">
        <RecordVivaPanel
          elapsedSeconds={elapsedSeconds}
          failedChunkCount={capture.failedChunkCount}
          getMediaStream={capture.getMediaStream}
          isSavingRecording={isSavingRecording}
          onRetryFailedChunks={capture.retryFailedChunks}
          onStart={() => {
            void startRecording();
          }}
          onStop={() => {
            void stopRecording();
          }}
          onTogglePause={togglePauseRecording}
          questionCount={questions.length}
          status={captureStatus}
          transcript={
            vivaSessionId ? (
              <>
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h3 className={eyebrowClassName}>Transcript</h3>
                  <span className={cn(mutedTextClassName, "text-sm")}>
                    {isLive
                      ? liveTranscription.isConnected
                        ? "Live"
                        : "Connecting…"
                      : "Transcribed from the recording"}
                  </span>
                </div>
                <p
                  aria-live="polite"
                  className={cn(
                    "max-w-[80ch] text-sm leading-7 text-on-surface",
                    transcript === "" && mutedTextClassName,
                  )}
                >
                  {transcript === ""
                    ? isLive
                      ? "Listening…"
                      : "Nothing transcribed yet."
                    : transcript}
                </p>
                {failedTranscriptionCount > 0 ? (
                  <p className={cn(mutedTextClassName, "text-sm leading-6")}>
                    {failedTranscriptionCount}{" "}
                    {failedTranscriptionCount === 1 ? "part" : "parts"} of this
                    viva could not be transcribed. The recording itself is
                    unaffected.
                  </p>
                ) : null}

                {liveTranscription.errorMessage && isLive ? (
                  <p className={cn(mutedTextClassName, "text-sm leading-6")}>
                    {liveTranscription.errorMessage} The recording and its saved
                    transcript are unaffected.
                  </p>
                ) : null}
                {transcriptQuery.error instanceof Error ? (
                  <p className="text-sm leading-6 text-error" role="alert">
                    {transcriptQuery.error.message}
                  </p>
                ) : null}
              </>
            ) : null
          }
          footer={
            <>
              {vivaAudioRecords.map((record) => (
                <article
                  key={record.id}
                  className="grid gap-2 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] sm:items-center sm:gap-4"
                >
                  <p className="truncate text-sm font-medium">
                    {record.file_name}
                  </p>
                  {record.access.status === "allowed" ? (
                    <audio
                      className="h-9 w-full"
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

              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
                <div className="grid gap-1" role="status">
                  {isUploadingViva ? (
                    <p className={cn(mutedTextClassName, "text-sm leading-6")}>
                      Uploading viva audio…
                    </p>
                  ) : vivaAudioQuery.isLoading ? (
                    <p className={cn(mutedTextClassName, "text-sm leading-6")}>
                      Loading viva audio…
                    </p>
                  ) : vivaAudioRecords.length === 0 ? (
                    <p className={cn(mutedTextClassName, "text-sm leading-6")}>
                      No recording yet.
                    </p>
                  ) : null}
                </div>

                <label
                  className={buttonClassName({
                    className: "cursor-pointer",
                    variant: "secondary",
                  })}
                  htmlFor="submissionVivaUpload"
                >
                  Upload A Recording
                </label>
                <input
                  aria-label="Upload viva audio"
                  className="sr-only"
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
                      const saved = await uploadSubmissionVivaAudio(
                        submissionId,
                        file,
                      );
                      await replaceEarlierRecordings(submissionId, saved.id);
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
              </div>

              {vivaUploadErrorMessage ? (
                <p className="text-sm leading-6 text-error" role="alert">
                  {vivaUploadErrorMessage}
                </p>
              ) : null}

              {recordingErrorMessage ? (
                <p className="text-sm leading-6 text-error" role="alert">
                  {recordingErrorMessage}
                </p>
              ) : null}

              {vivaAudioQuery.error instanceof Error ? (
                <p className="text-sm leading-6 text-error" role="alert">
                  {vivaAudioQuery.error.message}
                </p>
              ) : null}
            </>
          }
        />

        <article aria-labelledby="submission-text-heading" className="grid gap-6">
          <SectionHeader id="submission-text-heading" title="Submission" />
          <div className={cn(readingClassName, "max-w-[68ch] space-y-5")}>
            {submissionParagraphs.map((paragraph, index) => (
              <p key={`${index}-${paragraph.slice(0, 32)}`}>{paragraph}</p>
            ))}
          </div>
        </article>

        <section aria-labelledby="viva-questions-heading" className="grid gap-4">
          <SectionHeader
            id="viva-questions-heading"
            meta={`About ${estimatedDurationMinutes} min of questioning`}
            title="Questions"
          />

          {questions.map((question) => (
            <QuestionCard
              key={question.id}
              id={question.id}
              isHighlighted={question.isHighlighted}
              label={question.label}
              questionText={question.questionText}
              teacherNote={question.teacherNote}
              onSave={(questionText) =>
                saveQuestionText(question.id, questionText)
              }
            />
          ))}

          <AddManualQuestionCard onAdd={addManualQuestion} />
        </section>
      </div>
    </PageFrame>
  );
}
