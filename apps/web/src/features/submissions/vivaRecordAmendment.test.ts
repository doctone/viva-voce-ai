import { describe, expect, it } from "vitest";
import {
  AmendmentConflictError,
  amendVivaRecord,
  currentContent,
  currentVersion,
  originalContent,
  type AmendmentInput,
  type SignedVivaRecord,
  type VivaRecordAmendment,
  type VivaRecordAmendmentRepository,
} from "./vivaRecordAmendment";

const record: SignedVivaRecord = {
  conclusion: "further_review_required",
  conclusionRationale: "Could not explain method.",
  followUpAction: "Re-meet next week.",
  id: "r1",
  signedAt: "2026-09-01T11:00:00Z",
  snapshot: {
    askedQuestions: [],
    questionSetId: "set-1",
    recording: null,
    session: { endedAt: "2026-09-01T10:30:00Z", id: "s1", startedAt: "2026-09-01T10:00:00Z" },
    teacher: { id: "t1", name: "teacher@example.com" },
  },
  status: "signed",
  vivaSessionId: "s1",
};

const input: AmendmentInput = {
  conclusion: "understanding_demonstrated",
  conclusionRationale: "Explained fully on re-meeting.",
  followUpAction: "",
  reason: "Student re-explained method.",
};

function createRepository(initial: VivaRecordAmendment[] = []) {
  const stored = [...initial];
  let failNextAppend = false;
  const repository: VivaRecordAmendmentRepository = {
    async list() {
      return [...stored];
    },
    async append(_recordId, amendment) {
      if (failNextAppend) {
        failNextAppend = false;
        throw new AmendmentConflictError();
      }
      const saved: VivaRecordAmendment = {
        authorId: "t1",
        authorName: "teacher@example.com",
        changes: amendment.changes,
        createdAt: "2026-09-02T09:00:00Z",
        id: `a${amendment.version}`,
        reason: amendment.reason,
        version: amendment.version,
      };
      stored.push(saved);
      return saved;
    },
  };
  return { failNextAppend: () => { failNextAppend = true; }, repository, stored };
}

describe("amendVivaRecord", () => {
  it("appends an attributable version with reason, timestamp and changed fields", async () => {
    const fake = createRepository();
    const result = await amendVivaRecord(
      { actorId: "t1", expectedVersion: 0, input, record },
      fake.repository,
    );

    expect(result.outcome).toBe("amended");
    expect(fake.stored).toHaveLength(1);
    expect(fake.stored[0]).toMatchObject({
      authorId: "t1",
      createdAt: "2026-09-02T09:00:00Z",
      reason: "Student re-explained method.",
      version: 1,
    });
    expect(fake.stored[0].changes.map((c) => c.field)).toEqual([
      "conclusion",
      "conclusionRationale",
      "followUpAction",
    ]);
    expect(fake.stored[0].changes[0]).toEqual({
      field: "conclusion",
      from: "further_review_required",
      to: "understanding_demonstrated",
    });
  });

  it("keeps the original signed version retrievable", async () => {
    const fake = createRepository();
    await amendVivaRecord({ actorId: "t1", expectedVersion: 0, input, record }, fake.repository);

    expect(originalContent(record).conclusion).toBe("further_review_required");
    expect(currentContent(record, fake.stored).conclusion).toBe("understanding_demonstrated");
    expect(record.conclusionRationale).toBe("Could not explain method.");
  });

  it("refuses anyone other than the signing teacher", async () => {
    const fake = createRepository();
    const result = await amendVivaRecord(
      { actorId: "someone-else", expectedVersion: 0, input, record },
      fake.repository,
    );

    expect(result).toEqual({ outcome: "forbidden" });
    expect(fake.stored).toHaveLength(0);
  });

  it("rejects a stale base version without writing", async () => {
    const fake = createRepository();
    await amendVivaRecord({ actorId: "t1", expectedVersion: 0, input, record }, fake.repository);
    const result = await amendVivaRecord(
      { actorId: "t1", expectedVersion: 0, input: { ...input, reason: "Second" }, record },
      fake.repository,
    );

    expect(result.outcome).toBe("conflict");
    expect(fake.stored).toHaveLength(1);
  });

  it("reports a conflict when another amendment wins the race at write time", async () => {
    const fake = createRepository();
    fake.failNextAppend();
    const result = await amendVivaRecord(
      { actorId: "t1", expectedVersion: 0, input, record },
      fake.repository,
    );

    expect(result.outcome).toBe("conflict");
  });

  it("rejects missing reason, empty rationale, and no-op amendments", async () => {
    const fake = createRepository();
    const run = (patch: Partial<AmendmentInput>) =>
      amendVivaRecord(
        { actorId: "t1", expectedVersion: 0, input: { ...input, ...patch }, record },
        fake.repository,
      );

    expect(await run({ reason: " " })).toEqual({
      outcome: "rejected",
      reasons: ["Say why you are amending this record."],
    });
    expect(await run({ conclusionRationale: "" })).toMatchObject({ outcome: "rejected" });
    expect(
      await run({
        conclusion: record.conclusion,
        conclusionRationale: record.conclusionRationale,
        followUpAction: record.followUpAction,
      }),
    ).toEqual({
      outcome: "rejected",
      reasons: ["Change at least one field before amending."],
    });
    expect(fake.stored).toHaveLength(0);
  });
});

describe("audit history", () => {
  it("applies successive amendments in version order and records only changed fields", async () => {
    const fake = createRepository();
    await amendVivaRecord({ actorId: "t1", expectedVersion: 0, input, record }, fake.repository);
    await amendVivaRecord(
      {
        actorId: "t1",
        expectedVersion: 1,
        input: { ...input, followUpAction: "Email parent.", reason: "Added follow-up" },
        record,
      },
      fake.repository,
    );

    expect(currentVersion(fake.stored)).toBe(2);
    expect(fake.stored[1].changes).toEqual([
      { field: "followUpAction", from: "", to: "Email parent." },
    ]);
    expect(currentContent(record, [...fake.stored].reverse()).followUpAction).toBe("Email parent.");
  });
});
