import { describe, expect, it } from "vitest";
import {
  VIVA_CONCLUSIONS,
  buildVivaRecordSnapshot,
  formatVivaConclusionLabel,
  signVivaRecord,
  validateConclusionDraft,
  type SignVivaRecordInput,
  type VivaRecord,
  type VivaRecordRepository,
  type VivaRecordSnapshot,
} from "./vivaRecord";

const snapshot: VivaRecordSnapshot = {
  askedQuestions: [],
  questionSet: { questions: [] },
  recording: null,
  session: { endedAt: "2026-10-03T10:30:00Z", startedAt: "2026-10-03T10:00:00Z" },
};

const validDraft = {
  conclusion: "understanding_demonstrated" as const,
  explanation: "  Explained the method unprompted.  ",
  followUpAction: "  ",
};

describe("formatVivaConclusionLabel", () => {
  it("labels every conclusion in teacher language", () => {
    expect(VIVA_CONCLUSIONS.map(formatVivaConclusionLabel)).toEqual([
      "Understanding demonstrated",
      "Further review required",
      "Authenticity concern",
      "Unable to conclude",
    ]);
  });
});

describe("validateConclusionDraft", () => {
  it("requires an explicit conclusion", () => {
    const result = validateConclusionDraft({ ...validDraft, conclusion: null });

    expect(result).toEqual({
      errors: { conclusion: "Choose a Viva Conclusion." },
      ok: false,
    });
  });

  it("requires an explanation", () => {
    const result = validateConclusionDraft({ ...validDraft, explanation: "   " });

    expect(result).toEqual({
      errors: { explanation: "Explain your Viva Conclusion." },
      ok: false,
    });
  });

  it("trims text and treats a blank follow-up action as none", () => {
    expect(validateConclusionDraft(validDraft)).toEqual({
      ok: true,
      value: {
        conclusion: "understanding_demonstrated",
        explanation: "Explained the method unprompted.",
        followUpAction: null,
      },
    });
  });

  it("keeps a follow-up action when one is given", () => {
    const result = validateConclusionDraft({
      ...validDraft,
      followUpAction: " Re-run in a week ",
    });

    expect(result).toMatchObject({
      ok: true,
      value: { followUpAction: "Re-run in a week" },
    });
  });
});

describe("buildVivaRecordSnapshot", () => {
  const build = (overrides = {}) =>
    buildVivaRecordSnapshot({
      askedQuestions: [
        {
          askedAt: "2026-10-03T10:05:00Z",
          evidenceMarker: { markerType: "concern" },
          id: "a1",
          isUnplanned: false,
          observation: { content: "Hesitated" },
          questionText: "Why this method?",
          vivaQuestionId: "q1",
        },
        {
          askedAt: "2026-10-03T10:10:00Z",
          evidenceMarker: null,
          id: "a2",
          isUnplanned: true,
          observation: null,
          questionText: "Say more?",
          vivaQuestionId: null,
        },
      ],
      recordingChunks: [
        { mimeType: "audio/webm", sequence: 1, storagePath: "s/1.webm" },
        { mimeType: "audio/webm", sequence: 0, storagePath: "s/0.webm" },
      ],
      session: { endedAt: "2026-10-03T10:30:00Z", startedAt: "2026-10-03T10:00:00Z" },
      setQuestions: [
        { id: "q2", questionText: "Second", setPosition: 2, teacherNote: "n2" },
        { id: "q1", questionText: "First", setPosition: 1, teacherNote: "n1" },
      ],
      ...overrides,
    });

  it("captures asked questions with their observation and marker", () => {
    expect(build().askedQuestions).toEqual([
      {
        askedAt: "2026-10-03T10:05:00Z",
        evidenceMarker: "concern",
        isUnplanned: false,
        observation: "Hesitated",
        questionText: "Why this method?",
        vivaQuestionId: "q1",
      },
      {
        askedAt: "2026-10-03T10:10:00Z",
        evidenceMarker: null,
        isUnplanned: true,
        observation: null,
        questionText: "Say more?",
        vivaQuestionId: null,
      },
    ]);
  });

  it("keeps the question set in set order", () => {
    expect(build().questionSet.questions.map((q) => q.id)).toEqual(["q1", "q2"]);
  });

  it("references the recording chunks in sequence order", () => {
    expect(build().recording).toEqual({
      chunks: [
        { mimeType: "audio/webm", sequence: 0, storagePath: "s/0.webm" },
        { mimeType: "audio/webm", sequence: 1, storagePath: "s/1.webm" },
      ],
    });
  });

  it("records no recording when none was captured", () => {
    expect(build({ recordingChunks: [] }).recording).toBeNull();
  });
});

function createFakeRepository(
  existing: VivaRecord | null = null,
): VivaRecordRepository & { inserted: unknown[] } {
  const inserted: unknown[] = [];

  return {
    inserted,
    async findBySessionId() {
      return existing;
    },
    async insert(input) {
      inserted.push(input);

      return {
        ...input,
        id: "r1",
        signedAt: "2026-10-03T11:00:00Z",
        signedBy: "teacher-1",
      };
    },
  };
}

const signInput = (overrides: Partial<SignVivaRecordInput> = {}): SignVivaRecordInput => ({
  draft: validDraft,
  session: { id: "s1", status: "ended", submissionId: "sub1" },
  snapshot,
  ...overrides,
});

describe("signVivaRecord", () => {
  it("signs an ended session with the validated conclusion and snapshot", async () => {
    const repository = createFakeRepository();

    const result = await signVivaRecord(signInput(), repository);

    expect(result.outcome).toBe("signed");
    expect(repository.inserted).toEqual([
      {
        conclusion: "understanding_demonstrated",
        explanation: "Explained the method unprompted.",
        followUpAction: null,
        snapshot,
        submissionId: "sub1",
        vivaSessionId: "s1",
      },
    ]);
  });

  it("refuses to sign a session that is still active", async () => {
    const repository = createFakeRepository();

    const result = await signVivaRecord(
      signInput({ session: { id: "s1", status: "active", submissionId: "sub1" } }),
      repository,
    );

    expect(result).toEqual({ outcome: "session_not_ended" });
    expect(repository.inserted).toEqual([]);
  });

  it("refuses an invalid draft without writing", async () => {
    const repository = createFakeRepository();

    const result = await signVivaRecord(
      signInput({ draft: { ...validDraft, conclusion: null } }),
      repository,
    );

    expect(result).toEqual({
      errors: { conclusion: "Choose a Viva Conclusion." },
      outcome: "invalid",
    });
    expect(repository.inserted).toEqual([]);
  });

  it("returns the existing record instead of signing twice", async () => {
    const existing = {
      conclusion: "unable_to_conclude",
      explanation: "x",
      followUpAction: null,
      id: "r0",
      signedAt: "2026-10-03T10:45:00Z",
      signedBy: "teacher-1",
      snapshot,
      submissionId: "sub1",
      vivaSessionId: "s1",
    } satisfies VivaRecord;
    const repository = createFakeRepository(existing);

    const result = await signVivaRecord(signInput(), repository);

    expect(result).toEqual({ outcome: "already_signed", record: existing });
    expect(repository.inserted).toEqual([]);
  });
});
