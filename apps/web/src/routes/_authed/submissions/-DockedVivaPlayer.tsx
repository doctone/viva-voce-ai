import * as React from "react";
import { Pause, Play } from "lucide-react";
import { Button } from "../../../components/ui";
import { cn } from "~/lib/utils";
import { mutedTextClassName } from "~/lib/class-names";
import { formatElapsedDuration } from "../../../features/submissions/vivaRecordingCapture";

export type VivaSeekRequest = {
  /** Distinguishes two requests for the same moment, so both are honoured. */
  id: number;
  seconds: number;
};

type DockedVivaPlayerProps = {
  fileName: string;
  /** Lets other views (the synchronized transcript) follow and seek playback. */
  onAudioElementChange?: (audio: HTMLAudioElement | null) => void;
  seekRequest: VivaSeekRequest | null;
  src: string;
};

function playQuietly(audio: HTMLAudioElement) {
  // Browsers reject play() without a user gesture or before data loads; the
  // control simply stays on Play, which is what the teacher should see.
  void audio.play()?.catch(() => undefined);
}

/**
 * Stays pinned to the bottom of the viewport on every tab, so a teacher can
 * keep listening while reading the submission or the questions.
 */
export function DockedVivaPlayer({
  fileName,
  onAudioElementChange,
  seekRequest,
  src,
}: DockedVivaPlayerProps) {
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const isProbingDurationRef = React.useRef(false);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentSeconds, setCurrentSeconds] = React.useState(0);
  const [durationSeconds, setDurationSeconds] = React.useState(0);

  React.useEffect(() => {
    onAudioElementChange?.(audioRef.current);

    return () => onAudioElementChange?.(null);
  }, [onAudioElementChange]);

  React.useEffect(() => {
    const audio = audioRef.current;

    if (!seekRequest || !audio) {
      return;
    }

    audio.currentTime = seekRequest.seconds;
    setCurrentSeconds(seekRequest.seconds);
    playQuietly(audio);
  }, [seekRequest]);

  const togglePlay = () => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    if (audio.paused) {
      playQuietly(audio);
    } else {
      audio.pause();
    }
  };

  return (
    <section
      aria-label="Viva playback"
      className="sticky bottom-0 z-20 -mx-6 border-t border-outline-variant bg-surface-container-lowest px-6 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-technical"
    >
      <audio
        className="hidden"
        data-testid="submission-viva-player"
        onDurationChange={(event) => {
          const audio = event.currentTarget;

          if (!Number.isFinite(audio.duration)) {
            return;
          }

          setDurationSeconds(audio.duration);

          if (isProbingDurationRef.current) {
            isProbingDurationRef.current = false;
            audio.currentTime = 0;
          }
        }}
        onEnded={() => setIsPlaying(false)}
        onLoadedMetadata={(event) => {
          const audio = event.currentTarget;

          // Browser-recorded WebM carries no duration, so the seek bar would
          // have no end. Seeking past the end makes the browser work it out.
          if (audio.duration === Infinity) {
            isProbingDurationRef.current = true;
            audio.currentTime = Number.MAX_SAFE_INTEGER;
          }
        }}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onTimeUpdate={(event) => {
          if (!isProbingDurationRef.current) {
            setCurrentSeconds(event.currentTarget.currentTime);
          }
        }}
        preload="metadata"
        ref={audioRef}
        src={src}
      >
        <track kind="captions" />
      </audio>

      <div className="flex items-center gap-3">
        <Button
          aria-label={isPlaying ? "Pause viva" : "Play viva"}
          iconOnly
          onClick={togglePlay}
          size="lg"
        >
          {isPlaying ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
        </Button>

        <div className="grid min-w-0 flex-1 gap-1.5">
          <div className="flex items-baseline justify-between gap-3 text-xs">
            <span className="truncate font-semibold text-on-surface">{fileName}</span>
            <span className={cn(mutedTextClassName, "shrink-0 tabular-nums")}>
              <span>{formatElapsedDuration(currentSeconds)}</span>
              {durationSeconds > 0
                ? ` / ${formatElapsedDuration(durationSeconds)}`
                : null}
            </span>
          </div>
          <input
            aria-label="Seek viva"
            className="h-5 w-full cursor-pointer accent-primary-container"
            max={Math.max(durationSeconds, currentSeconds)}
            min={0}
            onChange={(event) => {
              const audio = audioRef.current;
              const seconds = Number(event.currentTarget.value);

              if (audio) {
                audio.currentTime = seconds;
              }

              setCurrentSeconds(seconds);
            }}
            step={1}
            type="range"
            value={Math.floor(currentSeconds)}
          />
        </div>
      </div>
    </section>
  );
}
