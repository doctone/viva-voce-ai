import type { ReactNode } from "react";
import { Button } from "../../../components/ui";
import { cn } from "~/lib/utils";
import {
  eyebrowClassName,
  mutedTextClassName,
  paperPanelClassName,
} from "~/lib/class-names";
import {
  formatElapsedDuration,
  type RecordingStatus,
} from "../../../features/submissions/vivaRecordingCapture";
import { RecordingLevelMeter } from "./-RecordingLevelMeter";

type RecordVivaPanelProps = {
  elapsedSeconds: number;
  failedChunkCount: number;
  footer?: ReactNode;
  getMediaStream: () => MediaStream | null;
  isSavingRecording: boolean;
  onRetryFailedChunks: () => void;
  onStart: () => void;
  onStop: () => void;
  onTogglePause: () => void;
  questionCount: number;
  status: RecordingStatus;
  transcript?: ReactNode;
};

const STATUS_LABEL: Record<RecordingStatus, string> = {
  idle: "Not recording",
  paused: "Paused",
  permission_denied: "Microphone unavailable",
  recording: "Recording",
  requesting_permission: "Waiting for microphone",
  stopped: "Recording finished",
};

function RecordingDot({ status }: { status: RecordingStatus }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "size-[10px] shrink-0 rounded-full",
        status === "recording"
          ? "animate-pulse bg-error motion-reduce:animate-none"
          : status === "paused"
            ? "bg-error/50"
            : "bg-error",
      )}
    />
  );
}

export function RecordVivaPanel({
  elapsedSeconds,
  failedChunkCount,
  footer,
  getMediaStream,
  isSavingRecording,
  onRetryFailedChunks,
  onStart,
  onStop,
  onTogglePause,
  questionCount,
  status,
  transcript,
}: RecordVivaPanelProps) {
  const isLive = status === "recording" || status === "paused";

  return (
    <section
      aria-labelledby="record-viva-heading"
      className={cn(paperPanelClassName, "grid")}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-outline-variant px-8 py-4">
        <h2 className={eyebrowClassName} id="record-viva-heading">
          Viva recording
        </h2>
        <span className={cn(mutedTextClassName, "text-sm")} role="status">
          {STATUS_LABEL[status]}
        </span>
      </div>

      <div className="grid justify-items-center gap-5 px-8 py-10">
        <p
          className="font-display text-[44px] font-medium leading-none tracking-[-0.02em] tabular-nums text-primary"
          role="timer"
        >
          {formatElapsedDuration(elapsedSeconds)}
        </p>

        {isLive ? (
          <RecordingLevelMeter
            getMediaStream={getMediaStream}
            isPaused={status === "paused"}
          />
        ) : null}

        {isLive ? (
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button onClick={onTogglePause} size="lg" variant="secondary">
              {status === "paused" ? "Resume" : "Pause"}
            </Button>
            <Button onClick={onStop} size="lg" variant="destructive">
              Stop Recording
            </Button>
          </div>
        ) : (
          <Button
            aria-label="Record viva"
            className="gap-3 px-7"
            disabled={isSavingRecording}
            isLoading={status === "requesting_permission" || isSavingRecording}
            onClick={onStart}
            size="lg"
          >
            {status === "requesting_permission" || isSavingRecording ? null : (
              <RecordingDot status={status} />
            )}
            {status === "permission_denied"
              ? "Try Again"
              : status === "stopped"
                ? "Record Again"
                : "Start Recording"}
          </Button>
        )}

        {status === "permission_denied" ? (
          <p className="max-w-[46ch] text-center text-sm leading-6 text-error" role="alert">
            We could not reach the microphone. Allow microphone access in your
            browser, then try again.
          </p>
        ) : null}

        {failedChunkCount > 0 ? (
          <div className="flex flex-wrap items-center justify-center gap-3">
            <p className="text-sm leading-6 text-error" role="alert">
              {failedChunkCount} {failedChunkCount === 1 ? "part" : "parts"} of
              this recording failed to upload.
            </p>
            <Button onClick={onRetryFailedChunks} size="sm" variant="secondary">
              Retry Upload
            </Button>
          </div>
        ) : null}

        <p className={cn(mutedTextClassName, "text-sm leading-6")}>
          {questionCount} {questionCount === 1 ? "question" : "questions"} to ask
        </p>
      </div>

      {transcript ? (
        <div className="grid gap-3 border-t border-outline-variant px-8 py-5">
          {transcript}
        </div>
      ) : null}

      {footer ? (
        <div className="grid gap-4 border-t border-outline-variant px-8 py-5">
          {footer}
        </div>
      ) : null}
    </section>
  );
}
