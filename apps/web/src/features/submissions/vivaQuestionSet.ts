export const VIVA_QUESTION_CATEGORIES = [
  "comprehension_and_accuracy",
  "argumentation_and_reasoning",
  "authenticity_and_ownership",
] as const;

export type VivaQuestionCategory = (typeof VIVA_QUESTION_CATEGORIES)[number];

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

export function summarizeCategoryBalance(
  questions: ReadonlyArray<{ category: string }>,
): Record<VivaQuestionCategory, number> {
  const balance = VIVA_QUESTION_CATEGORIES.reduce(
    (accumulator, category) => {
      accumulator[category] = 0;
      return accumulator;
    },
    {} as Record<VivaQuestionCategory, number>,
  );

  for (const question of questions) {
    if ((VIVA_QUESTION_CATEGORIES as readonly string[]).includes(question.category)) {
      balance[question.category as VivaQuestionCategory] += 1;
    }
  }

  return balance;
}

export function computeNextSetPosition(
  currentPositions: ReadonlyArray<number | null | undefined>,
): number {
  const usedPositions = currentPositions.filter(
    (position): position is number => typeof position === "number",
  );

  return usedPositions.length === 0 ? 0 : Math.max(...usedPositions) + 1;
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

export function moveQuestionInSet<T extends { id: string }>(
  orderedQuestions: readonly T[],
  questionId: string,
  direction: "up" | "down",
): T[] {
  const index = orderedQuestions.findIndex(
    (question) => question.id === questionId,
  );

  if (index === -1) {
    return [...orderedQuestions];
  }

  const targetIndex = direction === "up" ? index - 1 : index + 1;

  if (targetIndex < 0 || targetIndex >= orderedQuestions.length) {
    return [...orderedQuestions];
  }

  const reordered = [...orderedQuestions];
  const [moved] = reordered.splice(index, 1);
  reordered.splice(targetIndex, 0, moved);

  return reordered;
}

export function computeSequentialPositions(
  orderedQuestionIds: readonly string[],
): Array<{ id: string; position: number }> {
  return orderedQuestionIds.map((id, index) => ({ id, position: index }));
}
