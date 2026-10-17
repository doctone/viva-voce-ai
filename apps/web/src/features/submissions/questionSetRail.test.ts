import { describe, expect, it } from "vitest";
import {
  deriveQuestionSetRail,
  formatCategoryLabel,
  formatRailHeader,
  formatRailState,
  transcriptSince,
  type RailAskedQuestion,
} from "./questionSetRail";

const planned = [
  { id: "q1", questionText: "First?" },
  { id: "q2", questionText: "Second?" },
  { id: "q3", questionText: "Third?" },
];

function asked(overrides: Partial<RailAskedQuestion>): RailAskedQuestion {
  return {
    evidenceMarkerType: null,
    id: "a1",
    isUnplanned: false,
    questionText: "First?",
    vivaQuestionId: "q1",
    ...overrides,
  };
}

describe("deriveQuestionSetRail", () => {
  it("lists every question in order as not yet asked before anything is asked", () => {
    const rail = deriveQuestionSetRail(planned, []);

    expect(rail.items.map((item) => [item.number, item.state])).toEqual([
      [1, "not_yet_asked"],
      [2, "not_yet_asked"],
      [3, "not_yet_asked"],
    ]);
    expect(rail.askedPlannedCount).toBe(0);
  });

  it("marks the latest asked question as asking now and earlier ones as asked", () => {
    const rail = deriveQuestionSetRail(planned, [
      asked({ id: "a1", vivaQuestionId: "q1" }),
      asked({ id: "a2", vivaQuestionId: "q3" }),
    ]);

    expect(rail.items.map((item) => item.state)).toEqual([
      "asked",
      "not_yet_asked",
      "asking_now",
    ]);
    expect(rail.askedPlannedCount).toBe(2);
  });

  it("carries the evidence marker and asked question id of an asked question", () => {
    const rail = deriveQuestionSetRail(planned, [
      asked({ evidenceMarkerType: "concern", id: "a1" }),
    ]);

    expect(rail.items[0]).toMatchObject({
      askedQuestionId: "a1",
      evidenceMarkerType: "concern",
    });
    expect(rail.items[1]).toMatchObject({
      askedQuestionId: null,
      evidenceMarkerType: null,
    });
  });

  it("represents a question asked twice by its latest asking", () => {
    const rail = deriveQuestionSetRail(planned, [
      asked({ evidenceMarkerType: "concern", id: "a1" }),
      asked({ id: "a2", vivaQuestionId: "q2" }),
      asked({ evidenceMarkerType: "clear_understanding", id: "a3" }),
    ]);

    expect(rail.items[0]).toMatchObject({
      askedQuestionId: "a3",
      evidenceMarkerType: "clear_understanding",
      state: "asking_now",
    });
    expect(rail.items[1].state).toBe("asked");
  });

  it("places an unplanned follow-up under the question it followed", () => {
    const rail = deriveQuestionSetRail(planned, [
      asked({ id: "a1", vivaQuestionId: "q1" }),
      asked({ id: "a2", vivaQuestionId: "q2" }),
      asked({
        evidenceMarkerType: "needs_further_probing",
        id: "a3",
        isUnplanned: true,
        questionText: "Why?",
        vivaQuestionId: null,
      }),
    ]);

    expect(rail.items[0].followUps).toEqual([]);
    expect(rail.items[1].followUps).toEqual([
      {
        askedQuestionId: "a3",
        evidenceMarkerType: "needs_further_probing",
        questionText: "Why?",
        state: "asking_now",
      },
    ]);
    expect(rail.askedPlannedCount).toBe(2);
  });

  it("keeps a follow-up asked before any planned question in the leading group", () => {
    const rail = deriveQuestionSetRail(planned, [
      asked({ id: "a1", isUnplanned: true, questionText: "Hi?", vivaQuestionId: null }),
    ]);

    expect(rail.leadingFollowUps).toHaveLength(1);
    expect(rail.items.every((item) => item.followUps.length === 0)).toBe(true);
  });

  it("ignores an asked question whose planned question is no longer in the set", () => {
    const rail = deriveQuestionSetRail(planned, [
      asked({ id: "a1", vivaQuestionId: "gone" }),
    ]);

    expect(rail.askedPlannedCount).toBe(0);
    expect(rail.leadingFollowUps).toEqual([]);
  });
});

describe("rail formatting", () => {
  it("joins state and marker label", () => {
    expect(formatRailState("asked", "Clear understanding")).toBe(
      "Asked · Clear understanding",
    );
    expect(formatRailState("not_yet_asked", null)).toBe("Not yet asked");
    expect(formatRailState("asking_now", null)).toBe("Asking now");
  });

  it("formats the header and category", () => {
    expect(formatRailHeader(6, 12)).toBe("Question set · 6 of 12");
    expect(formatCategoryLabel("argumentation_and_reasoning")).toBe(
      "Argumentation & reasoning",
    );
  });
});

describe("transcriptSince", () => {
  it("returns only text spoken after the offset", () => {
    expect(transcriptSince("one two three", 4)).toBe("two three");
  });

  it("returns empty when the transcript is shorter than the offset", () => {
    expect(transcriptSince("new", 50)).toBe("");
  });
});
