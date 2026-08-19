import * as React from "react";
import { Button } from "../../../components/ui/Button";
import { cn } from "~/lib/utils";
import {
  eyebrowClassName,
  mutedTextClassName,
  paperPanelClassName,
} from "~/lib/class-names";
import {
  formatElapsedDuration,
  formatSessionProgress,
  type RecordingStatus,
} from "../../../features/submissions/vivaRecordingCapture";

export type ConductModeQuestion = {
  id: string;
  isAsked: boolean;
  questionText: string;
  teacherNote: string;
};

function describeRecordingStatus(status: RecordingStatus): string {
  switch (status) {
    case "idle":
      return "Not recording";
    case "requesting_permission":
      return "Requesting microphone access…";
    case "recording":
      return "Recording";
    case "paused":
      return "Paused";
    case "permission_denied":
      return "Microphone access denied";
    case "stopped":
      return "Recording stopped";
  }
}

type ConductModePanelProps = {
  currentIndex: number;
  elapsedSeconds: number;
  failedChunkCount: number;
  onAskCurrentQuestion: () => Promise<void>;
  onAskFollowUpQuestion: (questionText: string) => Promise<void>;
  onNext: () => void;
  onPrevious: () => void;
  onRetryFailedChunks: () => void;
  onStartRecording: () => Promise<void>;
  onStopRecording: () => void;
  onTogglePauseRecording: () => void;
  questions: ConductModeQuestion[];
  recordingStatus: RecordingStatus;
  submissionTitle: string;
};

export function ConductModePanel({
  currentIndex,
  elapsedSeconds,
  failedChunkCount,
  onAskCurrentQuestion,
  onAskFollowUpQuestion,
  onNext,
  onPrevious,
  onRetryFailedChunks,
  onStartRecording,
  onStopRecording,
  onTogglePauseRecording,
  questions,
  recordingStatus,
  submissionTitle,
}: ConductModePanelProps) {
  const [isStarting, setIsStarting] = React.useState(false);
  const [isAsking, setIsAsking] = React.useState(false);
  const [followUpText, setFollowUpText] = React.useState("");
  const [isAskingFollowUp, setIsAskingFollowUp] = React.useState(false);
  const [actionErrorMessage, setActionErrorMessage] = React.useState<
    string | null
  >(null);

  const currentQuestion = questions[currentIndex] ?? null;
  const isRecording = recordingStatus === "recording";
  const isPaused = recordingStatus === "paused";
  const canPauseOrResume = isRecording || isPaused;
  const canStop = isRecording || isPaused;

  async function handleStart() {
    setIsStarting(true);
    setActionErrorMessage(null);

    try {
      await onStartRecording();
    } finally {
      setIsStarting(false);
    }
  }

  async function handleAskCurrentQuestion() {
    setIsAsking(true);
    setActionErrorMessage(null);

    try {
      await onAskCurrentQuestion();
    } catch (error) {
      setActionErrorMessage(
        error instanceof Error
          ? error.message
          : "We could not record that question as asked.",
      );
    } finally {
      setIsAsking(false);
    }
  }

  async function handleAskFollowUp() {
    const questionText = followUpText.trim();

    if (questionText.length === 0) {
      return;
    }

    setIsAskingFollowUp(true);
    setActionErrorMessage(null);

    try {
      await onAskFollowUpQuestion(questionText);
      setFollowUpText("");
    } catch (error) {
      setActionErrorMessage(
        error instanceof Error
          ? error.message
          : "We could not record that follow-up question.",
      );
    } finally {
      setIsAskingFollowUp(false);
    }
  }

  return (
    <section className={cn(paperPanelClassName, "bg-surface-container-low p-8")}>
      <div className="grid gap-6">
        <div className="grid gap-2">
          <span className={eyebrowClassName}>Conduct mode</span>
          <h2 className="font-display text-[28px] font-medium leading-[1.3] tracking-[-0.01em] text-primary">
            {submissionTitle}
          </h2>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className={mutedTextClassName}>
              {formatSessionProgress(currentIndex, questions.length)}
            </span>
            <span className={mutedTextClassName} role="timer">
              {formatElapsedDuration(elapsedSeconds)}
            </span>
            <span role="status">{describeRecordingStatus(recordingStatus)}</span>
          </div>
        </div>

        <div className="grid gap-3 rounded-[var(--radius)] border border-outline-variant bg-surface-container-lowest p-4">
          <span className="text-sm font-bold text-on-surface">Recording</span>
          <div className="flex flex-wrap gap-2">
            {recordingStatus === "idle" || recordingStatus === "permission_denied" ? (
              <Button
                type="button"
                isLoading={isStarting}
                onClick={() => void handleStart()}
              >
                {recordingStatus === "permission_denied"
                  ? "Try again"
                  : "Start recording"}
              </Button>
            ) : null}
            {canPauseOrResume ? (
              <Button
                type="button"
                variant="secondary"
                onClick={onTogglePauseRecording}
              >
                {isPaused ? "Resume recording" : "Pause recording"}
              </Button>
            ) : null}
            {canStop ? (
              <Button
                type="button"
                variant="destructive"
                onClick={onStopRecording}
              >
                Stop recording
              </Button>
            ) : null}
          </div>
          {recordingStatus === "permission_denied" ? (
            <p className="text-sm text-error">
              We couldn&apos;t access the microphone. Allow microphone access
              and try again.
            </p>
          ) : null}
          {failedChunkCount > 0 ? (
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="text-error">
                {failedChunkCount} recording {failedChunkCount === 1 ? "chunk" : "chunks"} failed to upload.
              </span>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={onRetryFailedChunks}
              >
                Retry upload
              </Button>
            </div>
          ) : null}
        </div>

        {currentQuestion ? (
          <div className="grid gap-3 rounded-[var(--radius)] border border-outline-variant bg-surface-container-lowest p-4">
            <div className="flex items-center justify-between gap-3">
              <span className={eyebrowClassName}>
                {currentQuestion.isAsked ? "Asked" : "Not yet asked"}
              </span>
              {!currentQuestion.isAsked ? (
                <Button
                  type="button"
                  variant="secondary"
                  isLoading={isAsking}
                  onClick={() => void handleAskCurrentQuestion()}
                >
                  Mark as asked
                </Button>
              ) : null}
            </div>
            <p className="font-sans text-base leading-7 font-medium text-primary">
              {currentQuestion.questionText}
            </p>
            {currentQuestion.teacherNote ? (
              <p className={cn(mutedTextClassName, "text-sm leading-6")}>
                <span className="font-bold">Teacher note (private): </span>
                {currentQuestion.teacherNote}
              </p>
            ) : null}
          </div>
        ) : (
          <p className={cn(mutedTextClassName, "text-sm leading-6")}>
            No planned questions in this Viva Question Set.
          </p>
        )}

        <div className="flex gap-3">
          <Button
            type="button"
            variant="secondary"
            disabled={currentIndex <= 0}
            onClick={onPrevious}
          >
            Previous question
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={currentIndex >= questions.length - 1}
            onClick={onNext}
          >
            Next question
          </Button>
        </div>

        <div className="grid gap-2">
          <label className="grid gap-1 text-sm" htmlFor="conductFollowUpQuestionText">
            Unplanned follow-up question
            <input
              id="conductFollowUpQuestionText"
              type="text"
              value={followUpText}
              onChange={(event) => setFollowUpText(event.target.value)}
              className="rounded-[var(--radius)] border border-outline-variant bg-surface-container-lowest p-2"
            />
          </label>
          <div>
            <Button
              type="button"
              variant="secondary"
              isLoading={isAskingFollowUp}
              disabled={followUpText.trim().length === 0}
              onClick={() => void handleAskFollowUp()}
            >
              Record follow-up as asked
            </Button>
          </div>
        </div>

        {actionErrorMessage ? (
          <p className="text-sm text-error">{actionErrorMessage}</p>
        ) : null}
      </div>
    </section>
  );
}
