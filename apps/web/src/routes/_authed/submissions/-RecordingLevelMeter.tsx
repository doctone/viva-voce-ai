import * as React from "react";
import { cn } from "~/lib/utils";
import { mutedTextClassName } from "~/lib/class-names";
import {
  appendLevel,
  computeInputLevel,
  LEVEL_HISTORY_CAPACITY,
  scaleLevelToBarHeight,
  shouldWarnAboutSilence,
  SILENCE_LEVEL,
} from "../../../features/submissions/audioLevelMeter";

type RecordingLevelMeterProps = {
  getMediaStream: () => MediaStream | null;
  isPaused: boolean;
};

type AudioContextConstructor = new () => AudioContext;

function resolveAudioContext(): AudioContextConstructor | null {
  if (typeof window === "undefined") {
    return null;
  }

  const candidate =
    window.AudioContext ??
    (window as { webkitAudioContext?: AudioContextConstructor })
      .webkitAudioContext;

  return candidate ?? null;
}

/**
 * A rolling picture of what the microphone is hearing.
 *
 * Bar heights are written straight to the DOM from the animation frame rather
 * than held in state: a viva runs for twenty minutes, and re-rendering the page
 * thirty times a second for a decorative reading would cost far more than the
 * reading is worth. Only the silence warning — which changes seconds apart, not
 * frames apart — goes through React.
 */
export function RecordingLevelMeter({
  getMediaStream,
  isPaused,
}: RecordingLevelMeterProps) {
  const barsRef = React.useRef<Array<HTMLSpanElement | null>>([]);
  const [isSilent, setIsSilent] = React.useState(false);

  React.useEffect(() => {
    const stream = getMediaStream();
    const AudioContextConstructor = resolveAudioContext();

    // No Web Audio (jsdom, or an older browser): the bars still render at their
    // floor, so the meter degrades to a static rule rather than an error.
    if (!stream || !AudioContextConstructor || isPaused) {
      return;
    }

    const audioContext = new AudioContextConstructor();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 1024;
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    const samples = new Uint8Array(analyser.fftSize);
    const startedAtMs = performance.now();
    let history: number[] = [];
    let frame = 0;
    let hasHeardSound = false;
    let lastSilentState = false;

    const draw = () => {
      analyser.getByteTimeDomainData(samples);
      history = appendLevel(history, computeInputLevel(samples));

      for (const [index, bar] of barsRef.current.entries()) {
        if (!bar) {
          continue;
        }

        // The newest reading belongs at the right-hand edge, so the meter
        // scrolls the way the conversation moves.
        const level = history[history.length - LEVEL_HISTORY_CAPACITY + index];
        bar.style.height = `${scaleLevelToBarHeight(level ?? 0)}%`;
      }

      if (!hasHeardSound && history[history.length - 1] >= SILENCE_LEVEL) {
        hasHeardSound = true;
      }

      const silentNow = shouldWarnAboutSilence({
        elapsedMs: performance.now() - startedAtMs,
        hasHeardSound,
      });

      if (silentNow !== lastSilentState) {
        lastSilentState = silentNow;
        setIsSilent(silentNow);
      }

      frame = requestAnimationFrame(draw);
    };

    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      source.disconnect();
      analyser.disconnect();
      void audioContext.close();
      setIsSilent(false);
    };
  }, [getMediaStream, isPaused]);

  return (
    <div className="grid w-full max-w-[22rem] justify-items-center gap-2">
      <div
        aria-hidden="true"
        className="flex h-10 w-full items-center justify-center gap-[3px]"
      >
        {Array.from({ length: LEVEL_HISTORY_CAPACITY }).map((_, index) => (
          <span
            className={cn(
              "h-[8%] w-[3px] shrink-0 rounded-[1px] transition-[background-color] duration-150",
              isPaused ? "bg-outline-variant" : "bg-primary",
            )}
            key={index}
            ref={(node) => {
              barsRef.current[index] = node;
            }}
          />
        ))}
      </div>

      <p className="sr-only" role="status">
        {isPaused
          ? "Recording paused."
          : isSilent
            ? "No sound has reached the microphone."
            : "Microphone is picking up sound."}
      </p>

      {isSilent && !isPaused ? (
        <p className={cn(mutedTextClassName, "text-sm leading-6 text-error")}>
          We cannot hear anything. Check the microphone is not muted.
        </p>
      ) : null}
    </div>
  );
}
