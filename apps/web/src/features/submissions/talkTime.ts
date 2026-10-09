import type { Speaker } from "./speakerAttribution";

export type TimedUtterance = {
  endMs: number;
  speaker: Speaker;
  startMs: number;
};

/** An Asked Question's span: from when it was asked to when the next began. */
export type QuestionWindow = {
  endMs: number | null;
  id: string;
  startMs: number;
};

export type TalkTime = {
  /** The longest run of Student speech with no one else speaking in it. */
  longestStudentRunMs: number;
  studentMs: number;
  /** Student's share of attributed speech, 0-100; null when nobody spoke. */
  studentSharePercent: number | null;
  teacherMs: number;
  /** Speech nobody could be named for. Shown, never counted for either side. */
  unclearMs: number;
};

export type QuestionTalkTime = TalkTime & { id: string };

/** Student pauses shorter than this stay one answer. */
export const ANSWER_PAUSE_MS = 2_000;

type Interval = { endMs: number; startMs: number };

function mergedDuration(intervals: readonly Interval[]): number {
  const sorted = [...intervals].sort((a, b) => a.startMs - b.startMs);
  let total = 0;
  let current: Interval | null = null;

  for (const interval of sorted) {
    if (current && interval.startMs <= current.endMs) {
      current.endMs = Math.max(current.endMs, interval.endMs);
    } else {
      if (current) total += current.endMs - current.startMs;
      current = { ...interval };
    }
  }

  return current ? total + current.endMs - current.startMs : 0;
}

function clip(
  utterances: readonly TimedUtterance[],
  startMs: number,
  endMs: number,
): TimedUtterance[] {
  return utterances
    .map((u) => ({
      ...u,
      endMs: Math.min(u.endMs, endMs),
      startMs: Math.max(u.startMs, startMs),
    }))
    .filter((u) => u.endMs > u.startMs);
}

function longestStudentRun(utterances: readonly TimedUtterance[]): number {
  const sorted = [...utterances].sort((a, b) => a.startMs - b.startMs);
  let longest = 0;
  let run: Interval | null = null;

  const close = () => {
    if (run) longest = Math.max(longest, run.endMs - run.startMs);
    run = null;
  };

  for (const u of sorted) {
    if (u.speaker !== "student") {
      // Anyone else speaking, including unclear speech, ends the answer.
      close();
    } else if (run && u.startMs - run.endMs <= ANSWER_PAUSE_MS) {
      run.endMs = Math.max(run.endMs, u.endMs);
    } else {
      close();
      run = { endMs: u.endMs, startMs: u.startMs };
    }
  }
  close();

  return longest;
}

/**
 * Speaking time from labelled utterances.
 *
 * - Each speaker's time is the union of their own utterances, so a speaker
 *   overlapping themselves is not counted twice.
 * - Teacher and Student speaking at once both count: both were speaking.
 * - Gaps between utterances count for no one.
 * - `unknown` speech is totalled separately and excluded from the share, so
 *   unattributed audio can never inflate or deflate either side.
 */
export function computeTalkTime(utterances: readonly TimedUtterance[]): TalkTime {
  const valid = utterances.filter((u) => u.endMs > u.startMs);
  const ofSpeaker = (speaker: Speaker) => valid.filter((u) => u.speaker === speaker);
  const studentMs = mergedDuration(ofSpeaker("student"));
  const teacherMs = mergedDuration(ofSpeaker("teacher"));
  const attributed = studentMs + teacherMs;

  return {
    longestStudentRunMs: longestStudentRun(valid),
    studentMs,
    studentSharePercent:
      attributed === 0 ? null : Math.round((studentMs / attributed) * 100),
    teacherMs,
    unclearMs: mergedDuration(ofSpeaker("unknown")),
  };
}

/**
 * Talk time per Asked Question. Speech is clipped to the question's window, so
 * an utterance straddling two questions is split between them. Speech before
 * the first question belongs to no question (it still counts in the session).
 */
export function computeQuestionTalkTimes(
  utterances: readonly TimedUtterance[],
  windows: readonly QuestionWindow[],
): QuestionTalkTime[] {
  return windows.map((window) => ({
    id: window.id,
    ...computeTalkTime(
      clip(utterances, window.startMs, window.endMs ?? Number.POSITIVE_INFINITY),
    ),
  }));
}

/** Windows run from each ask to the next; the last is open-ended. */
export function buildQuestionWindows(
  asks: ReadonlyArray<{ id: string; startMs: number }>,
): QuestionWindow[] {
  const sorted = [...asks].sort((a, b) => a.startMs - b.startMs);

  return sorted.map((ask, index) => ({
    endMs: sorted[index + 1]?.startMs ?? null,
    id: ask.id,
    startMs: ask.startMs,
  }));
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return minutes === 0 ? `${seconds} s` : `${minutes} min ${seconds} s`;
}

export function speakerLabel(
  speaker: Speaker,
  studentFirstName?: string | null,
): string {
  if (speaker === "teacher") return "Teacher";
  if (speaker === "student") return studentFirstName?.trim() || "Student";
  return "Speaker unclear";
}

export function describeStudentTalk(talk: TalkTime, studentLabel = "Student"): string {
  if (talk.studentSharePercent === null) {
    return `${studentLabel} 0 s · no speech attributed`;
  }

  return `${studentLabel} ${formatDuration(talk.studentMs)} · ${talk.studentSharePercent}%`;
}

export const TALK_TIME_NOTE =
  "Speaking time is evidence to read alongside the answers, not a score. A longer or shorter answer says nothing about understanding.";

/**
 * The live feed runs ahead of the stored transcript and repeats it. Dropping as
 * many words as the stored text holds leaves roughly the part not yet stored,
 * which is the only part that should appear unlabelled.
 */
export function liveTailBeyondStored(liveText: string, storedText: string): string {
  const words = (text: string) => text.split(/\s+/).filter(Boolean);

  return words(liveText).slice(words(storedText).length).join(" ");
}
