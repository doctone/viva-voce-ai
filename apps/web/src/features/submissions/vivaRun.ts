import type { EvidenceMarkerType } from "./vivaSessionCapture";
import type { QuestionSetStatus, VivaQuestionCategory } from "./vivaQuestionSet";
import type { ConsentState, ReadinessValidation } from "./vivaSession";

/**
 * A question about the work, plus everything ever attached to it.
 *
 * `viva_questions` and `asked_questions` were one concept the schema split;
 * a Thread is that concept whole. Whether a question was planned or raised
 * live is `origin`, not a different table.
 */
export type Thread = {
  anchor: PassageAnchor | null;
  category: VivaQuestionCategory | "follow_up";
  entries: readonly Entry[];
  id: string;
  origin: ThreadOrigin;
  /** null = not admitted to the set. */
  position: number | null;
  prompt: string;
};

export type ThreadOrigin = "generated" | "authored" | "live";

/** Reserved. Always null until the generator returns verified spans. */
export type PassageAnchor = {
  end: number;
  exact: string;
  start: number;
  textHash: string;
};

export type Entry =
  | { at: string; id: string; kind: "note"; text: string }
  | { at: string; elapsedSeconds: number; id: string; kind: "asked" }
  | { at: string; id: string; kind: "observation"; text: string }
  | { at: string; id: string; kind: "marker"; marker: EvidenceMarkerType };

export type EntryKind = Entry["kind"];

export type RunSession = {
  consentState: ConsentState;
  consentDeclinedReason: string | null;
  id: string;
  startedAt: string;
  status: "active" | "ended";
};

/**
 * Capture state as the page must present it.
 *
 * `not_started` is the state this whole redesign exists to make visible: a
 * session row exists, consent was given, and no audio is being captured. It is
 * unreachable through `beginViva`, but a refresh or a crash mid-viva can land
 * here, so it is named and always surfaced rather than left to look identical
 * to a healthy recording.
 */
export type RunRecording =
  | { elapsedSeconds: number; failedChunkCount: number; state: "capturing" }
  | { elapsedSeconds: number; state: "paused" }
  | { failedChunkCount: number; state: "at_risk" }
  | { state: "not_started" }
  | { reason: string; state: "declined" };

export type DeckAction = {
  /** Non-empty means disabled, and the reasons are announced, not hidden. */
  blockedBy?: readonly string[];
  id: string;
  keyHint?: string;
  label: string;
};

/**
 * Exactly one primary action, enforced by the type rather than by convention.
 * "Open the session" and "start recording" cannot become two buttons because
 * there is only one slot to put them in.
 */
export type Deck = {
  primary: DeckAction;
  secondary?: readonly [DeckAction?, DeckAction?, DeckAction?];
  status: string;
};

export type RunPhase =
  | { kind: "loading" }
  | { deck: Deck; kind: "unavailable"; message: string }
  | { deck: Deck; kind: "preparing"; message: string }
  | { admittedCount: number; deck: Deck; kind: "composing"; threads: readonly Thread[] }
  | {
      blockingReasons: readonly string[];
      deck: Deck;
      kind: "gated";
      threads: readonly Thread[];
    }
  | {
      cursor: number;
      deck: Deck;
      kind: "live";
      recording: RunRecording;
      session: RunSession;
      threads: readonly Thread[];
    }
  | { deck: Deck; kind: "closed"; receipt: RunReceipt; session: RunSession };

export type RunReceipt = {
  askedCount: number;
  followUpCount: number;
  markerCount: number;
  observationCount: number;
  plannedCount: number;
  /** The close card must not settle while this is above zero. */
  unsavedCount: number;
};

export type DeriveRunPhaseInput = {
  cursor: number;
  generation: "idle" | "running" | "failed";
  hasCompletedGeneration: boolean;
  hasOpenedGate: boolean;
  isLoading: boolean;
  loadErrorMessage: string | null;
  readiness: ReadinessValidation;
  recording: RunRecording;
  session: RunSession | null;
  setStatus: QuestionSetStatus;
  threads: readonly Thread[];
  unsavedCount: number;
};

export function admittedThreads(threads: readonly Thread[]): readonly Thread[] {
  return threads
    .filter((thread) => thread.position !== null)
    .slice()
    .sort((left, right) => (left.position as number) - (right.position as number));
}

export function hasEntry(thread: Thread, kind: EntryKind): boolean {
  return thread.entries.some((entry) => entry.kind === kind);
}

export function clampCursor(cursor: number, length: number): number {
  if (length <= 0) {
    return 0;
  }

  return Math.min(Math.max(cursor, 0), length - 1);
}

export function summarizeRun(threads: readonly Thread[], unsavedCount: number): RunReceipt {
  const asked = threads.filter((thread) => hasEntry(thread, "asked"));

  return {
    askedCount: asked.length,
    followUpCount: asked.filter((thread) => thread.origin === "live").length,
    markerCount: threads.filter((thread) => hasEntry(thread, "marker")).length,
    observationCount: threads.filter((thread) => hasEntry(thread, "observation")).length,
    plannedCount: admittedThreads(threads).length,
    unsavedCount,
  };
}

export function describeRecording(recording: RunRecording): string {
  switch (recording.state) {
    case "capturing":
      return "Recording";
    case "paused":
      return "Recording paused";
    case "at_risk":
      return `Recording — ${recording.failedChunkCount} part${
        recording.failedChunkCount === 1 ? "" : "s"
      } not yet saved`;
    case "not_started":
      return "Not recording";
    case "declined":
      return "Written record only — no audio";
  }
}

/**
 * The single decision about what the page is. Pure: no React, no Supabase, no
 * router. Everything the page renders follows from this, so the interesting
 * behaviour is testable without mounting anything.
 */
export function deriveRunPhase(input: DeriveRunPhaseInput): RunPhase {
  if (input.loadErrorMessage !== null) {
    return {
      deck: {
        primary: { id: "retry-load", label: "Try again" },
        status: "Could not load this submission",
      },
      kind: "unavailable",
      message: input.loadErrorMessage,
    };
  }

  if (input.isLoading) {
    return { kind: "loading" };
  }

  const session = input.session;

  if (session !== null && session.status === "ended") {
    return {
      deck: {
        primary: { id: "next-student", keyHint: "N", label: "Next student" },
        secondary: [{ id: "review-record", label: "Review the record" }],
        status: "Viva ended",
      },
      kind: "closed",
      receipt: summarizeRun(input.threads, input.unsavedCount),
      session,
    };
  }

  if (session !== null) {
    return {
      cursor: clampCursor(input.cursor, admittedThreads(input.threads).length),
      deck: deriveLiveDeck(input),
      kind: "live",
      recording: input.recording,
      session,
      threads: input.threads,
    };
  }

  const preparing = derivePreparingPhase(input);

  if (preparing !== null) {
    return preparing;
  }

  if (input.hasOpenedGate) {
    return {
      blockingReasons: input.readiness.blockingReasons,
      deck: {
        primary: {
          blockedBy: input.readiness.isReady
            ? undefined
            : input.readiness.blockingReasons,
          id: "begin-viva",
          keyHint: "Enter",
          // One act, one consequence. The label cannot lie because the action
          // seals the set, opens the session and arms the recorder together.
          label: "Begin viva and start recording",
        },
        secondary: [{ id: "leave-gate", label: "Back to the question set" }],
        status: "Not recording",
      },
      kind: "gated",
      threads: input.threads,
    };
  }

  const admitted = admittedThreads(input.threads);

  return {
    admittedCount: admitted.length,
    deck: {
      primary: {
        blockedBy:
          admitted.length === 0
            ? ["Add at least one question to the set."]
            : undefined,
        id: "open-gate",
        keyHint: "Enter",
        label: "Begin readiness check",
      },
      secondary:
        input.setStatus === "ready"
          ? [{ id: "reopen-set", label: "Reopen set" }]
          : undefined,
      status: `${admitted.length} of ${input.threads.length} in the set`,
    },
    kind: "composing",
    threads: input.threads,
  };
}

function derivePreparingPhase(input: DeriveRunPhaseInput): RunPhase | null {
  if (input.generation === "running") {
    return {
      deck: {
        primary: {
          blockedBy: ["Questions are still being prepared."],
          id: "await-generation",
          label: "Begin readiness check",
        },
        status: "Preparing questions",
      },
      kind: "preparing",
      message:
        "We are reading this submission and drafting questions. This usually takes a few seconds.",
    };
  }

  if (input.threads.length > 0) {
    return null;
  }

  if (input.generation === "failed") {
    return {
      deck: {
        primary: { id: "retry-generation", label: "Try again" },
        status: "Preparation failed",
      },
      kind: "preparing",
      message: "We saved the submission, but could not prepare viva questions.",
    };
  }

  // Generation finished and produced nothing. Without this branch the page sits
  // on "preparing" forever with retry blocked by the trigger guard.
  if (input.hasCompletedGeneration) {
    return {
      deck: {
        primary: { id: "retry-generation", label: "Try again" },
        status: "No questions prepared",
      },
      kind: "preparing",
      message:
        "We finished reading this submission but did not produce any questions.",
    };
  }

  return {
    deck: {
      primary: {
        blockedBy: ["Questions are still being prepared."],
        id: "await-generation",
        label: "Begin readiness check",
      },
      status: "Preparing questions",
    },
    kind: "preparing",
    message:
      "We are reading this submission and drafting questions. This usually takes a few seconds.",
  };
}

function deriveLiveDeck(input: DeriveRunPhaseInput): Deck {
  const status = describeRecording(input.recording);

  // Losing evidence outranks the flow: when capture has stopped or is failing,
  // recovering it takes the primary slot away from advancing the viva.
  if (input.recording.state === "not_started") {
    return {
      primary: { id: "start-recording", label: "Start recording" },
      secondary: [{ id: "end-viva", keyHint: "Esc", label: "End viva" }],
      status,
    };
  }

  if (input.recording.state === "at_risk") {
    return {
      primary: { id: "retry-chunks", label: "Retry saving audio" },
      secondary: [
        { id: "ask-advance", keyHint: "Space", label: "Asked — next" },
        { id: "end-viva", keyHint: "Esc", label: "End viva" },
      ],
      status,
    };
  }

  const admitted = admittedThreads(input.threads);
  const cursor = clampCursor(input.cursor, admitted.length);
  const isLastQuestion = cursor >= admitted.length - 1;

  return {
    primary: {
      id: "ask-advance",
      keyHint: "Space",
      label: isLastQuestion ? "Asked — finish" : "Asked — next",
    },
    secondary: [
      {
        id: "toggle-pause",
        keyHint: "P",
        label: input.recording.state === "paused" ? "Resume" : "Pause",
      },
      { id: "end-viva", keyHint: "Esc", label: "End viva" },
    ],
    status,
  };
}
