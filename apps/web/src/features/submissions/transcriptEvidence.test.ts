import { describe, expect, it } from "vitest";
import {
  addEvidence,
  isGroundedIn,
  isReliable,
  reviewEvidence,
  saveSuggestions,
  suggestEvidence,
  type EvidenceSegment,
  type TranscriptEvidence,
  type TranscriptEvidenceRepository,
} from "./transcriptEvidence";

const TEACHER = { userId: "teacher-1" };
const OTHER = { userId: "teacher-2" };

function segment(
  id: string,
  startSeconds: number,
  text: string,
  confidence: number | null = 0.9,
): EvidenceSegment {
  return { confidence, endSeconds: startSeconds + 5, id, startSeconds, text };
}

function fakeRepository(
  segments: EvidenceSegment[],
  evidence: TranscriptEvidence[] = [],
) {
  const rows = [...evidence];
  const repository: TranscriptEvidenceRepository = {
    findAskedQuestion: async (id) =>
      id === "q1" || id === "q2" ? { authorId: "teacher-1", id } : null,
    findEvidence: async (id) => rows.find((row) => row.id === id) ?? null,
    findSegment: async (id) => segments.find((s) => s.id === id) ?? null,
    insertEvidence: async (row) => {
      const created = { ...row, id: `e${rows.length + 1}` };
      rows.push(created);
      return created;
    },
    listSuggestedSegmentIds: async (askedEntryId) =>
      rows
        .filter((r) => r.askedEntryId === askedEntryId && r.origin === "suggested")
        .map((r) => r.segmentId),
    updateEvidence: async (id, changes) => {
      const row = rows.find((r) => r.id === id) as TranscriptEvidence;
      Object.assign(row, changes);
      return row;
    },
  };

  return { repository, rows };
}

const SEGMENTS = [
  segment("s1", 2, "Photosynthesis turns light into sugar."),
  segment("s2", 70, "I chose the second source because it was newer."),
  segment("s3", 75, "mumble mumble", 0.2),
];
const WINDOWS = [
  { endMs: 60_000, id: "q1", startMs: 0 },
  { endMs: null, id: "q2", startMs: 60_000 },
];

describe("suggestEvidence", () => {
  it("cites the segment and Asked Question each excerpt supports", () => {
    expect(suggestEvidence(WINDOWS, SEGMENTS)).toEqual([
      { askedEntryId: "q1", excerpt: "Photosynthesis turns light into sugar.", segmentId: "s1" },
      { askedEntryId: "q2", excerpt: "I chose the second source because it was newer.", segmentId: "s2" },
    ]);
  });

  it("never suggests uncertain transcript content", () => {
    const ids = suggestEvidence(WINDOWS, SEGMENTS).map((s) => s.segmentId);

    expect(ids).not.toContain("s3");
  });

  it("suggests nothing for speech outside every window or with no text", () => {
    expect(
      suggestEvidence(
        [{ endMs: 1_000, id: "q1", startMs: 0 }],
        [segment("a", 5, "late"), segment("b", 0.5, "   ")],
      ),
    ).toEqual([]);
  });
});

describe("isGroundedIn", () => {
  it("accepts words from the segment, ignoring case and spacing", () => {
    expect(isGroundedIn("light  into SUGAR", "Photosynthesis turns light into sugar.")).toBe(true);
  });

  it("rejects invented or empty text", () => {
    expect(isGroundedIn("turns sugar into light", "Photosynthesis turns light into sugar.")).toBe(false);
    expect(isGroundedIn("  ", "anything")).toBe(false);
  });
});

describe("isReliable", () => {
  it("flags uncertain segments and rejected evidence as not reliable", () => {
    expect(isReliable({ status: "accepted" }, SEGMENTS[0])).toBe(true);
    expect(isReliable({ status: "accepted" }, SEGMENTS[2])).toBe(false);
    expect(isReliable({ status: "rejected" }, SEGMENTS[0])).toBe(false);
  });
});

describe("saveSuggestions", () => {
  it("stores grounded suggestions as pending, distinct from teacher evidence", async () => {
    const { repository } = fakeRepository(SEGMENTS);
    const result = await saveSuggestions(suggestEvidence(WINDOWS, SEGMENTS), TEACHER, repository);

    expect(result).toMatchObject({ outcome: "ok" });
    expect(result.outcome === "ok" && result.created).toMatchObject([
      { origin: "suggested", segmentId: "s1", status: "pending", suggestedExcerpt: "Photosynthesis turns light into sugar." },
      { origin: "suggested", segmentId: "s2", status: "pending" },
    ]);
  });

  it("drops unsupported suggestions: invented text and uncertain segments", async () => {
    const { repository, rows } = fakeRepository(SEGMENTS);
    const result = await saveSuggestions(
      [
        { askedEntryId: "q1", excerpt: "The student fully understood", segmentId: "s1" },
        { askedEntryId: "q1", excerpt: "mumble", segmentId: "s3" },
      ],
      TEACHER,
      repository,
    );

    expect(result).toEqual({ created: [], outcome: "ok" });
    expect(rows).toEqual([]);
  });

  it("does not re-suggest a segment, even one the teacher rejected", async () => {
    const { repository, rows } = fakeRepository(SEGMENTS);
    const suggestions = suggestEvidence(WINDOWS, SEGMENTS);

    await saveSuggestions(suggestions, TEACHER, repository);
    rows[0].status = "rejected";
    const again = await saveSuggestions(suggestions, TEACHER, repository);

    expect(again).toEqual({ created: [], outcome: "ok" });
    expect(rows).toHaveLength(2);
  });

  it("refuses anonymous callers, other teachers' questions and unknown ids", async () => {
    const { repository, rows } = fakeRepository(SEGMENTS);
    const suggestions = suggestEvidence(WINDOWS, SEGMENTS);

    expect(await saveSuggestions(suggestions, { userId: null }, repository)).toEqual({ outcome: "unauthorized" });
    expect(await saveSuggestions(suggestions, OTHER, repository)).toEqual({ outcome: "unauthorized" });
    expect(
      await saveSuggestions([{ askedEntryId: "nope", excerpt: "x", segmentId: "s1" }], TEACHER, repository),
    ).toEqual({ outcome: "not_found" });
    expect(
      await saveSuggestions([{ askedEntryId: "q1", excerpt: "x", segmentId: "nope" }], TEACHER, repository),
    ).toEqual({ outcome: "not_found" });
    expect(rows).toEqual([]);
  });
});

describe("addEvidence", () => {
  const input = { askedEntryId: "q1", excerpt: "turns light into sugar", segmentId: "s1" };

  it("records teacher-authored evidence as accepted, with no suggestion behind it", async () => {
    const { repository } = fakeRepository(SEGMENTS);
    const result = await addEvidence(input, TEACHER, repository);

    expect(result).toMatchObject({
      evidence: { origin: "teacher", status: "accepted", suggestedExcerpt: null },
      outcome: "ok",
    });
  });

  it("requires the excerpt to come from the cited segment", async () => {
    const { repository } = fakeRepository(SEGMENTS);

    expect(await addEvidence({ ...input, excerpt: "made up" }, TEACHER, repository)).toEqual({ outcome: "excerpt_not_in_segment" });
    expect(await addEvidence({ ...input, excerpt: " " }, TEACHER, repository)).toEqual({ outcome: "empty_excerpt" });
  });

  it("refuses other teachers, anonymous callers and unknown questions or segments", async () => {
    const { repository } = fakeRepository(SEGMENTS);

    expect(await addEvidence(input, OTHER, repository)).toEqual({ outcome: "unauthorized" });
    expect(await addEvidence(input, { userId: null }, repository)).toEqual({ outcome: "unauthorized" });
    expect(await addEvidence({ ...input, askedEntryId: "zz" }, TEACHER, repository)).toEqual({ outcome: "not_found" });
    expect(await addEvidence({ ...input, segmentId: "zz" }, TEACHER, repository)).toEqual({ outcome: "not_found" });
  });
});

describe("reviewEvidence", () => {
  const pending: TranscriptEvidence = {
    askedEntryId: "q1",
    excerpt: "Photosynthesis turns light into sugar.",
    id: "e1",
    origin: "suggested",
    segmentId: "s1",
    status: "pending",
    suggestedExcerpt: "Photosynthesis turns light into sugar.",
    teacherId: "teacher-1",
  };

  it("accepts a suggestion", async () => {
    const { repository } = fakeRepository(SEGMENTS, [{ ...pending }]);

    expect(await reviewEvidence("e1", { kind: "accept" }, TEACHER, repository)).toMatchObject({
      evidence: { status: "accepted" },
      outcome: "ok",
    });
  });

  it("rejects a suggestion", async () => {
    const { repository } = fakeRepository(SEGMENTS, [{ ...pending }]);

    expect(await reviewEvidence("e1", { kind: "reject" }, TEACHER, repository)).toMatchObject({
      evidence: { status: "rejected" },
      outcome: "ok",
    });
  });

  it("amends within the segment while keeping the original suggestion", async () => {
    const { repository } = fakeRepository(SEGMENTS, [{ ...pending }]);
    const result = await reviewEvidence("e1", { excerpt: " turns light into sugar ", kind: "amend" }, TEACHER, repository);

    expect(result).toMatchObject({
      evidence: {
        excerpt: "turns light into sugar",
        status: "amended",
        suggestedExcerpt: "Photosynthesis turns light into sugar.",
      },
      outcome: "ok",
    });
  });

  it("refuses an amendment that is not in the segment or is empty", async () => {
    const { repository } = fakeRepository(SEGMENTS, [{ ...pending }]);

    expect(await reviewEvidence("e1", { excerpt: "invented", kind: "amend" }, TEACHER, repository)).toEqual({ outcome: "excerpt_not_in_segment" });
    expect(await reviewEvidence("e1", { excerpt: "", kind: "amend" }, TEACHER, repository)).toEqual({ outcome: "empty_excerpt" });
  });

  it("lets the teacher change their mind; accepting restores the proposal", async () => {
    const { repository } = fakeRepository(SEGMENTS, [{ ...pending }]);

    await reviewEvidence("e1", { excerpt: "light into sugar", kind: "amend" }, TEACHER, repository);
    await reviewEvidence("e1", { kind: "reject" }, TEACHER, repository);
    const result = await reviewEvidence("e1", { kind: "accept" }, TEACHER, repository);

    expect(result).toMatchObject({
      evidence: { excerpt: "Photosynthesis turns light into sugar.", status: "accepted" },
    });
  });

  it("does not review teacher-authored evidence", async () => {
    const { repository } = fakeRepository(SEGMENTS, [
      { ...pending, origin: "teacher", status: "accepted", suggestedExcerpt: null },
    ]);

    expect(await reviewEvidence("e1", { kind: "reject" }, TEACHER, repository)).toEqual({ outcome: "not_a_suggestion" });
  });

  it("refuses anonymous callers and other teachers, and reports unknown evidence", async () => {
    const { repository, rows } = fakeRepository(SEGMENTS, [{ ...pending }]);

    expect(await reviewEvidence("e1", { kind: "accept" }, { userId: null }, repository)).toEqual({ outcome: "unauthorized" });
    expect(await reviewEvidence("e1", { kind: "accept" }, OTHER, repository)).toEqual({ outcome: "unauthorized" });
    expect(await reviewEvidence("zz", { kind: "accept" }, TEACHER, repository)).toEqual({ outcome: "not_found" });
    expect(rows[0].status).toBe("pending");
  });
});
