import type { SupabaseClient } from "@supabase/supabase-js";
import type { EvidenceMarkerType } from "./vivaSessionCapture";

export const VIVA_CONCLUSIONS = [
  "understanding_demonstrated",
  "further_review_required",
  "authenticity_concern",
  "unable_to_conclude",
] as const;

export type VivaConclusion = (typeof VIVA_CONCLUSIONS)[number];

export function formatVivaConclusionLabel(conclusion: VivaConclusion): string {
  switch (conclusion) {
    case "understanding_demonstrated":
      return "Understanding demonstrated";
    case "further_review_required":
      return "Further review required";
    case "authenticity_concern":
      return "Authenticity concern";
    case "unable_to_conclude":
      return "Unable to conclude";
  }
}

export type ConclusionDraft = {
  conclusion: VivaConclusion | null;
  explanation: string;
  followUpAction: string;
};

export type ValidConclusion = {
  conclusion: VivaConclusion;
  explanation: string;
  followUpAction: string | null;
};

export type ConclusionErrors = {
  conclusion?: string;
  explanation?: string;
};

export type ConclusionValidation =
  | { errors: ConclusionErrors; ok: false }
  | { ok: true; value: ValidConclusion };

// The teacher decides: nothing is defaulted or inferred from the evidence.
export function validateConclusionDraft(
  draft: ConclusionDraft,
): ConclusionValidation {
  const errors: ConclusionErrors = {};
  const explanation = draft.explanation.trim();
  const followUpAction = draft.followUpAction.trim();

  if (draft.conclusion === null) {
    errors.conclusion = "Choose a Viva Conclusion.";
  }

  if (explanation.length === 0) {
    errors.explanation = "Explain your Viva Conclusion.";
  }

  if (draft.conclusion === null || Object.keys(errors).length > 0) {
    return { errors, ok: false };
  }

  return {
    ok: true,
    value: {
      conclusion: draft.conclusion,
      explanation,
      followUpAction: followUpAction.length > 0 ? followUpAction : null,
    },
  };
}

export type SnapshotAskedQuestion = {
  askedAt: string;
  evidenceMarker: EvidenceMarkerType | null;
  isUnplanned: boolean;
  observation: string | null;
  questionText: string;
  vivaQuestionId: string | null;
};

export type SnapshotSetQuestion = {
  id: string;
  questionText: string;
  setPosition: number | null;
  teacherNote: string;
};

export type SnapshotRecordingChunk = {
  mimeType: string;
  sequence: number;
  storagePath: string;
};

export type VivaRecordSnapshot = {
  askedQuestions: SnapshotAskedQuestion[];
  questionSet: { questions: SnapshotSetQuestion[] };
  recording: { chunks: SnapshotRecordingChunk[] } | null;
  session: { endedAt: string | null; startedAt: string };
};

export type BuildSnapshotInput = {
  askedQuestions: Array<{
    askedAt: string;
    evidenceMarker: { markerType: EvidenceMarkerType } | null;
    id: string;
    isUnplanned: boolean;
    observation: { content: string } | null;
    questionText: string;
    vivaQuestionId: string | null;
  }>;
  recordingChunks: SnapshotRecordingChunk[];
  session: { endedAt: string | null; startedAt: string };
  setQuestions: SnapshotSetQuestion[];
};

function bySetPosition(a: SnapshotSetQuestion, b: SnapshotSetQuestion) {
  return (a.setPosition ?? Number.MAX_SAFE_INTEGER) -
    (b.setPosition ?? Number.MAX_SAFE_INTEGER);
}

export function buildVivaRecordSnapshot(
  input: BuildSnapshotInput,
): VivaRecordSnapshot {
  const chunks = [...input.recordingChunks].sort(
    (a, b) => a.sequence - b.sequence,
  );

  return {
    askedQuestions: input.askedQuestions.map((asked) => ({
      askedAt: asked.askedAt,
      evidenceMarker: asked.evidenceMarker?.markerType ?? null,
      isUnplanned: asked.isUnplanned,
      observation: asked.observation?.content ?? null,
      questionText: asked.questionText,
      vivaQuestionId: asked.vivaQuestionId,
    })),
    questionSet: { questions: [...input.setQuestions].sort(bySetPosition) },
    recording: chunks.length > 0 ? { chunks } : null,
    session: input.session,
  };
}

export type VivaRecord = {
  conclusion: VivaConclusion;
  explanation: string;
  followUpAction: string | null;
  id: string;
  signedAt: string;
  signedBy: string;
  snapshot: VivaRecordSnapshot;
  submissionId: string;
  vivaSessionId: string;
};

export type InsertVivaRecordInput = ValidConclusion & {
  snapshot: VivaRecordSnapshot;
  submissionId: string;
  vivaSessionId: string;
};

export type VivaRecordRepository = {
  findBySessionId: (vivaSessionId: string) => Promise<VivaRecord | null>;
  insert: (input: InsertVivaRecordInput) => Promise<VivaRecord>;
};

export type SignVivaRecordInput = {
  draft: ConclusionDraft;
  session: {
    id: string;
    status: "active" | "ended";
    submissionId: string;
  };
  snapshot: VivaRecordSnapshot;
};

export type SignVivaRecordResult =
  | { errors: ConclusionErrors; outcome: "invalid" }
  | { outcome: "already_signed"; record: VivaRecord }
  | { outcome: "session_not_ended" }
  | { outcome: "signed"; record: VivaRecord };

export async function signVivaRecord(
  input: SignVivaRecordInput,
  repository: VivaRecordRepository,
): Promise<SignVivaRecordResult> {
  const existing = await repository.findBySessionId(input.session.id);

  if (existing) {
    return { outcome: "already_signed", record: existing };
  }

  if (input.session.status !== "ended") {
    return { outcome: "session_not_ended" };
  }

  const validation = validateConclusionDraft(input.draft);

  if (!validation.ok) {
    return { errors: validation.errors, outcome: "invalid" };
  }

  const record = await repository.insert({
    ...validation.value,
    snapshot: input.snapshot,
    submissionId: input.session.submissionId,
    vivaSessionId: input.session.id,
  });

  return { outcome: "signed", record };
}

type VivaRecordRow = {
  conclusion: VivaConclusion;
  conclusion_explanation: string;
  follow_up_action: string | null;
  id: string;
  signed_at: string;
  signed_by: string;
  snapshot: VivaRecordSnapshot;
  submission_id: string;
  viva_session_id: string;
};

const VIVA_RECORD_COLUMNS =
  "id, viva_session_id, submission_id, conclusion, conclusion_explanation, follow_up_action, snapshot, signed_by, signed_at";

function mapRowToRecord(row: VivaRecordRow): VivaRecord {
  return {
    conclusion: row.conclusion,
    explanation: row.conclusion_explanation,
    followUpAction: row.follow_up_action,
    id: row.id,
    signedAt: row.signed_at,
    signedBy: row.signed_by,
    snapshot: row.snapshot,
    submissionId: row.submission_id,
    vivaSessionId: row.viva_session_id,
  };
}

const UNIQUE_VIOLATION_CODE = "23505";

export function createSupabaseVivaRecordRepository(
  supabase: SupabaseClient,
): VivaRecordRepository {
  const findBySessionId = async (vivaSessionId: string) => {
    const { data, error } = await supabase
      .from("viva_records")
      .select(VIVA_RECORD_COLUMNS)
      .eq("viva_session_id", vivaSessionId);

    if (error) {
      throw new Error("We could not load the Viva Record.");
    }

    const row = (data as VivaRecordRow[] | null)?.[0];

    return row ? mapRowToRecord(row) : null;
  };

  return {
    findBySessionId,
    async insert(input) {
      const { data, error } = await supabase
        .from("viva_records")
        .insert({
          conclusion: input.conclusion,
          conclusion_explanation: input.explanation,
          follow_up_action: input.followUpAction,
          snapshot: input.snapshot,
          submission_id: input.submissionId,
          viva_session_id: input.vivaSessionId,
        })
        .select(VIVA_RECORD_COLUMNS);

      if (error) {
        // A concurrent sign (second tab) already won; surface that record.
        if (error.code === UNIQUE_VIOLATION_CODE) {
          const existing = await findBySessionId(input.vivaSessionId);

          if (existing) {
            return existing;
          }
        }

        throw new Error("We could not sign the Viva Record.");
      }

      const row = (data as VivaRecordRow[] | null)?.[0];

      if (!row) {
        throw new Error("We could not sign the Viva Record.");
      }

      return mapRowToRecord(row);
    },
  };
}
