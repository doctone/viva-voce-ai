import * as React from "react";
import { Button } from "../../../components/ui/Button";
import { cn } from "~/lib/utils";
import {
  eyebrowClassName,
  mutedTextClassName,
  paperPanelClassName,
} from "~/lib/class-names";
import { RecordingLevelMeter } from "./-RecordingLevelMeter";
import {
  AskedQuestionCaptureCard,
  type CaptureAskedQuestion,
} from "./-VivaSessionCapturePanel";
import {
  formatCategoryLabel,
  formatRailHeader,
  formatRailState,
  transcriptSince,
  type QuestionSetRail,
  type RailFollowUp,
  type RailState,
} from "../../../features/submissions/questionSetRail";
import {
  formatEvidenceMarkerLabel,
  type EvidenceMarkerType,
} from "../../../features/submissions/vivaSessionCapture";
import {
  formatElapsedDuration,
  formatSessionProgress,
  type RecordingStatus,
} from "../../../features/submissions/vivaRecordingCapture";

export type ConductModeQuestion = {
  category: string;
  id: string;
  questionText: string;
  teacherNote: string;
};

export type ConductLiveTranscript = {
  errorMessage: string | null;
  isConnected: boolean;
  text: string;
};

const markerToneClassName: Record<EvidenceMarkerType, string> = {
  clear_understanding: "text-primary",
  concern: "text-error",
  needs_further_probing: "text-tertiary",
};

function RailStateLabel({
  evidenceMarkerType,
  state,
}: {
  evidenceMarkerType: EvidenceMarkerType | null;
  state: RailState;
}) {
  return (
    <span
      className={cn(
        "text-xs font-medium",
        evidenceMarkerType
          ? markerToneClassName[evidenceMarkerType]
          : "text-on-surface-variant",
      )}
    >
      {formatRailState(
        state,
        evidenceMarkerType ? formatEvidenceMarkerLabel(evidenceMarkerType) : null,
      )}
    </span>
  );
}

const railButtonClassName =
  "grid min-h-8 w-full gap-0.5 border-l-2 px-3 py-2 text-left transition-colors hover:bg-surface-container focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary";

function QuestionSetRailList({
  currentAskedQuestionId,
  currentIndex,
  onSelectFollowUp,
  onSelectQuestion,
  rail,
}: {
  currentAskedQuestionId: string | null;
  currentIndex: number;
  onSelectFollowUp: (askedQuestionId: string) => void;
  onSelectQuestion: (index: number) => void;
  rail: QuestionSetRail;
}) {
  function renderFollowUp(followUp: RailFollowUp) {
    const isCurrent = followUp.askedQuestionId === currentAskedQuestionId;

    return (
      <li key={followUp.askedQuestionId}>
        <button
          type="button"
          aria-current={isCurrent ? "true" : undefined}
          onClick={() => onSelectFollowUp(followUp.askedQuestionId)}
          className={cn(
            railButtonClassName,
            "pl-6",
            isCurrent
              ? "border-primary bg-surface-container"
              : "border-transparent",
          )}
        >
          <span className="line-clamp-2 text-sm text-on-surface">
            <span className="text-on-surface-variant">Follow-up: </span>
            {followUp.questionText}
          </span>
          <RailStateLabel
            evidenceMarkerType={followUp.evidenceMarkerType}
            state={followUp.state}
          />
        </button>
      </li>
    );
  }

  return (
    <ul aria-label="Viva Question Set" className="grid divide-y divide-outline-variant">
      {rail.leadingFollowUps.map(renderFollowUp)}
      {rail.items.map((item, index) => {
        const isCurrent =
          currentAskedQuestionId === null && index === currentIndex;

        return (
          <React.Fragment key={item.id}>
            <li>
              <button
                type="button"
                aria-current={isCurrent ? "true" : undefined}
                onClick={() => onSelectQuestion(index)}
                className={cn(
                  railButtonClassName,
                  isCurrent
                    ? "border-primary bg-surface-container"
                    : "border-transparent",
                )}
              >
                <span className="line-clamp-2 text-sm text-on-surface">
                  <span className="font-bold">{item.number}. </span>
                  {item.questionText}
                </span>
                <RailStateLabel
                  evidenceMarkerType={item.evidenceMarkerType}
                  state={item.state}
                />
              </button>
            </li>
            {item.followUps.map(renderFollowUp)}
          </React.Fragment>
        );
      })}
    </ul>
  );
}

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
  /** The Asked Question the teacher is on: a follow-up, or the current planned question once asked. */
  currentAskedQuestion: CaptureAskedQuestion | null;
  currentIndex: number;
  elapsedSeconds: number;
  failedChunkCount: number;
  getMediaStream: () => MediaStream | null;
  liveTranscript: ConductLiveTranscript;
  onApplyEvidenceMarker: (
    askedQuestionId: string,
    markerType: EvidenceMarkerType,
  ) => Promise<void>;
  onAskCurrentQuestion: () => Promise<void>;
  onAskFollowUpQuestion: (questionText: string) => Promise<void>;
  onNext: () => void;
  onPrevious: () => void;
  onSaveObservation: (askedQuestionId: string, content: string) => Promise<void>;
  onSelectFollowUp: (askedQuestionId: string) => void;
  onSelectQuestion: (index: number) => void;
  onRetryFailedChunks: () => void;
  onStartRecording: () => Promise<void>;
  onStopRecording: () => void;
  onTogglePauseRecording: () => void;
  questions: ConductModeQuestion[];
  rail: QuestionSetRail;
  recordingStatus: RecordingStatus;
  submissionTitle: string;
};

export function ConductModePanel({
  currentAskedQuestion,
  currentIndex,
  elapsedSeconds,
  failedChunkCount,
  getMediaStream,
  liveTranscript,
  onApplyEvidenceMarker,
  onAskCurrentQuestion,
  onAskFollowUpQuestion,
  onNext,
  onPrevious,
  onSaveObservation,
  onSelectFollowUp,
  onSelectQuestion,
  onRetryFailedChunks,
  onStartRecording,
  onStopRecording,
  onTogglePauseRecording,
  questions,
  rail,
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

  const [isRailOpen, setIsRailOpen] = React.useState(false);
  const currentQuestion = questions[currentIndex] ?? null;
  const isFollowUpCurrent = Boolean(currentAskedQuestion?.isUnplanned);
  const currentKey = isFollowUpCurrent
    ? (currentAskedQuestion?.id ?? "")
    : (currentQuestion?.id ?? "");
  const isCurrentAsked = currentAskedQuestion !== null;

  // The live feed runs for the whole take; the teacher wants what was said
  // since this question became the current one.
  const [transcriptMark, setTranscriptMark] = React.useState({
    key: currentKey,
    start: liveTranscript.text.length,
  });

  if (transcriptMark.key !== currentKey) {
    setTranscriptMark({ key: currentKey, start: liveTranscript.text.length });
  }

  const questionTranscript = transcriptSince(
    liveTranscript.text,
    transcriptMark.start,
  );
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

  const railList = (
    <QuestionSetRailList
      currentAskedQuestionId={isFollowUpCurrent ? currentAskedQuestion!.id : null}
      currentIndex={currentIndex}
      onSelectFollowUp={onSelectFollowUp}
      onSelectQuestion={(index) => {
        onSelectQuestion(index);
        setIsRailOpen(false);
      }}
      rail={rail}
    />
  );

  return (
    <section className={cn(paperPanelClassName, "bg-surface-container-low p-4 md:p-6")}>
      <div className="grid gap-6">
        <div className="grid gap-2">
          <span className={eyebrowClassName}>Conduct mode</span>
          <h2 className="font-display text-[28px] font-medium leading-[1.3] tracking-[-0.01em] text-primary">
            {submissionTitle}
          </h2>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(16rem,20rem)_1fr]">
          <aside className="grid gap-2 border border-outline-variant bg-surface-container-lowest lg:sticky lg:top-4">
            <div className="flex items-center justify-between gap-3 border-b border-outline-variant px-3 py-2">
              <h3 className="text-sm font-bold text-on-surface">
                {formatRailHeader(rail.askedPlannedCount, rail.items.length)}
              </h3>
              <button
                type="button"
                aria-controls="conduct-question-set"
                aria-expanded={isRailOpen}
                onClick={() => setIsRailOpen((open) => !open)}
                className="min-h-8 px-2 text-sm font-medium text-primary underline-offset-2 hover:underline lg:hidden"
              >
                {isRailOpen ? "Hide question set" : "Question set"}
              </button>
            </div>
            <div
              id="conduct-question-set"
              className={cn(isRailOpen ? "block" : "hidden", "lg:block")}
            >
              {railList}
            </div>
          </aside>

          <div className="grid min-w-0 gap-6">
            <div className="grid gap-3 border border-outline-variant bg-surface-container-lowest p-4">
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <span className="font-bold text-on-surface">Recording</span>
                <span role="status">{describeRecordingStatus(recordingStatus)}</span>
                <span className={mutedTextClassName} role="timer">
                  {formatElapsedDuration(elapsedSeconds)}
                </span>
                <span className={mutedTextClassName}>
                  {formatSessionProgress(currentIndex, questions.length)}
                </span>
              </div>
              {isRecording || isPaused ? (
                <RecordingLevelMeter
                  getMediaStream={getMediaStream}
                  isPaused={isPaused}
                />
              ) : null}
              <div className="flex flex-wrap gap-2">
                {recordingStatus === "idle" ||
                recordingStatus === "permission_denied" ? (
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
                  We couldn&apos;t access the microphone. Allow microphone
                  access and try again.
                </p>
              ) : null}
              {failedChunkCount > 0 ? (
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="text-error">
                    {failedChunkCount} recording{" "}
                    {failedChunkCount === 1 ? "chunk" : "chunks"} failed to
                    upload.
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

            {currentQuestion || isFollowUpCurrent ? (
              <section
                aria-label="Current question"
                className="grid gap-3 border border-outline-variant bg-surface-container-lowest p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className={eyebrowClassName}>
                    {isFollowUpCurrent
                      ? "Unplanned follow-up"
                      : `${formatCategoryLabel(currentQuestion!.category)} · Question ${currentIndex + 1}`}
                  </span>
                  {!isCurrentAsked ? (
                    <Button
                      type="button"
                      variant="secondary"
                      isLoading={isAsking}
                      onClick={() => void handleAskCurrentQuestion()}
                    >
                      Mark as asked
                    </Button>
                  ) : (
                    <span className="text-sm font-medium text-on-surface-variant">
                      Asked
                    </span>
                  )}
                </div>
                <p className="font-sans text-base leading-7 font-medium text-primary">
                  {isFollowUpCurrent
                    ? currentAskedQuestion!.questionText
                    : currentQuestion!.questionText}
                </p>
                {!isFollowUpCurrent && currentQuestion!.teacherNote ? (
                  <p className={cn(mutedTextClassName, "text-sm leading-6")}>
                    <span className="font-bold">Listen for (private): </span>
                    {currentQuestion!.teacherNote}
                  </p>
                ) : null}
              </section>
            ) : (
              <p className={cn(mutedTextClassName, "text-sm leading-6")}>
                No planned questions in this Viva Question Set.
              </p>
            )}

            <section
              aria-label="Live transcript"
              className="grid gap-2 border border-outline-variant bg-surface-container-lowest p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-bold text-on-surface">
                  Live transcript
                </span>
                <span className={cn(mutedTextClassName, "text-xs")}>
                  Best effort — the recording is the record
                </span>
              </div>
              {questionTranscript ? (
                <p className="text-sm leading-6 text-on-surface">
                  {questionTranscript}
                </p>
              ) : (
                <p className={cn(mutedTextClassName, "text-sm leading-6")}>
                  {isRecording
                    ? liveTranscript.isConnected
                      ? "Listening…"
                      : "Connecting…"
                    : "Live text appears here while recording."}
                </p>
              )}
              {liveTranscript.errorMessage && (isRecording || isPaused) ? (
                <p className={cn(mutedTextClassName, "text-sm leading-6")}>
                  {liveTranscript.errorMessage} The recording and its saved
                  transcript are unaffected.
                </p>
              ) : null}
            </section>

            {currentAskedQuestion ? (
              <AskedQuestionCaptureCard
                key={currentAskedQuestion.id}
                askedQuestion={currentAskedQuestion}
                onApplyEvidenceMarker={(markerType) =>
                  onApplyEvidenceMarker(currentAskedQuestion.id, markerType)
                }
                onSaveObservation={(content) =>
                  onSaveObservation(currentAskedQuestion.id, content)
                }
                showQuestion={false}
              />
            ) : currentQuestion ? (
              <p className={cn(mutedTextClassName, "text-sm leading-6")}>
                Mark this question as asked to add an Evidence Marker or
                Observation.
              </p>
            ) : null}

            <div className="flex gap-3">
              <Button
                type="button"
                variant="secondary"
                disabled={!isFollowUpCurrent && currentIndex <= 0}
                onClick={onPrevious}
              >
                Previous question
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={!isFollowUpCurrent && currentIndex >= questions.length - 1}
                onClick={onNext}
              >
                Next question
              </Button>
            </div>

            <div className="grid gap-2">
              <label
                className="grid gap-1 text-sm"
                htmlFor="conductFollowUpQuestionText"
              >
                Unplanned follow-up question
                <input
                  id="conductFollowUpQuestionText"
                  type="text"
                  value={followUpText}
                  onChange={(event) => setFollowUpText(event.target.value)}
                  className="min-h-8 rounded-[var(--radius)] border border-outline-variant bg-surface-container-lowest p-2"
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
        </div>
      </div>
    </section>
  );
}
