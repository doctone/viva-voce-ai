import type { SupabaseClient } from "@supabase/supabase-js";

export const EVIDENCE_MARKER_TYPES = [
  "clear_understanding",
  "needs_further_probing",
  "concern",
] as const;

export type EvidenceMarkerType = (typeof EVIDENCE_MARKER_TYPES)[number];

export function isEvidenceMarkerType(
  value: string,
): value is EvidenceMarkerType {
  return (EVIDENCE_MARKER_TYPES as readonly string[]).includes(value);
}

export function formatEvidenceMarkerLabel(
  markerType: EvidenceMarkerType,
): string {
  switch (markerType) {
    case "clear_understanding":
      return "Clear understanding";
    case "needs_further_probing":
      return "Needs further probing";
    case "concern":
      return "Concern";
  }
}

export type AskedQuestionRecord = {
  askedAt: string;
  id: string;
  isUnplanned: boolean;
  questionText: string;
  vivaQuestionId: string | null;
  vivaSessionId: string;
};

export type RecordAskedQuestionInput = {
  questionText: string;
  vivaQuestionId: string | null;
  vivaSessionId: string;
};

export type AskedQuestionRepository = {
  findByVivaQuestionId: (
    vivaSessionId: string,
    vivaQuestionId: string,
  ) => Promise<AskedQuestionRecord | null>;
  insert: (input: RecordAskedQuestionInput) => Promise<AskedQuestionRecord>;
};

export type RecordAskedQuestionResult =
  | { askedQuestion: AskedQuestionRecord; outcome: "already_asked" }
  | { askedQuestion: AskedQuestionRecord; outcome: "recorded" };

// Idempotent for planned questions: asking the same planned question twice
// returns the existing Asked Question rather than creating a duplicate.
// Unplanned follow-ups always create a new entry.
export async function recordAskedQuestion(
  input: RecordAskedQuestionInput,
  repository: AskedQuestionRepository,
): Promise<RecordAskedQuestionResult> {
  if (input.vivaQuestionId) {
    const existing = await repository.findByVivaQuestionId(
      input.vivaSessionId,
      input.vivaQuestionId,
    );

    if (existing) {
      return { askedQuestion: existing, outcome: "already_asked" };
    }
  }

  const askedQuestion = await repository.insert(input);

  return { askedQuestion, outcome: "recorded" };
}

export function filterUnaskedPlannedQuestions<T extends { id: string }>(
  plannedQuestions: readonly T[],
  askedQuestions: ReadonlyArray<{ vivaQuestionId: string | null }>,
): T[] {
  const askedVivaQuestionIds = new Set(
    askedQuestions
      .map((askedQuestion) => askedQuestion.vivaQuestionId)
      .filter((id): id is string => id !== null),
  );

  return plannedQuestions.filter(
    (question) => !askedVivaQuestionIds.has(question.id),
  );
}

export type ObservationRecord = {
  askedQuestionId: string;
  content: string;
  createdAt: string;
  teacherId: string;
  updatedAt: string;
};

export type ObservationRepository = {
  save: (askedQuestionId: string, content: string) => Promise<ObservationRecord>;
};

export type SaveObservationResult =
  | { observation: ObservationRecord; outcome: "saved" }
  | { outcome: "rejected"; reason: string };

export function validateObservationContent(content: string): string | null {
  if (content.trim().length === 0) {
    return "Enter an observation before saving.";
  }

  return null;
}

export async function saveObservation(
  askedQuestionId: string,
  content: string,
  repository: ObservationRepository,
): Promise<SaveObservationResult> {
  const validationError = validateObservationContent(content);

  if (validationError) {
    return { outcome: "rejected", reason: validationError };
  }

  const observation = await repository.save(askedQuestionId, content);

  return { observation, outcome: "saved" };
}

export type EvidenceMarkerRecord = {
  askedQuestionId: string;
  createdAt: string;
  markerType: EvidenceMarkerType;
  teacherId: string;
  updatedAt: string;
};

export type EvidenceMarkerRepository = {
  save: (
    askedQuestionId: string,
    markerType: EvidenceMarkerType,
  ) => Promise<EvidenceMarkerRecord>;
};

export async function applyEvidenceMarker(
  askedQuestionId: string,
  markerType: EvidenceMarkerType,
  repository: EvidenceMarkerRepository,
): Promise<EvidenceMarkerRecord> {
  return repository.save(askedQuestionId, markerType);
}

type AskedQuestionRow = {
  asked_at: string;
  id: string;
  is_unplanned: boolean;
  question_text: string;
  viva_question_id: string | null;
  viva_session_id: string;
};

function mapAskedQuestionRow(row: AskedQuestionRow): AskedQuestionRecord {
  return {
    askedAt: row.asked_at,
    id: row.id,
    isUnplanned: row.is_unplanned,
    questionText: row.question_text,
    vivaQuestionId: row.viva_question_id,
    vivaSessionId: row.viva_session_id,
  };
}

const ASKED_QUESTION_COLUMNS =
  "id, viva_session_id, viva_question_id, question_text, is_unplanned, asked_at";

export function createSupabaseAskedQuestionRepository(
  supabase: SupabaseClient,
): AskedQuestionRepository {
  return {
    async findByVivaQuestionId(vivaSessionId, vivaQuestionId) {
      const { data, error } = await supabase
        .from("asked_questions")
        .select(ASKED_QUESTION_COLUMNS)
        .eq("viva_session_id", vivaSessionId)
        .eq("viva_question_id", vivaQuestionId);

      if (error) {
        throw new Error("We could not check for that Asked Question.");
      }

      const row = (data as AskedQuestionRow[] | null)?.[0];

      return row ? mapAskedQuestionRow(row) : null;
    },
    async insert(input) {
      const { data, error } = await supabase
        .from("asked_questions")
        .insert({
          question_text: input.questionText,
          viva_question_id: input.vivaQuestionId,
          viva_session_id: input.vivaSessionId,
        })
        .select(ASKED_QUESTION_COLUMNS);

      if (error) {
        throw new Error("We could not record that Asked Question.");
      }

      const row = (data as AskedQuestionRow[] | null)?.[0];

      if (!row) {
        throw new Error("We could not record that Asked Question.");
      }

      return mapAskedQuestionRow(row);
    },
  };
}

type ObservationRow = {
  asked_question_id: string;
  content: string;
  created_at: string;
  teacher_id: string;
  updated_at: string;
};

function mapObservationRow(row: ObservationRow): ObservationRecord {
  return {
    askedQuestionId: row.asked_question_id,
    content: row.content,
    createdAt: row.created_at,
    teacherId: row.teacher_id,
    updatedAt: row.updated_at,
  };
}

const OBSERVATION_COLUMNS =
  "asked_question_id, content, teacher_id, created_at, updated_at";

export function createSupabaseObservationRepository(
  supabase: SupabaseClient,
): ObservationRepository {
  return {
    async save(askedQuestionId, content) {
      const { data, error } = await supabase
        .from("observations")
        .upsert(
          {
            asked_question_id: askedQuestionId,
            content,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "asked_question_id" },
        )
        .select(OBSERVATION_COLUMNS);

      if (error) {
        throw new Error("We could not save your Observation.");
      }

      const row = (data as ObservationRow[] | null)?.[0];

      if (!row) {
        throw new Error("We could not save your Observation.");
      }

      return mapObservationRow(row);
    },
  };
}

type EvidenceMarkerRow = {
  asked_question_id: string;
  created_at: string;
  marker_type: EvidenceMarkerType;
  teacher_id: string;
  updated_at: string;
};

function mapEvidenceMarkerRow(row: EvidenceMarkerRow): EvidenceMarkerRecord {
  return {
    askedQuestionId: row.asked_question_id,
    createdAt: row.created_at,
    markerType: row.marker_type,
    teacherId: row.teacher_id,
    updatedAt: row.updated_at,
  };
}

const EVIDENCE_MARKER_COLUMNS =
  "asked_question_id, marker_type, teacher_id, created_at, updated_at";

export function createSupabaseEvidenceMarkerRepository(
  supabase: SupabaseClient,
): EvidenceMarkerRepository {
  return {
    async save(askedQuestionId, markerType) {
      const { data, error } = await supabase
        .from("evidence_markers")
        .upsert(
          {
            asked_question_id: askedQuestionId,
            marker_type: markerType,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "asked_question_id" },
        )
        .select(EVIDENCE_MARKER_COLUMNS);

      if (error) {
        throw new Error("We could not save the Evidence Marker.");
      }

      const row = (data as EvidenceMarkerRow[] | null)?.[0];

      if (!row) {
        throw new Error("We could not save the Evidence Marker.");
      }

      return mapEvidenceMarkerRow(row);
    },
  };
}
