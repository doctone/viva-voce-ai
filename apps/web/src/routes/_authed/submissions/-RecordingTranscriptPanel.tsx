import * as React from "react";
import { Button } from "../../../components/ui/Button";
import { cn } from "~/lib/utils";
import { mutedTextClassName } from "~/lib/class-names";
import {
  assessRecordingQuality,
  describeTranscriptionStatus,
  findActiveSegmentIndex,
  formatTimestamp,
  isUncertain,
  searchTranscript,
  type RecordingTranscriptSegment,
  type TranscriptionJob,
} from "../../../features/submissions/recordingTranscript";

export type RecordingTranscriptPanelProps = {
  currentSeconds: number;
  job: TranscriptionJob | null;
  onRetry: () => void;
  onSeek: (seconds: number) => void;
  segments: readonly RecordingTranscriptSegment[];
};

/**
 * Supporting material beside the recording. Nothing here gates review: a
 * failed or missing transcript only offers a retry.
 */
export function RecordingTranscriptPanel({
  currentSeconds,
  job,
  onRetry,
  onSeek,
  segments,
}: RecordingTranscriptPanelProps) {
  const [query, setQuery] = React.useState("");

  if (!job) {
    return null;
  }

  const statusLine = (
    <p className={cn(mutedTextClassName, "text-sm leading-6")} role="status">
      {describeTranscriptionStatus(job.status)}
    </p>
  );

  if (job.status === "queued" || job.status === "processing") {
    return <section aria-label="Recording transcript">{statusLine}</section>;
  }

  if (job.status === "failed") {
    return (
      <section aria-label="Recording transcript" className="grid gap-2">
        {statusLine}
        <p className="text-sm leading-6 text-error" role="alert">
          {job.errorMessage ?? "We could not transcribe this recording."} The
          recording is unaffected and you can still review and conclude.
        </p>
        <div>
          <Button onClick={onRetry} type="button" variant="secondary">
            Retry transcript
          </Button>
        </div>
      </section>
    );
  }

  const warnings = assessRecordingQuality(segments, job.durationSeconds);
  const matches = new Set(searchTranscript(segments, query));
  const activeIndex = findActiveSegmentIndex(segments, currentSeconds);

  return (
    <section aria-label="Recording transcript" className="grid gap-3">
      {statusLine}

      {warnings.map((warning) => (
        <p
          className="text-sm leading-6 text-error"
          key={warning.kind}
          role="alert"
        >
          {warning.message}
        </p>
      ))}

      {segments.length > 0 ? (
        <>
          <input
            aria-label="Search transcript"
            className="w-full rounded-md border border-outline bg-transparent p-2 text-sm text-on-surface"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search transcript"
            type="search"
            value={query}
          />
          {query.trim() !== "" ? (
            <p className={cn(mutedTextClassName, "text-sm")} role="status">
              {matches.size} {matches.size === 1 ? "match" : "matches"}
            </p>
          ) : null}

          <ol className="grid gap-1">
            {segments.map((segment, index) => {
              const uncertain = isUncertain(segment);

              return (
                <li key={`${segment.startSeconds}-${index}`}>
                  <button
                    aria-current={index === activeIndex ? "true" : undefined}
                    className={cn(
                      "grid w-full grid-cols-[3.5rem_1fr] gap-2 rounded-md p-2 text-left text-sm leading-6",
                      index === activeIndex && "bg-surface-container",
                      matches.has(index) && "outline outline-2 outline-primary",
                    )}
                    data-match={matches.has(index) ? "true" : undefined}
                    onClick={() => onSeek(segment.startSeconds)}
                    type="button"
                  >
                    <span className={mutedTextClassName}>
                      {formatTimestamp(segment.startSeconds)}
                    </span>
                    <span className={cn(uncertain && "italic underline decoration-dotted")}>
                      {segment.text}
                      {uncertain ? (
                        <span className="ml-2 text-xs text-error">
                          (uncertain)
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </>
      ) : null}
    </section>
  );
}
