import { describe, expect, it } from "vitest";
import {
  computeNextSetPosition,
  computeSequentialPositions,
  estimateQuestionSetDurationMinutes,
  formatQuestionCategory,
  moveQuestionInSet,
  sortQuestionsBySetPosition,
  summarizeCategoryBalance,
} from "./vivaQuestionSet";

describe("formatQuestionCategory", () => {
  it("converts a snake_case category into Title Case words", () => {
    expect(formatQuestionCategory("comprehension_and_accuracy")).toBe(
      "Comprehension And Accuracy",
    );
  });

  it("handles a single-word category", () => {
    expect(formatQuestionCategory("ownership")).toBe("Ownership");
  });
});

describe("estimateQuestionSetDurationMinutes", () => {
  it("returns zero for an empty set", () => {
    expect(estimateQuestionSetDurationMinutes(0)).toBe(0);
  });

  it("returns zero for a negative count", () => {
    expect(estimateQuestionSetDurationMinutes(-3)).toBe(0);
  });

  it("estimates two minutes per selected question", () => {
    expect(estimateQuestionSetDurationMinutes(1)).toBe(2);
    expect(estimateQuestionSetDurationMinutes(5)).toBe(10);
  });
});

describe("summarizeCategoryBalance", () => {
  it("returns zero counts for every known category when no questions are given", () => {
    expect(summarizeCategoryBalance([])).toEqual({
      comprehension_and_accuracy: 0,
      argumentation_and_reasoning: 0,
      authenticity_and_ownership: 0,
    });
  });

  it("tallies questions per category", () => {
    const balance = summarizeCategoryBalance([
      { category: "comprehension_and_accuracy" },
      { category: "comprehension_and_accuracy" },
      { category: "argumentation_and_reasoning" },
    ]);

    expect(balance).toEqual({
      comprehension_and_accuracy: 2,
      argumentation_and_reasoning: 1,
      authenticity_and_ownership: 0,
    });
  });

  it("ignores unknown categories instead of throwing", () => {
    const balance = summarizeCategoryBalance([
      { category: "comprehension_and_accuracy" },
      { category: "some_future_category" },
    ]);

    expect(balance.comprehension_and_accuracy).toBe(1);
    expect(Object.keys(balance)).toEqual([
      "comprehension_and_accuracy",
      "argumentation_and_reasoning",
      "authenticity_and_ownership",
    ]);
  });
});

describe("computeNextSetPosition", () => {
  it("returns 0 when nothing is currently selected", () => {
    expect(computeNextSetPosition([])).toBe(0);
    expect(computeNextSetPosition([null, undefined, null])).toBe(0);
  });

  it("returns one past the highest used position", () => {
    expect(computeNextSetPosition([0, 2, 1])).toBe(3);
  });

  it("ignores null and undefined gaps when finding the max", () => {
    expect(computeNextSetPosition([null, 4, undefined, 1])).toBe(5);
  });
});

describe("sortQuestionsBySetPosition", () => {
  it("filters out questions that are not in the set", () => {
    const result = sortQuestionsBySetPosition([
      { id: "a", setPosition: null },
      { id: "b", setPosition: 0 },
    ]);

    expect(result.map((question) => question.id)).toEqual(["b"]);
  });

  it("sorts ascending by set position", () => {
    const result = sortQuestionsBySetPosition([
      { id: "a", setPosition: 2 },
      { id: "b", setPosition: 0 },
      { id: "c", setPosition: 1 },
    ]);

    expect(result.map((question) => question.id)).toEqual(["b", "c", "a"]);
  });
});

describe("moveQuestionInSet", () => {
  const ordered = [{ id: "a" }, { id: "b" }, { id: "c" }];

  it("swaps a question with its predecessor when moving up", () => {
    const result = moveQuestionInSet(ordered, "b", "up");
    expect(result.map((question) => question.id)).toEqual(["b", "a", "c"]);
  });

  it("swaps a question with its successor when moving down", () => {
    const result = moveQuestionInSet(ordered, "b", "down");
    expect(result.map((question) => question.id)).toEqual(["a", "c", "b"]);
  });

  it("leaves the order unchanged when moving the first item up", () => {
    const result = moveQuestionInSet(ordered, "a", "up");
    expect(result.map((question) => question.id)).toEqual(["a", "b", "c"]);
  });

  it("leaves the order unchanged when moving the last item down", () => {
    const result = moveQuestionInSet(ordered, "c", "down");
    expect(result.map((question) => question.id)).toEqual(["a", "b", "c"]);
  });

  it("leaves the order unchanged when the question id is not found", () => {
    const result = moveQuestionInSet(ordered, "missing", "up");
    expect(result.map((question) => question.id)).toEqual(["a", "b", "c"]);
  });

  it("does not mutate the input array", () => {
    const original = [{ id: "a" }, { id: "b" }];
    moveQuestionInSet(original, "b", "up");
    expect(original.map((question) => question.id)).toEqual(["a", "b"]);
  });
});

describe("computeSequentialPositions", () => {
  it("assigns zero-based sequential positions in order", () => {
    expect(computeSequentialPositions(["x", "y", "z"])).toEqual([
      { id: "x", position: 0 },
      { id: "y", position: 1 },
      { id: "z", position: 2 },
    ]);
  });

  it("returns an empty array for no ids", () => {
    expect(computeSequentialPositions([])).toEqual([]);
  });
});
