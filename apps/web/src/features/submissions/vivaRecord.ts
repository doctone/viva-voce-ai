import type { SupabaseClient } from "@supabase/supabase-js";
import type { EvidenceMarkerType } from "./vivaSessionCapture";

export const VIVA_CONCLUSIONS = [
  "understanding_demonstrated",
  "further_review_required",
  "authenticity_concern",
  "unable_to_conclude",
] as const;

export type VivaConclusion = (typeof VIVA_CONCLUSIONS)[number];

export function isVivaConclusion(value: string): value is VivaConclusion {
  return (VIVA_CONCLUSIONS as readonly string[]).includes(value);
}

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

export type VivaRecordSnapshot = {
  askedQuestions: ReadonlyArray<{
    askedAt: string;
    evidenceMarker: {
      markerType: EvidenceMarkerType;
      recordedAt: string;
    } | null;
    id: string;
    isUnplanned: boolean;
    observation: { content: string; recordedAt: string } | null;
    questionText: string;
  }>;
  questionSetId: string;
  /** Null when the session had no audio (recording disabled or none saved). */
  recording: { chunkCount: number; storagePrefix: string } | null;
  session: { endedAt: string; id: string; startedAt: string };
  teacher: { id: string; name: string };
};

export type VivaRecord =
  | {
      conclusion: VivaConclusion | null;
      conclusionRationale: string;
      followUpAction: string;
      id: string;
      status: "draft";
      vivaSessionId: string;
    }
  | {
      conclusion: VivaConclusion;
      conclusionRationale: string;
      followUpAction: string;
      id: string;
      signedAt: string;
      snapshot: VivaRecordSnapshot;
      status: "signed";
      vivaSessionId: string;
    };

export type VivaRecordDraftInput = {
  conclusion: VivaConclusion | null;
  conclusionRationale: string;
  followUpAction: string;
};

/** Reasons the draft cannot be signed yet; empty means it can. */
export function validateForSigning(input: VivaRecordDraftInput): string[] {
  const reasons: string[] = [];

  if (input.conclusion === null) {
    reasons.push("Choose a Viva Conclusion.");
  }

  if (input.conclusionRationale.trim().length === 0) {
    reasons.push("Explain your Viva Conclusion.");
  }

  return reasons;
}

export type SessionSource = {
  askedQuestions: ReadonlyArray<{
    askedAt: string;
    id: string;
    isUnplanned: boolean;
    questionText: string;
  }>;
  endedAt: string | null;
  evidenceMarkers: ReadonlyArray<{
    askedQuestionId: string;
    markerType: EvidenceMarkerType;
    updatedAt: string;
  }>;
  observations: ReadonlyArray<{
    askedQuestionId: string;
    content: string;
    updatedAt: string;
  }>;
  questionSetId: string;
  recordingChunkPaths: readonly string[];
  sessionId: string;
  startedAt: string;
  teacher: { id: string; name: string };
};

export function buildSnapshot(source: SessionSource): VivaRecordSnapshot {
  if (source.endedAt === null) {
    throw new Error("Only an ended Viva Session can be recorded.");
  }

  const observations = new Map(
    source.observations.map((o) => [o.askedQuestionId, o]),
  );
  const markers = new Map(
    source.evidenceMarkers.map((m) => [m.askedQuestionId, m]),
  );
  const [firstPath] = [...source.recordingChunkPaths].sort();

  return {
    askedQuestions: [...source.askedQuestions]
      .sort((a, b) => a.askedAt.localeCompare(b.askedAt))
      .map((question) => {
        const observation = observations.get(question.id);
        const marker = markers.get(question.id);

        return {
          askedAt: question.askedAt,
          evidenceMarker: marker
            ? { markerType: marker.markerType, recordedAt: marker.updatedAt }
            : null,
          id: question.id,
          isUnplanned: question.isUnplanned,
          observation: observation
            ? { content: observation.content, recordedAt: observation.updatedAt }
            : null,
          questionText: question.questionText,
        };
      }),
    questionSetId: source.questionSetId,
    recording: firstPath
      ? {
          chunkCount: source.recordingChunkPaths.length,
          storagePrefix: firstPath.slice(0, firstPath.lastIndexOf("/") + 1),
        }
      : null,
    session: {
      endedAt: source.endedAt,
      id: source.sessionId,
      startedAt: source.startedAt,
    },
    teacher: source.teacher,
  };
}

export type VivaRecordRepository = {
  /** Returns the record for a session, or null if none has been started. */
  find: (vivaSessionId: string) => Promise<VivaRecord | null>;
  loadSource: (vivaSessionId: string) => Promise<SessionSource>;
  saveDraft: (
    vivaSessionId: string,
    input: VivaRecordDraftInput,
  ) => Promise<VivaRecord>;
  /** Must fail if the record is already signed. */
  sign: (
    recordId: string,
    input: VivaRecordDraftInput & { conclusion: VivaConclusion },
    snapshot: VivaRecordSnapshot,
  ) => Promise<VivaRecord>;
};

export type SaveDraftResult =
  | { outcome: "already_signed"; record: VivaRecord }
  | { outcome: "saved"; record: VivaRecord };

/** Ending a session leaves no record behind; the teacher drafts one here. */
export async function saveVivaRecordDraft(
  vivaSessionId: string,
  input: VivaRecordDraftInput,
  repository: VivaRecordRepository,
): Promise<SaveDraftResult> {
  const existing = await repository.find(vivaSessionId);

  if (existing?.status === "signed") {
    return { outcome: "already_signed", record: existing };
  }

  return {
    outcome: "saved",
    record: await repository.saveDraft(vivaSessionId, input),
  };
}

export type SignResult =
  | { outcome: "already_signed"; record: VivaRecord }
  | { outcome: "rejected"; reasons: string[] }
  | { outcome: "signed"; record: VivaRecord };

export async function signVivaRecord(
  vivaSessionId: string,
  input: VivaRecordDraftInput,
  repository: VivaRecordRepository,
): Promise<SignResult> {
  const existing = await repository.find(vivaSessionId);

  if (existing?.status === "signed") {
    return { outcome: "already_signed", record: existing };
  }

  const reasons = validateForSigning(input);

  if (reasons.length > 0 || input.conclusion === null) {
    return { outcome: "rejected", reasons };
  }

  // The snapshot is taken from the stored evidence at the moment of signing,
  // never from client-supplied content.
  const snapshot = buildSnapshot(await repository.loadSource(vivaSessionId));
  const draft = existing ?? (await repository.saveDraft(vivaSessionId, input));

  const record = await repository.sign(
    draft.id,
    { ...input, conclusion: input.conclusion },
    snapshot,
  );

  return { outcome: "signed", record };
}

type VivaRecordRow = {
  conclusion: VivaConclusion | null;
  conclusion_rationale: string;
  follow_up_action: string;
  id: string;
  signed_at: string | null;
  snapshot: VivaRecordSnapshot | null;
  status: "draft" | "signed";
  viva_session_id: string;
};

const VIVA_RECORD_COLUMNS =
  "id, viva_session_id, status, conclusion, conclusion_rationale, follow_up_action, signed_at, snapshot";

function mapRow(row: VivaRecordRow): VivaRecord {
  if (
    row.status === "signed" &&
    row.conclusion &&
    row.signed_at &&
    row.snapshot
  ) {
    return {
      conclusion: row.conclusion,
      conclusionRationale: row.conclusion_rationale,
      followUpAction: row.follow_up_action,
      id: row.id,
      signedAt: row.signed_at,
      snapshot: row.snapshot,
      status: "signed",
      vivaSessionId: row.viva_session_id,
    };
  }

  return {
    conclusion: row.conclusion,
    conclusionRationale: row.conclusion_rationale,
    followUpAction: row.follow_up_action,
    id: row.id,
    status: "draft",
    vivaSessionId: row.viva_session_id,
  };
}

export function createSupabaseVivaRecordRepository(
  supabase: SupabaseClient,
): VivaRecordRepository {
  return {
    async find(vivaSessionId) {
      const { data, error } = await supabase
        .from("viva_records")
        .select(VIVA_RECORD_COLUMNS)
        .eq("viva_session_id", vivaSessionId);

      if (error) {
        throw new Error("We could not load the Viva Record.");
      }

      const row = (data as VivaRecordRow[] | null)?.[0];

      return row ? mapRow(row) : null;
    },
    async loadSource(vivaSessionId) {
      const [session, asked, chunks, userResult] = await Promise.all([
        supabase
          .from("viva_sessions")
          .select("id, viva_question_set_id, started_at, ended_at")
          .eq("id", vivaSessionId),
        supabase
          .from("asked_questions")
          .select("id, question_text, is_unplanned, asked_at")
          .eq("viva_session_id", vivaSessionId),
        supabase
          .from("viva_recording_chunks")
          .select("storage_path")
          .eq("viva_session_id", vivaSessionId),
        supabase.auth.getUser(),
      ]);

      const sessionRow = (
        session.data as Array<{
          ended_at: string | null;
          id: string;
          started_at: string;
          viva_question_set_id: string;
        }> | null
      )?.[0];
      const user = userResult.data.user;

      if (
        session.error ||
        asked.error ||
        chunks.error ||
        !sessionRow ||
        !user
      ) {
        throw new Error(
          "We could not gather the evidence for this Viva Record.",
        );
      }

      const askedRows = (asked.data ?? []) as Array<{
        asked_at: string;
        id: string;
        is_unplanned: boolean;
        question_text: string;
      }>;
      const ids = askedRows.map((row) => row.id);

      const [observations, markers] = await Promise.all([
        supabase
          .from("observations")
          .select("asked_question_id, content, updated_at")
          .in("asked_question_id", ids),
        supabase
          .from("evidence_markers")
          .select("asked_question_id, marker_type, updated_at")
          .in("asked_question_id", ids),
      ]);

      if (observations.error || markers.error) {
        throw new Error(
          "We could not gather the evidence for this Viva Record.",
        );
      }

      return {
        askedQuestions: askedRows.map((row) => ({
          askedAt: row.asked_at,
          id: row.id,
          isUnplanned: row.is_unplanned,
          questionText: row.question_text,
        })),
        endedAt: sessionRow.ended_at,
        evidenceMarkers: (
          (markers.data ?? []) as Array<{
            asked_question_id: string;
            marker_type: EvidenceMarkerType;
            updated_at: string;
          }>
        ).map((row) => ({
          askedQuestionId: row.asked_question_id,
          markerType: row.marker_type,
          updatedAt: row.updated_at,
        })),
        observations: (
          (observations.data ?? []) as Array<{
            asked_question_id: string;
            content: string;
            updated_at: string;
          }>
        ).map((row) => ({
          askedQuestionId: row.asked_question_id,
          content: row.content,
          updatedAt: row.updated_at,
        })),
        questionSetId: sessionRow.viva_question_set_id,
        recordingChunkPaths: (
          (chunks.data ?? []) as Array<{ storage_path: string }>
        ).map((row) => row.storage_path),
        sessionId: sessionRow.id,
        startedAt: sessionRow.started_at,
        teacher: { id: user.id, name: user.email ?? user.id },
      };
    },
    async saveDraft(vivaSessionId, input) {
      const { data, error } = await supabase
        .from("viva_records")
        .upsert(
          {
            conclusion: input.conclusion,
            conclusion_rationale: input.conclusionRationale,
            follow_up_action: input.followUpAction,
            viva_session_id: vivaSessionId,
          },
          { onConflict: "viva_session_id" },
        )
        .select(VIVA_RECORD_COLUMNS);

      const row = (data as VivaRecordRow[] | null)?.[0];

      if (error || !row) {
        throw new Error("We could not save the Viva Record.");
      }

      return mapRow(row);
    },
    async sign(recordId, input, snapshot) {
      const { data, error } = await supabase
        .from("viva_records")
        .update({
          conclusion: input.conclusion,
          conclusion_rationale: input.conclusionRationale,
          follow_up_action: input.followUpAction,
          signed_at: new Date().toISOString(),
          snapshot,
          status: "signed",
        })
        .eq("id", recordId)
        .eq("status", "draft")
        .select(VIVA_RECORD_COLUMNS);

      const row = (data as VivaRecordRow[] | null)?.[0];

      if (error || !row) {
        throw new Error("We could not sign the Viva Record.");
      }

      return mapRow(row);
    },
  };
}
