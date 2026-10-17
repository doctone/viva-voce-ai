import type { EvidenceMarkerType } from "./vivaSessionCapture";

export type RailState = "not_yet_asked" | "asking_now" | "asked";

export type RailPlannedQuestion = {
  id: string;
  questionText: string;
};

export type RailAskedQuestion = {
  evidenceMarkerType: EvidenceMarkerType | null;
  id: string;
  isUnplanned: boolean;
  questionText: string;
  vivaQuestionId: string | null;
};

export type RailFollowUp = {
  askedQuestionId: string;
  evidenceMarkerType: EvidenceMarkerType | null;
  questionText: string;
  state: Exclude<RailState, "not_yet_asked">;
};

export type RailItem = {
  askedQuestionId: string | null;
  evidenceMarkerType: EvidenceMarkerType | null;
  followUps: RailFollowUp[];
  id: string;
  number: number;
  questionText: string;
  state: RailState;
};

export type QuestionSetRail = {
  askedPlannedCount: number;
  /** Follow-ups asked before any planned question, so they have nothing to sit under. */
  leadingFollowUps: RailFollowUp[];
  items: RailItem[];
};

/**
 * Derives what the Viva Question Set rail shows from the set and the Asked
 * Questions (in the order they were asked).
 *
 * The most recently asked question is "asking now" — it is the one the
 * conversation is on. Every other asked question is "asked". An unplanned
 * follow-up sits under the planned question asked before it.
 */
export function deriveQuestionSetRail(
  plannedQuestions: ReadonlyArray<RailPlannedQuestion>,
  askedQuestions: ReadonlyArray<RailAskedQuestion>,
): QuestionSetRail {
  const latestAskedId = askedQuestions.at(-1)?.id ?? null;
  const stateOf = (id: string): Exclude<RailState, "not_yet_asked"> =>
    id === latestAskedId ? "asking_now" : "asked";

  const items = new Map<string, RailItem>(
    plannedQuestions.map((question, index) => [
      question.id,
      {
        askedQuestionId: null,
        evidenceMarkerType: null,
        followUps: [],
        id: question.id,
        number: index + 1,
        questionText: question.questionText,
        state: "not_yet_asked",
      },
    ]),
  );
  const leadingFollowUps: RailFollowUp[] = [];
  let anchor: RailItem | null = null;

  for (const asked of askedQuestions) {
    const planned = asked.isUnplanned
      ? undefined
      : items.get(asked.vivaQuestionId ?? "");

    if (planned) {
      // A question asked twice is represented by its latest asking.
      planned.askedQuestionId = asked.id;
      planned.evidenceMarkerType = asked.evidenceMarkerType;
      planned.state = stateOf(asked.id);
      anchor = planned;
    } else if (asked.isUnplanned) {
      const followUp: RailFollowUp = {
        askedQuestionId: asked.id,
        evidenceMarkerType: asked.evidenceMarkerType,
        questionText: asked.questionText,
        state: stateOf(asked.id),
      };

      (anchor ? anchor.followUps : leadingFollowUps).push(followUp);
    }
  }

  const railItems = [...items.values()];

  return {
    askedPlannedCount: railItems.filter((item) => item.state !== "not_yet_asked")
      .length,
    items: railItems,
    leadingFollowUps,
  };
}

export function formatRailState(
  state: RailState,
  evidenceMarkerLabel: string | null,
): string {
  const label = {
    asked: "Asked",
    asking_now: "Asking now",
    not_yet_asked: "Not yet asked",
  }[state];

  return evidenceMarkerLabel ? `${label} · ${evidenceMarkerLabel}` : label;
}

export function formatRailHeader(asked: number, total: number): string {
  return `Question set · ${asked} of ${total}`;
}

/** "argumentation_and_reasoning" → "Argumentation & reasoning". */
export function formatCategoryLabel(category: string): string {
  const words = category.split("_").map((word) => (word === "and" ? "&" : word));
  const sentence = words.join(" ");

  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

/** The part of the live transcript spoken since `startOffset`. */
export function transcriptSince(text: string, startOffset: number): string {
  return text.slice(Math.min(startOffset, text.length)).trimStart();
}
