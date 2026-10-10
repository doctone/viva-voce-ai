export type QuestionSetStatus = "draft" | "ready";

const ESTIMATED_MINUTES_PER_QUESTION = 2;

export function formatQuestionCategory(category: string): string {
  return category
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function estimateQuestionSetDurationMinutes(
  selectedQuestionCount: number,
): number {
  if (selectedQuestionCount <= 0) {
    return 0;
  }

  return selectedQuestionCount * ESTIMATED_MINUTES_PER_QUESTION;
}

export function sortQuestionsBySetPosition<
  T extends { setPosition: number | null },
>(questions: readonly T[]): T[] {
  return questions
    .filter((question) => question.setPosition !== null)
    .sort(
      (left, right) =>
        (left.setPosition as number) - (right.setPosition as number),
    );
}
