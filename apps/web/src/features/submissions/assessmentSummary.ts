/** One piece of teacher-approved evidence the draft may draw on. */
export type ApprovedEvidence = {
  id: string;
  kind: "excerpt" | "marker" | "observation";
  text: string;
};

export type DraftClaim = { evidenceIds: string[]; text: string };

/** What the AI port returns: claims, each citing the evidence it rests on. */
export type ProposedSummary = {
  claims: DraftClaim[];
  /** What the evidence does not show, in the AI's words. */
  uncertainty: string;
};

export type SummaryDrafter = (
  evidence: readonly ApprovedEvidence[],
) => Promise<ProposedSummary>;

export type SummaryDraft = {
  claims: DraftClaim[];
  /** The draft is always shown as AI-generated until the teacher edits it. */
  origin: "ai" | "teacher_edited";
  uncertainty: string;
};

export type DraftResult =
  | { draft: SummaryDraft; outcome: "drafted" }
  | { outcome: "no_evidence" }
  /** The request asked for a grade or a verdict on authenticity. */
  | { outcome: "refused_decision" }
  /** The AI's answer contained a grade, verdict or unsupported claim. */
  | { outcome: "rejected_output"; reason: "ungrounded" | "prohibited" }
  /** The AI could not be reached; everything else in the viva still works. */
  | { outcome: "ai_unavailable" };

const DECISION_REQUEST =
  /\b(grade|mark|score|rate|rank|pass|fail)\b|\b(cheat\w*|plagiari\w*|authentic\w*|genuine|fake|ai[- ]written|written by (ai|chatgpt))\b|\bconclusion\b/i;

const PROHIBITED_OUTPUT =
  /\b(grade[ds]?|score[ds]?|marks?|\d+\s*(\/|out of)\s*\d+|pass(ed)?|fail(ed)?)\b|\b(cheat\w*|plagiari\w*|dishonest\w*|fabricat\w*|not (his|her|their) own work|(his|her|their) own work|written by (ai|chatgpt)|used ai|ai[- ]generated (work|essay|text))\b|\b(understanding (was )?demonstrated|authenticity concern|further review (is )?required)\b/i;

export function asksForDecision(instruction: string): boolean {
  return DECISION_REQUEST.test(instruction);
}

function violation(
  proposal: ProposedSummary,
  known: ReadonlySet<string>,
): "ungrounded" | "prohibited" | null {
  const texts = [...proposal.claims.map((c) => c.text), proposal.uncertainty];

  if (texts.some((text) => PROHIBITED_OUTPUT.test(text))) return "prohibited";

  if (
    proposal.claims.length === 0 ||
    proposal.claims.some(
      (c) =>
        c.text.trim() === "" ||
        c.evidenceIds.length === 0 ||
        c.evidenceIds.some((id) => !known.has(id)),
    )
  ) {
    return "ungrounded";
  }

  return null;
}

/**
 * Drafts a summary from approved evidence only. The output is checked here,
 * not trusted: a claim that cites nothing approved, or that grades the Student
 * or decides the Viva Conclusion, rejects the whole draft. An AI failure
 * comes back as a value so the rest of the viva stays usable.
 */
export async function draftAssessmentSummary(
  evidence: readonly ApprovedEvidence[],
  drafter: SummaryDrafter,
  options: { instruction?: string } = {},
): Promise<DraftResult> {
  if (options.instruction && asksForDecision(options.instruction)) {
    return { outcome: "refused_decision" };
  }

  const usable = evidence.filter((item) => item.text.trim() !== "");

  if (usable.length === 0) return { outcome: "no_evidence" };

  let proposal: ProposedSummary;

  try {
    proposal = await drafter(usable);
  } catch {
    return { outcome: "ai_unavailable" };
  }

  const reason = violation(proposal, new Set(usable.map((e) => e.id)));

  if (reason) return { outcome: "rejected_output", reason };

  return {
    draft: {
      claims: proposal.claims,
      origin: "ai",
      uncertainty: proposal.uncertainty,
    },
    outcome: "drafted",
  };
}

/** The teacher's edit keeps the citations but marks the text as theirs. */
export function editDraft(draft: SummaryDraft, claims: DraftClaim[]): SummaryDraft {
  return { ...draft, claims, origin: "teacher_edited" };
}
