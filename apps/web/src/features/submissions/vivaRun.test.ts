import { describe, expect, it } from "vitest";
import {
  admittedThreads,
  clampCursor,
  deriveRunPhase,
  describeRecording,
  summarizeRun,
  type DeriveRunPhaseInput,
  type Entry,
  type RunRecording,
  type RunSession,
  type Thread,
} from "./vivaRun";

function createThread(overrides: Partial<Thread> = {}): Thread {
  return {
    anchor: null,
    category: "comprehension_and_accuracy",
    entries: [],
    id: "thread-1",
    origin: "generated",
    position: null,
    prompt: "What do you mean by hegemonic here?",
    ...overrides,
  };
}

function createSession(overrides: Partial<RunSession> = {}): RunSession {
  return {
    consentDeclinedReason: null,
    consentState: "consent_given",
    id: "session-1",
    startedAt: "2026-07-30T09:00:00.000Z",
    status: "active",
    ...overrides,
  };
}

function createInput(
  overrides: Partial<DeriveRunPhaseInput> = {},
): DeriveRunPhaseInput {
  return {
    cursor: 0,
    generation: "idle",
    hasCompletedGeneration: false,
    hasOpenedGate: false,
    isLoading: false,
    loadErrorMessage: null,
    readiness: { blockingReasons: [], isReady: true },
    recording: { elapsedSeconds: 0, failedChunkCount: 0, state: "capturing" },
    session: null,
    setStatus: "draft",
    threads: [],
    unsavedCount: 0,
    ...overrides,
  };
}

const askedEntry: Entry = {
  at: "2026-07-30T09:01:00.000Z",
  elapsedSeconds: 60,
  id: "entry-asked",
  kind: "asked",
};

describe("deriveRunPhase", () => {
  it("reports a load failure with a way out instead of an empty page", () => {
    const phase = deriveRunPhase(
      createInput({ loadErrorMessage: "We could not load the submission." }),
    );

    expect(phase.kind).toBe("unavailable");
    if (phase.kind !== "unavailable") return;
    expect(phase.message).toBe("We could not load the submission.");
    expect(phase.deck.primary.label).toBe("Try again");
  });

  it("offers a retry when preparation finished but produced no questions", () => {
    const phase = deriveRunPhase(
      createInput({ hasCompletedGeneration: true, threads: [] }),
    );

    expect(phase.kind).toBe("preparing");
    if (phase.kind !== "preparing") return;
    expect(phase.deck.primary.blockedBy).toBeUndefined();
    expect(phase.deck.primary.label).toBe("Try again");
  });

  it("keeps the teacher waiting rather than offering a retry while generation runs", () => {
    const phase = deriveRunPhase(createInput({ generation: "running" }));

    expect(phase.kind).toBe("preparing");
    if (phase.kind !== "preparing") return;
    expect(phase.deck.primary.blockedBy).toEqual([
      "Questions are still being prepared.",
    ]);
  });

  it("blocks the readiness check until at least one question is in the set", () => {
    const phase = deriveRunPhase(
      createInput({ threads: [createThread({ position: null })] }),
    );

    expect(phase.kind).toBe("composing");
    if (phase.kind !== "composing") return;
    expect(phase.admittedCount).toBe(0);
    expect(phase.deck.primary.blockedBy).toEqual([
      "Add at least one question to the set.",
    ]);
  });

  it("names the blocking readiness reasons on the action that is blocked", () => {
    const phase = deriveRunPhase(
      createInput({
        hasOpenedGate: true,
        readiness: {
          blockingReasons: ["Run the microphone check and confirm it passes."],
          isReady: false,
        },
        threads: [createThread({ position: 0 })],
      }),
    );

    expect(phase.kind).toBe("gated");
    if (phase.kind !== "gated") return;
    expect(phase.deck.primary.blockedBy).toEqual([
      "Run the microphone check and confirm it passes.",
    ]);
    expect(phase.deck.status).toBe("Not recording");
  });

  it("commits to recording in the same action that opens the session", () => {
    const phase = deriveRunPhase(
      createInput({
        hasOpenedGate: true,
        threads: [createThread({ position: 0 })],
      }),
    );

    expect(phase.kind).toBe("gated");
    if (phase.kind !== "gated") return;
    expect(phase.deck.primary.blockedBy).toBeUndefined();
    expect(phase.deck.primary.label).toBe("Begin viva and start recording");
  });

  it("surfaces an open session that is not recording, and makes fixing it the primary action", () => {
    const phase = deriveRunPhase(
      createInput({
        recording: { state: "not_started" },
        session: createSession(),
        threads: [createThread({ position: 0 })],
      }),
    );

    expect(phase.kind).toBe("live");
    if (phase.kind !== "live") return;
    expect(phase.deck.status).toBe("Not recording");
    expect(phase.deck.primary.label).toBe("Start recording");
  });

  it("lets a consent-declined viva proceed without ever claiming to record", () => {
    const phase = deriveRunPhase(
      createInput({
        recording: { reason: "Student declined", state: "declined" },
        session: createSession({
          consentDeclinedReason: "Student declined",
          consentState: "recording_disabled",
        }),
        threads: [createThread({ position: 0 })],
      }),
    );

    expect(phase.kind).toBe("live");
    if (phase.kind !== "live") return;
    expect(phase.deck.status).toBe("Written record only — no audio");
    expect(phase.deck.primary.label).toBe("Asked — finish");
  });

  it("puts saving audio ahead of advancing when chunks are failing", () => {
    const phase = deriveRunPhase(
      createInput({
        recording: { failedChunkCount: 3, state: "at_risk" },
        session: createSession(),
        threads: [createThread({ position: 0 }), createThread({ id: "t2", position: 1 })],
      }),
    );

    expect(phase.kind).toBe("live");
    if (phase.kind !== "live") return;
    expect(phase.deck.primary.label).toBe("Retry saving audio");
    expect(phase.deck.secondary?.[0]?.id).toBe("ask-advance");
  });

  it("tells the teacher when the current question is the last one", () => {
    const twoThreads = [
      createThread({ id: "t1", position: 0 }),
      createThread({ id: "t2", position: 1 }),
    ];

    const middle = deriveRunPhase(
      createInput({ cursor: 0, session: createSession(), threads: twoThreads }),
    );
    const last = deriveRunPhase(
      createInput({ cursor: 1, session: createSession(), threads: twoThreads }),
    );

    expect(middle.kind === "live" && middle.deck.primary.label).toBe("Asked — next");
    expect(last.kind === "live" && last.deck.primary.label).toBe("Asked — finish");
  });

  it("keeps the cursor inside the set when questions disappear mid-session", () => {
    const phase = deriveRunPhase(
      createInput({
        cursor: 7,
        session: createSession(),
        threads: [createThread({ position: 0 })],
      }),
    );

    expect(phase.kind).toBe("live");
    if (phase.kind !== "live") return;
    expect(phase.cursor).toBe(0);
  });

  it("reports what was captured once the viva has ended", () => {
    const phase = deriveRunPhase(
      createInput({
        session: createSession({ status: "ended" }),
        threads: [
          createThread({ id: "t1", position: 0, entries: [askedEntry] }),
          createThread({
            id: "t2",
            origin: "live",
            entries: [
              askedEntry,
              {
                at: "2026-07-30T09:05:00.000Z",
                id: "entry-marker",
                kind: "marker",
                marker: "concern",
              },
            ],
          }),
        ],
      }),
    );

    expect(phase.kind).toBe("closed");
    if (phase.kind !== "closed") return;
    expect(phase.receipt).toMatchObject({
      askedCount: 2,
      followUpCount: 1,
      markerCount: 1,
      plannedCount: 1,
    });
  });
});

describe("admittedThreads", () => {
  it("returns only set members, in set order", () => {
    const ordered = admittedThreads([
      createThread({ id: "second", position: 1 }),
      createThread({ id: "loose", position: null }),
      createThread({ id: "first", position: 0 }),
    ]);

    expect(ordered.map((thread) => thread.id)).toEqual(["first", "second"]);
  });
});

describe("clampCursor", () => {
  it("stays inside the list and collapses to zero when the list is empty", () => {
    expect(clampCursor(-3, 4)).toBe(0);
    expect(clampCursor(9, 4)).toBe(3);
    expect(clampCursor(2, 0)).toBe(0);
  });
});

describe("summarizeRun", () => {
  it("refuses to look settled while writes are still pending", () => {
    const receipt = summarizeRun([createThread({ entries: [askedEntry] })], 2);

    expect(receipt.unsavedCount).toBe(2);
    expect(receipt.askedCount).toBe(1);
  });
});

describe("describeRecording", () => {
  it("counts unsaved parts in singular and plural", () => {
    const one: RunRecording = { failedChunkCount: 1, state: "at_risk" };
    const many: RunRecording = { failedChunkCount: 4, state: "at_risk" };

    expect(describeRecording(one)).toBe("Recording — 1 part not yet saved");
    expect(describeRecording(many)).toBe("Recording — 4 parts not yet saved");
  });
});
