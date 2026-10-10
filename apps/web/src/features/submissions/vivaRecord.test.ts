import { describe, expect, it } from "vitest";
import {
  buildSnapshot,
  formatVivaConclusionLabel,
  isVivaConclusion,
  saveVivaRecordDraft,
  signVivaRecord,
  validateForSigning,
  VIVA_CONCLUSIONS,
  type SessionSource,
  type VivaRecord,
  type VivaRecordDraftInput,
  type VivaRecordRepository,
} from "./vivaRecord";

const source: SessionSource = {
  askedQuestions: [
    { askedAt: "2026-09-01T10:05:00Z", id: "q2", isUnplanned: true, questionText: "Why?" },
    { askedAt: "2026-09-01T10:01:00Z", id: "q1", isUnplanned: false, questionText: "What?" },
  ],
  endedAt: "2026-09-01T10:30:00Z",
  evidenceMarkers: [
    { askedQuestionId: "q1", markerType: "concern", updatedAt: "2026-09-01T10:03:00Z" },
  ],
  observations: [
    { askedQuestionId: "q1", content: "Hesitant", updatedAt: "2026-09-01T10:02:00Z" },
  ],
  questionSetId: "set-1",
  recordingChunkPaths: ["s1/000002.webm", "s1/000001.webm"],
  sessionId: "s1",
  startedAt: "2026-09-01T10:00:00Z",
  teacher: { id: "t1", name: "teacher@example.com" },
};

const validInput: VivaRecordDraftInput = {
  conclusion: "further_review_required",
  conclusionRationale: "Could not explain method.",
  followUpAction: "Re-meet next week.",
};

function createRepository(initial: VivaRecord | null = null) {
  let stored = initial;
  const calls = { sign: 0, saveDraft: 0 };
  const repository: VivaRecordRepository = {
    async find() {
      return stored;
    },
    async loadSource() {
      return source;
    },
    async saveDraft(vivaSessionId, input) {
      calls.saveDraft += 1;
      stored = { ...input, id: "r1", status: "draft", vivaSessionId };
      return stored;
    },
    async sign(recordId, input, snapshot) {
      calls.sign += 1;
      stored = {
        ...input,
        id: recordId,
        signedAt: "2026-09-01T11:00:00Z",
        snapshot,
        status: "signed",
        vivaSessionId: "s1",
      };
      return stored;
    },
  };

  return { calls, get stored() { return stored; }, repository };
}

describe("Viva Conclusion", () => {
  it("offers exactly the four conclusions with readable labels", () => {
    expect(VIVA_CONCLUSIONS.map(formatVivaConclusionLabel)).toEqual([
      "Understanding demonstrated",
      "Further review required",
      "Authenticity concern",
      "Unable to conclude",
    ]);
  });

  it("recognises only known conclusions", () => {
    expect(isVivaConclusion("authenticity_concern")).toBe(true);
    expect(isVivaConclusion("pass")).toBe(false);
  });
});

describe("validateForSigning", () => {
  it("requires a conclusion and an explanation", () => {
    expect(
      validateForSigning({ conclusion: null, conclusionRationale: "  ", followUpAction: "" }),
    ).toEqual(["Choose a Viva Conclusion.", "Explain your Viva Conclusion."]);
  });

  it("allows an empty follow-up action", () => {
    expect(validateForSigning({ ...validInput, followUpAction: "" })).toEqual([]);
  });
});

describe("buildSnapshot", () => {
  it("captures attribution, time, questions, evidence and recording", () => {
    const snapshot = buildSnapshot(source);

    expect(snapshot.teacher).toEqual({ id: "t1", name: "teacher@example.com" });
    expect(snapshot.session).toEqual({
      endedAt: "2026-09-01T10:30:00Z",
      id: "s1",
      startedAt: "2026-09-01T10:00:00Z",
    });
    expect(snapshot.questionSetId).toBe("set-1");
    expect(snapshot.askedQuestions.map((q) => q.id)).toEqual(["q1", "q2"]);
    expect(snapshot.askedQuestions[0].observation?.content).toBe("Hesitant");
    expect(snapshot.askedQuestions[0].evidenceMarker?.markerType).toBe("concern");
    expect(snapshot.askedQuestions[1].observation).toBeNull();
    expect(snapshot.askedQuestions[1].evidenceMarker).toBeNull();
    expect(snapshot.askedQuestions[1].isUnplanned).toBe(true);
    expect(snapshot.recording).toEqual({ chunkCount: 2, storagePrefix: "s1/" });
  });

  it("records no recording when no audio was saved", () => {
    expect(buildSnapshot({ ...source, recordingChunkPaths: [] }).recording).toBeNull();
  });

  it("refuses a session that has not ended", () => {
    expect(() => buildSnapshot({ ...source, endedAt: null })).toThrow(/ended/);
  });
});

describe("signVivaRecord", () => {
  it("does not sign or even draft anything on its own before being asked", async () => {
    const fake = createRepository();

    expect(fake.stored).toBeNull();
    expect(fake.calls).toEqual({ saveDraft: 0, sign: 0 });
  });

  it("rejects an incomplete draft without touching storage", async () => {
    const fake = createRepository();
    const result = await signVivaRecord(
      "s1",
      { ...validInput, conclusion: null },
      fake.repository,
    );

    expect(result).toEqual({ outcome: "rejected", reasons: ["Choose a Viva Conclusion."] });
    expect(fake.calls).toEqual({ saveDraft: 0, sign: 0 });
  });

  it("signs with a snapshot taken from stored evidence", async () => {
    const fake = createRepository();
    const result = await signVivaRecord("s1", validInput, fake.repository);

    expect(result.outcome).toBe("signed");
    expect(fake.stored?.status).toBe("signed");
    expect(fake.stored?.status === "signed" && fake.stored.snapshot.askedQuestions).toHaveLength(2);
  });

  it("signs an existing draft without creating a second record", async () => {
    const fake = createRepository({
      ...validInput,
      id: "r1",
      status: "draft",
      vivaSessionId: "s1",
    });
    await signVivaRecord("s1", validInput, fake.repository);

    expect(fake.calls).toEqual({ saveDraft: 0, sign: 1 });
  });

  it("will not sign twice or overwrite a signed record", async () => {
    const fake = createRepository();
    await signVivaRecord("s1", validInput, fake.repository);
    const again = await signVivaRecord(
      "s1",
      { ...validInput, conclusion: "understanding_demonstrated" },
      fake.repository,
    );

    expect(again.outcome).toBe("already_signed");
    expect(fake.calls.sign).toBe(1);
    expect(fake.stored?.conclusion).toBe("further_review_required");
  });
});

describe("saveVivaRecordDraft", () => {
  it("saves a draft before signing", async () => {
    const fake = createRepository();
    const result = await saveVivaRecordDraft("s1", validInput, fake.repository);

    expect(result.outcome).toBe("saved");
    expect(fake.stored?.status).toBe("draft");
  });

  it("refuses to edit a signed record", async () => {
    const fake = createRepository();
    await signVivaRecord("s1", validInput, fake.repository);
    const draftCallsBefore = fake.calls.saveDraft;
    const result = await saveVivaRecordDraft(
      "s1",
      { ...validInput, conclusionRationale: "changed" },
      fake.repository,
    );

    expect(result.outcome).toBe("already_signed");
    expect(fake.calls.saveDraft).toBe(draftCallsBefore);
    expect(fake.stored?.conclusionRationale).toBe("Could not explain method.");
  });
});
