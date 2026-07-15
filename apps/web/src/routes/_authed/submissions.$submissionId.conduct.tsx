import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, Heading, buttonClassName } from "../../components/ui";
import {
  createSupabaseAskedQuestionRepository,
  recordAskedQuestion,
} from "../../features/submissions/vivaSessionCapture";
import { createSupabaseVivaSessionRepository } from "../../features/submissions/vivaSession";
import { sortQuestionsBySetPosition } from "../../features/submissions/vivaQuestionSet";
import {
  clampQuestionIndex,
  computeElapsedSeconds,
} from "../../features/submissions/vivaRecordingCapture";
import { useVivaAudioCapture } from "../../features/submissions/useVivaAudioCapture";
import { getSupabaseBrowserClient } from "../../utils/supabase-browser";
import { cn } from "~/lib/utils";
import { eyebrowClassName, mutedTextClassName } from "~/lib/class-names";
import {
  ConductModePanel,
  type ConductModeQuestion,
} from "./submissions/-ConductModePanel";

export const Route = createFileRoute(
  "/_authed/submissions/$submissionId/conduct",
)({
  component: ConductVivaSessionPage,
});

type SubmissionTitleRecord = {
  id: string;
  submission_title: string;
};

type VivaQuestionSetIdRow = {
  id: string;
};

type SetQuestionRow = {
  id: string;
  question_text: string;
  set_position: number | null;
  teacher_note: string;
};

type AskedQuestionVivaIdRow = {
  viva_question_id: string | null;
};

async function fetchSubmissionTitle(
  submissionId: string,
): Promise<SubmissionTitleRecord> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("submissions")
    .select("id, submission_title")
    .eq("id", submissionId);

  if (error) {
    throw new Error("We could not load the submission.");
  }

  const submission = (data as SubmissionTitleRecord[] | null)?.[0];

  if (!submission) {
    throw new Error("Submission not found.");
  }

  return submission;
}

async function fetchQuestionSetId(
  submissionId: string,
): Promise<string | null> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("viva_question_sets")
    .select("id")
    .eq("submission_id", submissionId);

  if (error) {
    throw new Error("We could not load the Viva Question Set.");
  }

  return (data as VivaQuestionSetIdRow[] | null)?.[0]?.id ?? null;
}

async function fetchOrderedSetQuestions(
  submissionId: string,
): Promise<Array<{ id: string; questionText: string; teacherNote: string; setPosition: number | null }>> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("viva_questions")
    .select("id, question_text, teacher_note, set_position")
    .eq("submission_id", submissionId);

  if (error) {
    throw new Error("We could not load the Viva Question Set questions.");
  }

  const rows = (data as SetQuestionRow[] | null) ?? [];

  return sortQuestionsBySetPosition(
    rows.map((row) => ({
      id: row.id,
      questionText: row.question_text,
      setPosition: row.set_position ?? null,
      teacherNote: row.teacher_note,
    })),
  );
}

async function fetchAskedVivaQuestionIds(
  vivaSessionId: string,
): Promise<string[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("asked_questions")
    .select("viva_question_id")
    .eq("viva_session_id", vivaSessionId);

  if (error) {
    throw new Error("We could not load Asked Questions.");
  }

  return ((data as AskedQuestionVivaIdRow[] | null) ?? [])
    .map((row) => row.viva_question_id)
    .filter((id): id is string => id !== null);
}

export function ConductVivaSessionPage() {
  const { submissionId } = Route.useParams();
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [now, setNow] = React.useState(() => new Date());

  const submissionQuery = useQuery({
    queryFn: () => fetchSubmissionTitle(submissionId),
    queryKey: ["submission-title", submissionId],
  });

  const questionSetIdQuery = useQuery({
    queryFn: () => fetchQuestionSetId(submissionId),
    queryKey: ["viva-question-set-id", submissionId],
  });
  const vivaQuestionSetId = questionSetIdQuery.data ?? null;

  const vivaSessionQuery = useQuery({
    enabled: Boolean(vivaQuestionSetId),
    queryFn: () =>
      createSupabaseVivaSessionRepository(
        getSupabaseBrowserClient(),
      ).findActiveSession(vivaQuestionSetId as string),
    queryKey: ["viva-session", vivaQuestionSetId],
  });
  const vivaSession = vivaSessionQuery.data ?? null;

  const setQuestionsQuery = useQuery({
    queryFn: () => fetchOrderedSetQuestions(submissionId),
    queryKey: ["viva-question-set-questions", submissionId],
  });
  const orderedQuestions = setQuestionsQuery.data ?? [];

  const askedIdsQuery = useQuery({
    enabled: Boolean(vivaSession),
    queryFn: () => fetchAskedVivaQuestionIds((vivaSession as { id: string }).id),
    queryKey: ["asked-viva-question-ids", vivaSession?.id ?? null],
  });
  const askedVivaQuestionIds = React.useMemo(
    () => new Set(askedIdsQuery.data ?? []),
    [askedIdsQuery.data],
  );

  const conductQuestions: ConductModeQuestion[] = orderedQuestions.map(
    (question) => ({
      id: question.id,
      isAsked: askedVivaQuestionIds.has(question.id),
      questionText: question.questionText,
      teacherNote: question.teacherNote,
    }),
  );

  React.useEffect(() => {
    setCurrentIndex((index) =>
      clampQuestionIndex(index, conductQuestions.length),
    );
  }, [conductQuestions.length]);

  React.useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1_000);
    return () => clearInterval(interval);
  }, []);

  const capture = useVivaAudioCapture(vivaSession?.id ?? "");

  const invalidateAskedQuestions = React.useCallback(async () => {
    if (!vivaSession) {
      return;
    }

    await queryClient.invalidateQueries({
      queryKey: ["asked-viva-question-ids", vivaSession.id],
    });
  }, [queryClient, vivaSession]);

  const askCurrentQuestion = React.useCallback(async () => {
    const question = conductQuestions[currentIndex];

    if (!question || !vivaSession) {
      return;
    }

    const repository = createSupabaseAskedQuestionRepository(
      getSupabaseBrowserClient(),
    );

    await recordAskedQuestion(
      {
        questionText: question.questionText,
        vivaQuestionId: question.id,
        vivaSessionId: vivaSession.id,
      },
      repository,
    );

    await invalidateAskedQuestions();
  }, [conductQuestions, currentIndex, invalidateAskedQuestions, vivaSession]);

  const askFollowUpQuestion = React.useCallback(
    async (questionText: string) => {
      if (!vivaSession) {
        return;
      }

      const repository = createSupabaseAskedQuestionRepository(
        getSupabaseBrowserClient(),
      );

      await recordAskedQuestion(
        {
          questionText,
          vivaQuestionId: null,
          vivaSessionId: vivaSession.id,
        },
        repository,
      );

      await invalidateAskedQuestions();
    },
    [invalidateAskedQuestions, vivaSession],
  );

  if (
    submissionQuery.isLoading ||
    questionSetIdQuery.isLoading ||
    vivaSessionQuery.isLoading
  ) {
    return (
      <Card as="section" className="gap-4">
        <span className={eyebrowClassName}>Conduct mode</span>
        <p className={cn(mutedTextClassName, "text-sm leading-6")}>
          Loading…
        </p>
      </Card>
    );
  }

  if (!vivaSession) {
    return (
      <Card as="section" className="gap-4">
        <span className={eyebrowClassName}>Conduct mode</span>
        <Heading>No active Viva Session</Heading>
        <p className={cn(mutedTextClassName, "max-w-[60ch] text-sm leading-6")}>
          Start a Viva Session from the submission page before entering
          Conduct mode.
        </p>
        <div>
          <Link
            to="/submissions/$submissionId"
            params={{ submissionId }}
            className={buttonClassName()}
          >
            Back to submission
          </Link>
        </div>
      </Card>
    );
  }

  const elapsedSeconds = computeElapsedSeconds(vivaSession.startedAt, now);

  return (
    <div className="grid gap-6">
      <div>
        <Link
          to="/submissions/$submissionId"
          params={{ submissionId }}
          className="text-sm text-on-surface-variant underline-offset-4 hover:text-primary hover:underline"
        >
          Back to submission
        </Link>
      </div>
      <ConductModePanel
        currentIndex={currentIndex}
        elapsedSeconds={elapsedSeconds}
        failedChunkCount={capture.failedChunkCount}
        onAskCurrentQuestion={askCurrentQuestion}
        onAskFollowUpQuestion={askFollowUpQuestion}
        onNext={() =>
          setCurrentIndex((index) =>
            clampQuestionIndex(index + 1, conductQuestions.length),
          )
        }
        onPrevious={() =>
          setCurrentIndex((index) =>
            clampQuestionIndex(index - 1, conductQuestions.length),
          )
        }
        onRetryFailedChunks={capture.retryFailedChunks}
        onStartRecording={capture.start}
        onStopRecording={capture.stop}
        onTogglePauseRecording={capture.togglePause}
        questions={conductQuestions}
        recordingStatus={capture.status}
        submissionTitle={submissionQuery.data?.submission_title ?? ""}
      />
    </div>
  );
}
