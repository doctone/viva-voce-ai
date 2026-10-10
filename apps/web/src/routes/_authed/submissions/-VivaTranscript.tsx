import * as React from "react";
import { Search } from "lucide-react";
import { Button } from "../../../components/ui";
import { cn } from "~/lib/utils";
import { eyebrowClassName, mutedTextClassName } from "~/lib/class-names";
import { searchTranscript } from "../../../features/submissions/transcriptSearch";
import { formatElapsedDuration } from "../../../features/submissions/vivaRecordingCapture";
import type { TranscriptSegment } from "../../../features/submissions/vivaTranscription";

type VivaTranscriptProps = {
  children?: React.ReactNode;
  /** The speaker-labelled transcript, which takes precedence when present. */
  labelled?: React.ReactNode;
  /** Shown instead of the segment list while the viva is live or settling. */
  liveText: string | null;
  /** Absent when there is no playable recording to jump into. */
  onSeek?: (seconds: number) => void;
  segments: readonly TranscriptSegment[];
  statusLabel: string;
};

export function VivaTranscript({
  children,
  labelled,
  liveText,
  onSeek,
  segments,
  statusLabel,
}: VivaTranscriptProps) {
  const [query, setQuery] = React.useState("");
  const { lines, matchCount } = searchTranscript(segments, query);
  const hasQuery = query.trim() !== "";

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className={eyebrowClassName}>Transcript</h3>
        <span className={cn(mutedTextClassName, "text-sm")}>{statusLabel}</span>
      </div>

      {labelled ? (
        labelled
      ) : liveText !== null ? (
        <p
          aria-live="polite"
          className={cn(
            "max-w-[80ch] text-sm leading-7 text-on-surface",
            liveText === "" && mutedTextClassName,
          )}
        >
          {liveText === "" ? "Listening…" : liveText}
        </p>
      ) : segments.length === 0 ? (
        <p className={cn(mutedTextClassName, "text-sm leading-7")}>
          Nothing transcribed yet.
        </p>
      ) : (
        <>
          <label className="flex h-11 items-center gap-2 rounded-[var(--radius)] border border-outline-variant bg-surface px-3 focus-within:border-primary">
            <Search aria-hidden="true" className="size-4 shrink-0 text-on-surface-variant" />
            <input
              aria-label="Search transcript"
              className="min-w-0 flex-1 bg-transparent text-[15px] text-on-surface outline-none placeholder:text-on-surface-variant"
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder="Search what was said"
              type="search"
              value={query}
            />
          </label>

          <p className={cn(mutedTextClassName, "text-sm")} role="status">
            {hasQuery
              ? matchCount === 0
                ? `Nothing in the transcript matches “${query.trim()}”.`
                : `${matchCount} ${matchCount === 1 ? "line matches" : "lines match"}`
              : null}
          </p>

          <ol aria-label="Transcript" className="-mx-2 m-0 grid list-none gap-1 p-0">
            {lines.map((line) => {
              const timestamp = formatElapsedDuration(line.startSeconds);

              return (
                <li
                  className="grid grid-cols-[4rem_minmax(0,1fr)] items-start gap-3 px-2 py-2"
                  key={line.sequence}
                >
                  {onSeek ? (
                    <Button
                      aria-label={`Play from ${timestamp}`}
                      className="tabular-nums"
                      onClick={() => onSeek(line.startSeconds)}
                      size="sm"
                      variant="secondary"
                    >
                      {timestamp}
                    </Button>
                  ) : (
                    <span className={cn(mutedTextClassName, "pt-1 text-xs tabular-nums")}>
                      {timestamp}
                    </span>
                  )}
                  <p className="m-0 max-w-[70ch] text-[15px] leading-6 text-on-surface">
                    {line.parts.map((part, index) =>
                      part.isMatch ? (
                        <mark
                          className="rounded-[2px] bg-[color:color-mix(in_srgb,var(--color-on-tertiary-container)_40%,white)] text-inherit"
                          key={index}
                        >
                          {part.text}
                        </mark>
                      ) : (
                        <React.Fragment key={index}>{part.text}</React.Fragment>
                      ),
                    )}
                  </p>
                </li>
              );
            })}
          </ol>
        </>
      )}

      {children}
    </>
  );
}
