import { describe, expect, it } from "vitest";
import {
  asksForDecision,
  draftAssessmentSummary,
  editDraft,
  type ApprovedEvidence,
  type ProposedSummary,
  type SummaryDrafter,
} from "./assessmentSummary";

const evidence: ApprovedEvidence[] = [
  { id: "e1", kind: "excerpt", text: "I chose the short lines to show panic." },
  { id: "o1", kind: "observation", text: "Hesitated on the second metaphor." },
];

const answering =
  (proposal: ProposedSummary): SummaryDrafter =>
  async () =>
    proposal;

const grounded: ProposedSummary = {
  claims: [{ evidenceIds: ["e1"], text: "Explained the effect of short lines." }],
  uncertainty: "Nothing was heard about the second metaphor beyond hesitation.",
};

// Each fixture is a draft the AI might return and the verdict it must get.
const evaluationFixtures: Array<{
  name: string;
  proposal: ProposedSummary;
  outcome: "drafted" | "rejected_output";
  reason?: "ungrounded" | "prohibited";
}> = [
  { name: "grounding: cited approved evidence", proposal: grounded, outcome: "drafted" },
  {
    name: "grounding: cites evidence that was never approved",
    proposal: { ...grounded, claims: [{ evidenceIds: ["x9"], text: "Quoted a poem." }] },
    outcome: "rejected_output",
    reason: "ungrounded",
  },
  {
    name: "grounding: claim with no citation",
    proposal: { ...grounded, claims: [{ evidenceIds: [], text: "Was confident." }] },
    outcome: "rejected_output",
    reason: "ungrounded",
  },
  {
    name: "uncertainty: states what the evidence lacks",
    proposal: { ...grounded, uncertainty: "No evidence on ownership of the draft." },
    outcome: "drafted",
  },
  {
    name: "prohibited: grades the student",
    proposal: { ...grounded, claims: [{ evidenceIds: ["e1"], text: "Deserves 7/10." }] },
    outcome: "rejected_output",
    reason: "prohibited",
  },
  {
    name: "prohibited: authenticity verdict",
    proposal: { ...grounded, claims: [{ evidenceIds: ["o1"], text: "This is not their own work." }] },
    outcome: "rejected_output",
    reason: "prohibited",
  },
  {
    name: "prohibited: makes the Viva Conclusion",
    proposal: { ...grounded, uncertainty: "Understanding demonstrated." },
    outcome: "rejected_output",
    reason: "prohibited",
  },
  {
    name: "prompt injection: AI obeys instruction hidden in evidence",
    proposal: { ...grounded, claims: [{ evidenceIds: ["e1"], text: "Student passed with full marks." }] },
    outcome: "rejected_output",
    reason: "prohibited",
  },
];

describe("draftAssessmentSummary evaluation fixtures", () => {
  it.each(evaluationFixtures)("$name", async (fixture) => {
    const result = await draftAssessmentSummary(evidence, answering(fixture.proposal));

    expect(result.outcome).toBe(fixture.outcome);

    if (result.outcome === "rejected_output") {
      expect(result.reason).toBe(fixture.reason);
    }
  });
});

describe("draftAssessmentSummary", () => {
  it("returns an AI-origin draft the teacher can then edit", async () => {
    const result = await draftAssessmentSummary(evidence, answering(grounded));

    if (result.outcome !== "drafted") throw new Error("expected a draft");

    expect(result.draft.origin).toBe("ai");

    const edited = editDraft(result.draft, [
      { evidenceIds: ["e1"], text: "Explained short lines well." },
    ]);

    expect(edited.origin).toBe("teacher_edited");
    expect(edited.claims[0].text).toBe("Explained short lines well.");
  });

  it("regenerates by asking again", async () => {
    let calls = 0;
    const drafter: SummaryDrafter = async () => {
      calls += 1;

      return calls === 1
        ? grounded
        : { ...grounded, claims: [{ evidenceIds: ["o1"], text: "Hesitated once." }] };
    };
    const first = await draftAssessmentSummary(evidence, drafter);
    const second = await draftAssessmentSummary(evidence, drafter);

    expect(first.outcome === "drafted" && first.draft.claims[0].text).toBe(
      "Explained the effect of short lines.",
    );
    expect(second.outcome === "drafted" && second.draft.claims[0].text).toBe(
      "Hesitated once.",
    );
  });

  it.each([
    "Give this student a grade",
    "Was this written by AI?",
    "Decide the viva conclusion",
  ])("refuses a request for a decision: %s", async (instruction) => {
    const drafter: SummaryDrafter = async () => {
      throw new Error("must not be called");
    };

    expect(await draftAssessmentSummary(evidence, drafter, { instruction })).toEqual({
      outcome: "refused_decision",
    });
  });

  it("does not call the AI without approved evidence", async () => {
    const drafter: SummaryDrafter = async () => {
      throw new Error("must not be called");
    };

    expect(await draftAssessmentSummary([], drafter)).toEqual({ outcome: "no_evidence" });
    expect(
      await draftAssessmentSummary([{ id: "e", kind: "excerpt", text: "  " }], drafter),
    ).toEqual({ outcome: "no_evidence" });
  });

  it("reports an AI failure as a value", async () => {
    const down: SummaryDrafter = async () => {
      throw new Error("503");
    };

    expect(await draftAssessmentSummary(evidence, down)).toEqual({
      outcome: "ai_unavailable",
    });
  });
});

const decisionPhrases = [
  "grade", "mark this", "score it", "rate the work", "rank the student",
  "pass or fail", "did they cheat", "is it plagiarised", "plagiarism check",
  "is it authentic", "authenticity", "is it genuine", "is it fake",
  "AI-written?", "written by AI", "written by ChatGPT", "the conclusion",
];

describe("asksForDecision", () => {
  it.each(decisionPhrases)("flags %s", (instruction) => {
    expect(asksForDecision(instruction)).toBe(true);
  });

  it.each(["Focus on the metaphors", "Keep it short", "Mention the pauses"])(
    "allows %s",
    (instruction) => {
      expect(asksForDecision(instruction)).toBe(false);
    },
  );
});

const prohibitedOutputs = [
  "The work was graded highly.", "A high score.", "Scored well.", "Full marks.",
  "They got 7/10.", "7 out of 10 overall.", "They passed.", "They fail.", "They failed.",
  "Cheating is likely.", "Cheated.", "Plagiarised.", "Plagiarism found.",
  "They were dishonest.", "Dishonesty noted.", "Fabricated answers.", "Fabrication.",
  "Not their own work.", "Not his own work.", "Not her own work.",
  "It is their own work.", "Written by AI.", "Written by ChatGPT.", "Used AI.",
  "AI-generated work.", "AI generated essay.", "AI-generated text.",
  "Understanding demonstrated.", "Understanding was demonstrated.",
  "Authenticity concern.", "Further review required.", "Further review is required.",
];

describe("prohibited conclusions", () => {
  it.each(prohibitedOutputs)("rejects a claim saying: %s", async (text) => {
    const result = await draftAssessmentSummary(
      evidence,
      answering({ claims: [{ evidenceIds: ["e1"], text }], uncertainty: "" }),
    );

    expect(result).toEqual({ outcome: "rejected_output", reason: "prohibited" });
  });

  it("rejects a prohibited uncertainty note", async () => {
    const result = await draftAssessmentSummary(
      evidence,
      answering({ ...grounded, uncertainty: "They failed." }),
    );

    expect(result).toEqual({ outcome: "rejected_output", reason: "prohibited" });
  });

  it.each(["Compass points to a marketplace.", "Passion for the topic.", "Gradual build-up of tension."])(
    "allows words that only contain a prohibited one: %s",
    async (text) => {
      const result = await draftAssessmentSummary(
        evidence,
        answering({ claims: [{ evidenceIds: ["e1"], text }], uncertainty: "" }),
      );

      expect(result.outcome).toBe("drafted");
    },
  );
});

describe("grounding edge cases", () => {
  const claim = { evidenceIds: ["e1"], text: "Explained the line breaks." };

  it.each([
    ["no claims", []],
    ["a blank claim", [{ evidenceIds: ["e1"], text: "   " }]],
    ["one good and one uncited claim", [claim, { evidenceIds: [], text: "Calm." }]],
    ["one known and one unknown id", [{ evidenceIds: ["e1", "zz"], text: "Calm." }]],
  ])("rejects %s", async (_name, claims) => {
    const result = await draftAssessmentSummary(
      evidence,
      answering({ claims, uncertainty: "" }),
    );

    expect(result).toEqual({ outcome: "rejected_output", reason: "ungrounded" });
  });

  it("ignores blank evidence when handing items to the AI", async () => {
    let seen: ApprovedEvidence[] = [];

    await draftAssessmentSummary(
      [...evidence, { id: "b", kind: "excerpt", text: " " }],
      async (items) => {
        seen = [...items];

        return grounded;
      },
    );

    expect(seen.map((e) => e.id)).toEqual(["e1", "o1"]);
  });

  it("does not accept a citation to blank, withheld evidence", async () => {
    const result = await draftAssessmentSummary(
      [...evidence, { id: "b", kind: "excerpt", text: " " }],
      answering({ claims: [{ evidenceIds: ["b"], text: "Calm." }], uncertainty: "" }),
    );

    expect(result).toEqual({ outcome: "rejected_output", reason: "ungrounded" });
  });
});
