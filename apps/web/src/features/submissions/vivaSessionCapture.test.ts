import { describe, expect, it } from "vitest";
import {
  applyEvidenceMarker,
  filterUnaskedPlannedQuestions,
  formatEvidenceMarkerLabel,
  isEvidenceMarkerType,
  recordAskedQuestion,
  saveObservation,
  validateObservationContent,
  type AskedQuestionRecord,
  type AskedQuestionRepository,
  type EvidenceMarkerRecord,
  type EvidenceMarkerRepository,
  type ObservationRecord,
  type ObservationRepository,
} from "./vivaSessionCapture";

describe("formatEvidenceMarkerLabel", () => {
  it("formats every marker type", () => {
    expect(formatEvidenceMarkerLabel("clear_understanding")).toBe(
      "Clear understanding",
    );
    expect(formatEvidenceMarkerLabel("needs_further_probing")).toBe(
      "Needs further probing",
    );
    expect(formatEvidenceMarkerLabel("concern")).toBe("Concern");
  });
});

describe("isEvidenceMarkerType", () => {
  it("accepts the three known marker types", () => {
    expect(isEvidenceMarkerType("clear_understanding")).toBe(true);
    expect(isEvidenceMarkerType("needs_further_probing")).toBe(true);
    expect(isEvidenceMarkerType("concern")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isEvidenceMarkerType("score")).toBe(false);
    expect(isEvidenceMarkerType("")).toBe(false);
  });
});

function createFakeAskedQuestionRepository(): AskedQuestionRepository & {
  insertCallCount: number;
  records: AskedQuestionRecord[];
} {
  const records: AskedQuestionRecord[] = [];
  let insertCallCount = 0;

  return {
    records,
    get insertCallCount() {
      return insertCallCount;
    },
    async findByVivaQuestionId(vivaSessionId, vivaQuestionId) {
      return (
        records.find(
          (record) =>
            record.vivaSessionId === vivaSessionId &&
            record.vivaQuestionId === vivaQuestionId,
        ) ?? null
      );
    },
    async insert(input) {
      insertCallCount += 1;

      const record: AskedQuestionRecord = {
        askedAt: "2026-07-12T09:05:00.000Z",
        id: `asked-question-${records.length + 1}`,
        isUnplanned: input.vivaQuestionId === null,
        questionText: input.questionText,
        vivaQuestionId: input.vivaQuestionId,
        vivaSessionId: input.vivaSessionId,
      };

      records.push(record);

      return record;
    },
  };
}

describe("recordAskedQuestion", () => {
  const baseInput = {
    questionText: "Why does the response describe Lord Mansfield as pivotal?",
    vivaQuestionId: "question-1",
    vivaSessionId: "session-1",
  };

  it("records a planned question that has not been asked yet", async () => {
    const repository = createFakeAskedQuestionRepository();

    const result = await recordAskedQuestion(baseInput, repository);

    expect(result.outcome).toBe("recorded");
    expect(result.askedQuestion.vivaQuestionId).toBe("question-1");
    expect(repository.insertCallCount).toBe(1);
  });

  it("does not create a duplicate Asked Question for the same planned question", async () => {
    const repository = createFakeAskedQuestionRepository();

    const first = await recordAskedQuestion(baseInput, repository);
    const second = await recordAskedQuestion(baseInput, repository);

    expect(first.outcome).toBe("recorded");
    expect(second.outcome).toBe("already_asked");
    expect(second.askedQuestion.id).toBe(first.askedQuestion.id);
    expect(repository.insertCallCount).toBe(1);
  });

  it("always records a new entry for unplanned follow-up questions", async () => {
    const repository = createFakeAskedQuestionRepository();
    const followUpInput = {
      questionText: "Can you say more about that?",
      vivaQuestionId: null,
      vivaSessionId: "session-1",
    };

    const first = await recordAskedQuestion(followUpInput, repository);
    const second = await recordAskedQuestion(followUpInput, repository);

    expect(first.outcome).toBe("recorded");
    expect(second.outcome).toBe("recorded");
    expect(second.askedQuestion.id).not.toBe(first.askedQuestion.id);
    expect(repository.insertCallCount).toBe(2);
  });
});

describe("filterUnaskedPlannedQuestions", () => {
  it("keeps planned questions that have not been asked", () => {
    const plannedQuestions = [
      { id: "question-1", questionText: "First" },
      { id: "question-2", questionText: "Second" },
    ];

    const result = filterUnaskedPlannedQuestions(plannedQuestions, [
      { vivaQuestionId: "question-1" },
      { vivaQuestionId: null },
    ]);

    expect(result).toEqual([{ id: "question-2", questionText: "Second" }]);
  });

  it("keeps every planned question when none have been asked", () => {
    const plannedQuestions = [{ id: "question-1", questionText: "First" }];

    expect(filterUnaskedPlannedQuestions(plannedQuestions, [])).toEqual(
      plannedQuestions,
    );
  });
});

function createFakeObservationRepository(
  options: { failNTimes?: number } = {},
): ObservationRepository & { records: Map<string, ObservationRecord> } {
  const records = new Map<string, ObservationRecord>();
  let failuresRemaining = options.failNTimes ?? 0;

  return {
    records,
    async save(askedQuestionId, content) {
      if (failuresRemaining > 0) {
        failuresRemaining -= 1;
        throw new Error("We could not save your Observation.");
      }

      const existing = records.get(askedQuestionId);
      const record: ObservationRecord = {
        askedQuestionId,
        content,
        createdAt: existing?.createdAt ?? "2026-07-12T09:10:00.000Z",
        teacherId: "teacher-1",
        updatedAt: "2026-07-12T09:12:00.000Z",
      };

      records.set(askedQuestionId, record);

      return record;
    },
  };
}

describe("validateObservationContent", () => {
  it("rejects blank content", () => {
    expect(validateObservationContent("")).toBe(
      "Enter an observation before saving.",
    );
    expect(validateObservationContent("   ")).toBe(
      "Enter an observation before saving.",
    );
  });

  it("accepts non-blank content", () => {
    expect(validateObservationContent("Explained the reasoning clearly.")).toBe(
      null,
    );
  });
});

describe("saveObservation", () => {
  it("rejects blank content without calling the repository", async () => {
    const repository = createFakeObservationRepository();

    const result = await saveObservation("asked-question-1", "  ", repository);

    expect(result).toEqual({
      outcome: "rejected",
      reason: "Enter an observation before saving.",
    });
    expect(repository.records.size).toBe(0);
  });

  it("records the first save", async () => {
    const repository = createFakeObservationRepository();

    const result = await saveObservation(
      "asked-question-1",
      "Confident and well reasoned.",
      repository,
    );

    expect(result.outcome).toBe("saved");
    if (result.outcome === "saved") {
      expect(result.observation.content).toBe("Confident and well reasoned.");
    }
  });

  it("amends the existing Observation on subsequent saves", async () => {
    const repository = createFakeObservationRepository();

    await saveObservation("asked-question-1", "First note.", repository);
    const second = await saveObservation(
      "asked-question-1",
      "Amended note.",
      repository,
    );

    expect(second.outcome).toBe("saved");
    if (second.outcome === "saved") {
      expect(second.observation.content).toBe("Amended note.");
      expect(second.observation.createdAt).toBe("2026-07-12T09:10:00.000Z");
    }
    expect(repository.records.size).toBe(1);
  });

  it("surfaces a temporary network failure so the caller can retry", async () => {
    const repository = createFakeObservationRepository({ failNTimes: 1 });

    await expect(
      saveObservation("asked-question-1", "Some content.", repository),
    ).rejects.toThrow("We could not save your Observation.");

    const retried = await saveObservation(
      "asked-question-1",
      "Some content.",
      repository,
    );

    expect(retried.outcome).toBe("saved");
  });
});

function createFakeEvidenceMarkerRepository(): EvidenceMarkerRepository & {
  records: Map<string, EvidenceMarkerRecord>;
} {
  const records = new Map<string, EvidenceMarkerRecord>();

  return {
    records,
    async save(askedQuestionId, markerType) {
      const record: EvidenceMarkerRecord = {
        askedQuestionId,
        createdAt: "2026-07-12T09:15:00.000Z",
        markerType,
        teacherId: "teacher-1",
        updatedAt: "2026-07-12T09:15:00.000Z",
      };

      records.set(askedQuestionId, record);

      return record;
    },
  };
}

describe("applyEvidenceMarker", () => {
  it("saves the marker for the Asked Question", async () => {
    const repository = createFakeEvidenceMarkerRepository();

    const result = await applyEvidenceMarker(
      "asked-question-1",
      "needs_further_probing",
      repository,
    );

    expect(result.markerType).toBe("needs_further_probing");
    expect(repository.records.get("asked-question-1")?.markerType).toBe(
      "needs_further_probing",
    );
  });

  it("replaces a previously applied marker", async () => {
    const repository = createFakeEvidenceMarkerRepository();

    await applyEvidenceMarker(
      "asked-question-1",
      "needs_further_probing",
      repository,
    );
    await applyEvidenceMarker("asked-question-1", "concern", repository);

    expect(repository.records.get("asked-question-1")?.markerType).toBe(
      "concern",
    );
    expect(repository.records.size).toBe(1);
  });
});
