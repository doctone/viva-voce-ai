import { describe, expect, it } from "vitest";
import {
  estimateQuestionSetDurationMinutes,
  formatQuestionCategory,
  sortQuestionsBySetPosition,
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
