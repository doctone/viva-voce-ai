import { describe, expect, it } from "vitest";
import {
  recordAskedQuestion,
  saveObservation,
  type AskedQuestionRecord,
  type AskedQuestionRepository,
  type ObservationRecord,
  type ObservationRepository,
} from "./vivaSessionCapture";

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

function createFakeObservationRepository(): ObservationRepository & {
  records: Map<string, ObservationRecord>;
} {
  const records = new Map<string, ObservationRecord>();

  return {
    records,
    async save(askedQuestionId, content) {
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
});
