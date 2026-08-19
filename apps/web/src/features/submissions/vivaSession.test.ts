import { describe, expect, it } from "vitest";
import {
  evaluateReadiness,
  startVivaSession,
  type ReadinessChecklist,
  type VivaSessionRecord,
  type VivaSessionRepository,
} from "./vivaSession";

function baseChecklist(
  overrides: Partial<ReadinessChecklist> = {},
): ReadinessChecklist {
  return {
    accessibilityAdjustments: "",
    consentDeclinedReason: "",
    consentState: "consent_given",
    equipmentCheckResult: "passed",
    expectedDurationMinutes: 10,
    questionSetStatus: "ready",
    studentConfirmed: true,
    ...overrides,
  };
}

describe("evaluateReadiness", () => {
  it("is ready when every check passes", () => {
    expect(evaluateReadiness(baseChecklist())).toEqual({
      blockingReasons: [],
      isReady: true,
    });
  });

  it("blocks when the question set is a draft", () => {
    const result = evaluateReadiness(
      baseChecklist({ questionSetStatus: "draft" }),
    );

    expect(result.isReady).toBe(false);
    expect(result.blockingReasons).toContain(
      "Mark the Viva Question Set ready before starting a Viva Session.",
    );
  });

  it("blocks when the student and submission have not been confirmed", () => {
    const result = evaluateReadiness(
      baseChecklist({ studentConfirmed: false }),
    );

    expect(result.blockingReasons).toContain(
      "Confirm the student and submission are correct.",
    );
  });

  it("blocks when consent has not been recorded", () => {
    const result = evaluateReadiness(baseChecklist({ consentState: null }));

    expect(result.blockingReasons).toContain(
      "Record recording consent, or the reason recording is disabled.",
    );
  });

  it("blocks when recording is disabled without a reason", () => {
    const result = evaluateReadiness(
      baseChecklist({
        consentDeclinedReason: "",
        consentState: "recording_disabled",
      }),
    );

    expect(result.blockingReasons).toContain(
      "Enter a reason recording is disabled.",
    );
  });

  it("is ready when recording is disabled with a reason", () => {
    const result = evaluateReadiness(
      baseChecklist({
        consentDeclinedReason: "Student has a hearing accommodation.",
        consentState: "recording_disabled",
      }),
    );

    expect(result).toEqual({ blockingReasons: [], isReady: true });
  });

  it("blocks when the equipment check has not passed", () => {
    expect(
      evaluateReadiness(
        baseChecklist({ equipmentCheckResult: null }),
      ).blockingReasons,
    ).toContain("Run the microphone check and confirm it passes.");
    expect(
      evaluateReadiness(
        baseChecklist({ equipmentCheckResult: "failed" }),
      ).blockingReasons,
    ).toContain("Run the microphone check and confirm it passes.");
  });

  it("blocks when the expected duration is missing or not positive", () => {
    expect(
      evaluateReadiness(
        baseChecklist({ expectedDurationMinutes: null }),
      ).blockingReasons,
    ).toContain("Enter an expected duration greater than zero.");
    expect(
      evaluateReadiness(
        baseChecklist({ expectedDurationMinutes: 0 }),
      ).blockingReasons,
    ).toContain("Enter an expected duration greater than zero.");
    expect(
      evaluateReadiness(
        baseChecklist({ expectedDurationMinutes: -5 }),
      ).blockingReasons,
    ).toContain("Enter an expected duration greater than zero.");
  });

  it("collects every blocking reason at once", () => {
    const result = evaluateReadiness({
      accessibilityAdjustments: "",
      consentDeclinedReason: "",
      consentState: null,
      equipmentCheckResult: null,
      expectedDurationMinutes: null,
      questionSetStatus: "draft",
      studentConfirmed: false,
    });

    expect(result.blockingReasons).toHaveLength(5);
  });
});

function createFakeRepository(): VivaSessionRepository & {
  insertCallCount: number;
  sessions: VivaSessionRecord[];
} {
  const sessions: VivaSessionRecord[] = [];
  let insertCallCount = 0;

  return {
    sessions,
    get insertCallCount() {
      return insertCallCount;
    },
    async endSession(vivaSessionId) {
      const session = sessions.find((candidate) => candidate.id === vivaSessionId);

      if (session) {
        session.status = "ended";
      }
    },
    async findActiveSession(vivaQuestionSetId) {
      return (
        sessions.find(
          (session) =>
            session.vivaQuestionSetId === vivaQuestionSetId &&
            session.status === "active",
        ) ?? null
      );
    },
    async insertSession(input) {
      insertCallCount += 1;

      const session: VivaSessionRecord = {
        accessibilityAdjustments: input.accessibilityAdjustments,
        consentDeclinedReason: input.consentDeclinedReason,
        consentState: input.consentState,
        equipmentCheckResult: input.equipmentCheckResult,
        expectedDurationMinutes: input.expectedDurationMinutes,
        id: `session-${sessions.length + 1}`,
        startedAt: "2026-07-12T09:00:00.000Z",
        status: "active",
        submissionId: input.submissionId,
        vivaQuestionSetId: input.vivaQuestionSetId,
      };

      sessions.push(session);

      return session;
    },
  };
}

const startInput = {
  accessibilityAdjustments: "",
  consentDeclinedReason: null,
  consentState: "consent_given" as const,
  equipmentCheckResult: "passed" as const,
  expectedDurationMinutes: 12,
  submissionId: "submission-1",
  vivaQuestionSetId: "question-set-1",
};

describe("startVivaSession", () => {
  it("creates a new active session when none exists", async () => {
    const repository = createFakeRepository();

    const result = await startVivaSession(startInput, repository);

    expect(result.outcome).toBe("started");
    expect(result.session.status).toBe("active");
    expect(repository.insertCallCount).toBe(1);
  });

  it("does not create a second active session for the same question set", async () => {
    const repository = createFakeRepository();

    const first = await startVivaSession(startInput, repository);
    const second = await startVivaSession(startInput, repository);

    expect(first.outcome).toBe("started");
    expect(second.outcome).toBe("already_active");
    expect(second.session.id).toBe(first.session.id);
    expect(repository.insertCallCount).toBe(1);
    expect(repository.sessions).toHaveLength(1);
  });

  it("allows starting a new session for a different question set", async () => {
    const repository = createFakeRepository();

    await startVivaSession(startInput, repository);
    const otherResult = await startVivaSession(
      { ...startInput, vivaQuestionSetId: "question-set-2" },
      repository,
    );

    expect(otherResult.outcome).toBe("started");
    expect(repository.insertCallCount).toBe(2);
  });
});
