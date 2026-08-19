/** How many bars the meter keeps. At ~30fps this is roughly two seconds of speech. */
export const LEVEL_HISTORY_CAPACITY = 56;

/** Below this, the input is indistinguishable from a silent room. */
export const SILENCE_LEVEL = 0.015;

/**
 * Root mean square of one analyser frame, normalised to 0..1.
 *
 * Time-domain samples arrive as bytes centred on 128, so each is re-centred
 * before squaring. RMS rather than peak: peak jumps on a cough and tells a
 * teacher nothing about whether speech is being captured.
 */
export function computeInputLevel(samples: Uint8Array): number {
  if (samples.length === 0) {
    return 0;
  }

  let sumOfSquares = 0;

  for (const sample of samples) {
    const centred = (sample - 128) / 128;
    sumOfSquares += centred * centred;
  }

  return Math.min(1, Math.sqrt(sumOfSquares / samples.length));
}

/** Newest level last, oldest dropped once the window is full. */
export function appendLevel(
  history: readonly number[],
  level: number,
  capacity: number = LEVEL_HISTORY_CAPACITY,
): number[] {
  const next = [...history, level];

  return next.length > capacity ? next.slice(next.length - capacity) : next;
}

/**
 * Bar height as a percentage of the meter.
 *
 * The square root lifts quiet speech into a visible range — a linear mapping
 * leaves ordinary conversation sitting almost flat — and every bar keeps a
 * floor so the meter reads as a working instrument at rest rather than as a
 * component that failed to render.
 */
export function scaleLevelToBarHeight(level: number, floorPercent = 8): number {
  const boosted = Math.sqrt(Math.max(0, Math.min(1, level)));

  return floorPercent + boosted * (100 - floorPercent);
}

/** How long a take can hear nothing at all before it is worth mentioning. */
export const SILENCE_WARNING_MS = 6_000;

export type SilenceState = {
  /** Anything above the silence floor heard at any point in this take. */
  hasHeardSound: boolean;
  /** Milliseconds since the recording started. */
  elapsedMs: number;
};

/**
 * Warns about a microphone that has never picked anything up — muted, or the
 * wrong input device selected.
 *
 * Deliberately not a "no sound right now" check. A viva is full of silence: a
 * student thinking, a teacher reading back a passage. Warning on those would
 * train the teacher to ignore the warning, so once any sound has been heard
 * this take, it stays quiet for good.
 */
export function shouldWarnAboutSilence(
  { elapsedMs, hasHeardSound }: SilenceState,
  thresholdMs: number = SILENCE_WARNING_MS,
): boolean {
  if (hasHeardSound) {
    return false;
  }

  return elapsedMs >= thresholdMs;
}
