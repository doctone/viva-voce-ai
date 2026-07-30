import { getSupabaseBrowserClient } from "../../../utils/supabase-browser";
import type { EvidenceMarkerType } from "../../../features/submissions/vivaSessionCapture";
import type { CaptureAskedQuestion } from "./-VivaSessionCapturePanel";

type CaptureAskedQuestionRow = {
  id: string;
  is_unplanned: boolean;
  question_text: string;
  viva_question_id: string | null;
};

type CaptureObservationRow = {
  asked_question_id: string;
  content: string;
};

type CaptureEvidenceMarkerRow = {
  asked_question_id: string;
  marker_type: EvidenceMarkerType;
};

export async function fetchCaptureAskedQuestions(
  vivaSessionId: string,
): Promise<CaptureAskedQuestion[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("asked_questions")
    .select("id, question_text, is_unplanned, viva_question_id, asked_at")
    .eq("viva_session_id", vivaSessionId)
    .order("asked_at", { ascending: true });

  if (error) {
    throw new Error("We could not load Asked Questions.");
  }

  const rows = (data as CaptureAskedQuestionRow[] | null) ?? [];

  if (rows.length === 0) {
    return [];
  }

  const askedQuestionIds = rows.map((row) => row.id);

  const [observationsResult, evidenceMarkersResult] = await Promise.all([
    supabase
      .from("observations")
      .select("asked_question_id, content")
      .in("asked_question_id", askedQuestionIds),
    supabase
      .from("evidence_markers")
      .select("asked_question_id, marker_type")
      .in("asked_question_id", askedQuestionIds),
  ]);

  if (observationsResult.error || evidenceMarkersResult.error) {
    throw new Error("We could not load Observations and Evidence Markers.");
  }

  const observationsByAskedQuestionId = new Map(
    ((observationsResult.data as CaptureObservationRow[] | null) ?? []).map(
      (row) => [row.asked_question_id, row.content] as const,
    ),
  );
  const evidenceMarkersByAskedQuestionId = new Map(
    (
      (evidenceMarkersResult.data as CaptureEvidenceMarkerRow[] | null) ?? []
    ).map((row) => [row.asked_question_id, row.marker_type] as const),
  );

  return rows.map((row) => {
    const observationContent = observationsByAskedQuestionId.get(row.id);
    const evidenceMarkerType = evidenceMarkersByAskedQuestionId.get(row.id);

    return {
      evidenceMarker:
        evidenceMarkerType !== undefined
          ? { markerType: evidenceMarkerType }
          : null,
      id: row.id,
      isUnplanned: row.is_unplanned,
      observation:
        observationContent !== undefined
          ? { content: observationContent }
          : null,
      questionText: row.question_text,
      vivaQuestionId: row.viva_question_id,
    };
  });
}
