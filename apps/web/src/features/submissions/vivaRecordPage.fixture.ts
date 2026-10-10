import type { SignedVivaRecord } from "./vivaRecordAmendment";

export function makeSignedRecord(
  planned: number,
  followUps: number,
): SignedVivaRecord {
  const total = planned + followUps;

  return {
    conclusion: "further_review_required",
    conclusionRationale: "Answers were thin on method.",
    followUpAction: "Resubmit the methods section.",
    id: "record-1",
    signedAt: "2026-05-01T10:30:00.000Z",
    snapshot: {
      askedQuestions: Array.from({ length: total }, (_, i) => ({
        askedAt: `2026-05-01T10:${String(i).padStart(2, "0")}:00.000Z`,
        evidenceMarker:
          i % 3 === 0
            ? { markerType: "clear_understanding" as const, recordedAt: "x" }
            : i % 3 === 1
              ? { markerType: "concern" as const, recordedAt: "x" }
              : null,
        id: `q${i}`,
        isUnplanned: i >= planned,
        observation: { content: `Observation ${String(i).padStart(2, "0")} end`, recordedAt: "x" },
        questionText: `Question ${String(i).padStart(2, "0")}?`,
      })),
      questionSetId: "set-1",
      recording: { chunkCount: 3, storagePrefix: "a/" },
      session: {
        endedAt: "2026-05-01T10:25:30.000Z",
        id: "session-1",
        startedAt: "2026-05-01T10:00:00.000Z",
      },
      teacher: { id: "t1", name: "Ms Patel" },
    },
    status: "signed",
    vivaSessionId: "session-1",
  };
}
