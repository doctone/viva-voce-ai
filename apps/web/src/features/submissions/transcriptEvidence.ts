import type { SupabaseClient } from "@supabase/supabase-js";
import { isUncertain } from "./recordingTranscript";
import type { QuestionWindow } from "./talkTime";

export type EvidenceStatus = "pending" | "accepted" | "amended" | "rejected";

export type EvidenceSegment = {
  confidence: number | null;
  endSeconds: number;
  id: string;
  startSeconds: number;
  text: string;
};

export type TranscriptEvidence = {
  askedEntryId: string;
  excerpt: string;
  id: string;
  /** `suggested` came from the system; `teacher` was written by the teacher. */
  origin: "suggested" | "teacher";
  segmentId: string;
  status: EvidenceStatus;
  /** What the system proposed, kept after the teacher amends the excerpt. */
  suggestedExcerpt: string | null;
  teacherId: string;
};

export type NewSuggestion = {
  askedEntryId: string;
  excerpt: string;
  segmentId: string;
};

export type AskedQuestionRef = { authorId: string; id: string };

export type Requester = { userId: string | null };

export type TranscriptEvidenceRepository = {
  findAskedQuestion: (id: string) => Promise<AskedQuestionRef | null>;
  findEvidence: (id: string) => Promise<TranscriptEvidence | null>;
  findSegment: (id: string) => Promise<EvidenceSegment | null>;
  insertEvidence: (
    evidence: Omit<TranscriptEvidence, "id">,
  ) => Promise<TranscriptEvidence>;
  /** Suggestions already made, including rejected ones, so none is repeated. */
  listSuggestedSegmentIds: (askedEntryId: string) => Promise<string[]>;
  updateEvidence: (
    id: string,
    changes: { excerpt?: string; status: EvidenceStatus },
  ) => Promise<TranscriptEvidence>;
};

export type EvidenceFailure =
  | { outcome: "unauthorized" }
  | { outcome: "not_found" }
  | { outcome: "excerpt_not_in_segment" }
  | { outcome: "empty_excerpt" }
  | { outcome: "not_a_suggestion" };

export type EvidenceResult =
  | { evidence: TranscriptEvidence; outcome: "ok" }
  | EvidenceFailure;

function normalise(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

/** An excerpt is grounded only if it is words the transcript actually contains. */
export function isGroundedIn(excerpt: string, segmentText: string): boolean {
  const needle = normalise(excerpt);

  return needle !== "" && normalise(segmentText).includes(needle);
}

/**
 * Proposes evidence from the transcript: each segment that starts inside an
 * Asked Question's window becomes one suggestion quoting that segment. Segments
 * the transcription service was unsure of are never suggested, since a
 * misheard line is not evidence about the student.
 */
export function suggestEvidence(
  windows: readonly QuestionWindow[],
  segments: readonly EvidenceSegment[],
): NewSuggestion[] {
  return windows.flatMap((window) =>
    segments
      .filter((segment) => {
        const startMs = segment.startSeconds * 1000;

        return (
          startMs >= window.startMs &&
          (window.endMs === null || startMs < window.endMs) &&
          !isUncertain(segment) &&
          segment.text.trim() !== ""
        );
      })
      .map((segment) => ({
        askedEntryId: window.id,
        excerpt: segment.text.trim(),
        segmentId: segment.id,
      })),
  );
}

/**
 * Whether evidence can be relied on without checking the audio. Evidence from
 * an uncertain segment is shown as unverified, even once the teacher accepts it.
 */
export function isReliable(
  evidence: Pick<TranscriptEvidence, "status">,
  segment: EvidenceSegment,
): boolean {
  return evidence.status !== "rejected" && !isUncertain(segment);
}

export type SuggestResult =
  | { created: TranscriptEvidence[]; outcome: "ok" }
  | EvidenceFailure;

/** Stores suggestions as pending evidence. Safe to repeat: nothing is suggested twice. */
export async function saveSuggestions(
  suggestions: readonly NewSuggestion[],
  requester: Requester,
  repository: TranscriptEvidenceRepository,
): Promise<SuggestResult> {
  const { userId } = requester;

  if (!userId) {
    return { outcome: "unauthorized" };
  }

  const created: TranscriptEvidence[] = [];
  const known = new Map<string, Set<string>>();

  for (const suggestion of suggestions) {
    const asked = await repository.findAskedQuestion(suggestion.askedEntryId);

    if (!asked) {
      return { outcome: "not_found" };
    }

    if (asked.authorId !== userId) {
      return { outcome: "unauthorized" };
    }

    const segment = await repository.findSegment(suggestion.segmentId);

    if (!segment) {
      return { outcome: "not_found" };
    }

    // Re-check on the server: grounding and certainty must not depend on the caller.
    if (isUncertain(segment) || !isGroundedIn(suggestion.excerpt, segment.text)) {
      continue;
    }

    if (!known.has(asked.id)) {
      known.set(
        asked.id,
        new Set(await repository.listSuggestedSegmentIds(asked.id)),
      );
    }

    const seen = known.get(asked.id) as Set<string>;

    if (seen.has(segment.id)) {
      continue;
    }

    seen.add(segment.id);
    created.push(
      await repository.insertEvidence({
        askedEntryId: asked.id,
        excerpt: suggestion.excerpt,
        origin: "suggested",
        segmentId: segment.id,
        status: "pending",
        suggestedExcerpt: suggestion.excerpt,
        teacherId: userId,
      }),
    );
  }

  return { created, outcome: "ok" };
}

/** The teacher writes their own evidence, citing a segment of the transcript. */
export async function addEvidence(
  input: { askedEntryId: string; excerpt: string; segmentId: string },
  requester: Requester,
  repository: TranscriptEvidenceRepository,
): Promise<EvidenceResult> {
  const { userId } = requester;

  if (!userId) {
    return { outcome: "unauthorized" };
  }

  const asked = await repository.findAskedQuestion(input.askedEntryId);

  if (!asked) {
    return { outcome: "not_found" };
  }

  if (asked.authorId !== userId) {
    return { outcome: "unauthorized" };
  }

  const segment = await repository.findSegment(input.segmentId);

  if (!segment) {
    return { outcome: "not_found" };
  }

  if (input.excerpt.trim() === "") {
    return { outcome: "empty_excerpt" };
  }

  if (!isGroundedIn(input.excerpt, segment.text)) {
    return { outcome: "excerpt_not_in_segment" };
  }

  return {
    evidence: await repository.insertEvidence({
      askedEntryId: asked.id,
      excerpt: input.excerpt.trim(),
      origin: "teacher",
      segmentId: segment.id,
      status: "accepted",
      suggestedExcerpt: null,
      teacherId: userId,
    }),
    outcome: "ok",
  };
}

export type ReviewAction =
  | { kind: "accept" }
  | { kind: "reject" }
  | { excerpt: string; kind: "amend" };

/**
 * The teacher's decision on a suggestion. Only suggestions are reviewed:
 * teacher-authored evidence is already the teacher's own. A decision can be
 * changed later, but a suggestion never returns to pending.
 */
export async function reviewEvidence(
  evidenceId: string,
  action: ReviewAction,
  requester: Requester,
  repository: TranscriptEvidenceRepository,
): Promise<EvidenceResult> {
  const { userId } = requester;

  if (!userId) {
    return { outcome: "unauthorized" };
  }

  const evidence = await repository.findEvidence(evidenceId);

  if (!evidence) {
    return { outcome: "not_found" };
  }

  if (evidence.teacherId !== userId) {
    return { outcome: "unauthorized" };
  }

  if (evidence.origin !== "suggested") {
    return { outcome: "not_a_suggestion" };
  }

  if (action.kind === "reject") {
    return {
      evidence: await repository.updateEvidence(evidence.id, {
        status: "rejected",
      }),
      outcome: "ok",
    };
  }

  if (action.kind === "accept") {
    return {
      evidence: await repository.updateEvidence(evidence.id, {
        // Accepting restores the proposal if an earlier amendment replaced it.
        excerpt: evidence.suggestedExcerpt ?? evidence.excerpt,
        status: "accepted",
      }),
      outcome: "ok",
    };
  }

  if (action.excerpt.trim() === "") {
    return { outcome: "empty_excerpt" };
  }

  const segment = await repository.findSegment(evidence.segmentId);

  if (!segment) {
    return { outcome: "not_found" };
  }

  if (!isGroundedIn(action.excerpt, segment.text)) {
    return { outcome: "excerpt_not_in_segment" };
  }

  return {
    evidence: await repository.updateEvidence(evidence.id, {
      excerpt: action.excerpt.trim(),
      status: "amended",
    }),
    outcome: "ok",
  };
}

// --- Supabase ---------------------------------------------------------------

type EvidenceRow = {
  asked_entry_id: string;
  excerpt: string;
  id: string;
  origin: "suggested" | "teacher";
  segment_id: string;
  status: EvidenceStatus;
  suggested_excerpt: string | null;
  teacher_id: string;
};

const EVIDENCE_COLUMNS =
  "id, asked_entry_id, segment_id, teacher_id, origin, status, excerpt, suggested_excerpt";

function mapEvidence(row: EvidenceRow): TranscriptEvidence {
  return {
    askedEntryId: row.asked_entry_id,
    excerpt: row.excerpt,
    id: row.id,
    origin: row.origin,
    segmentId: row.segment_id,
    status: row.status,
    suggestedExcerpt: row.suggested_excerpt,
    teacherId: row.teacher_id,
  };
}

export function createSupabaseTranscriptEvidenceRepository(
  supabase: SupabaseClient,
): TranscriptEvidenceRepository {
  return {
    async findAskedQuestion(id) {
      const { data, error } = await supabase
        .from("thread_entries")
        .select("id, author_id")
        .eq("id", id)
        .eq("kind", "asked")
        .maybeSingle();

      if (error) {
        throw new Error("We could not load that Asked Question.");
      }

      return data
        ? { authorId: data.author_id as string, id: data.id as string }
        : null;
    },

    async findEvidence(id) {
      const { data, error } = await supabase
        .from("viva_transcript_evidence")
        .select(EVIDENCE_COLUMNS)
        .eq("id", id)
        .maybeSingle();

      if (error) {
        throw new Error("We could not load that evidence.");
      }

      return data ? mapEvidence(data as EvidenceRow) : null;
    },

    async findSegment(id) {
      const { data, error } = await supabase
        .from("viva_recording_transcript_segments")
        .select("id, start_seconds, end_seconds, text, confidence")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        throw new Error("We could not load that transcript segment.");
      }

      return data
        ? {
            confidence: data.confidence as number | null,
            endSeconds: data.end_seconds as number,
            id: data.id as string,
            startSeconds: data.start_seconds as number,
            text: data.text as string,
          }
        : null;
    },

    async insertEvidence(evidence) {
      const { data, error } = await supabase
        .from("viva_transcript_evidence")
        .insert({
          asked_entry_id: evidence.askedEntryId,
          excerpt: evidence.excerpt,
          origin: evidence.origin,
          segment_id: evidence.segmentId,
          status: evidence.status,
          suggested_excerpt: evidence.suggestedExcerpt,
          teacher_id: evidence.teacherId,
        })
        .select(EVIDENCE_COLUMNS)
        .single();

      if (error || !data) {
        throw new Error("We could not save that evidence.");
      }

      return mapEvidence(data as EvidenceRow);
    },

    async listSuggestedSegmentIds(askedEntryId) {
      const { data, error } = await supabase
        .from("viva_transcript_evidence")
        .select("segment_id")
        .eq("asked_entry_id", askedEntryId)
        .eq("origin", "suggested");

      if (error) {
        throw new Error("We could not load the existing suggestions.");
      }

      return ((data as Array<{ segment_id: string }> | null) ?? []).map(
        (row) => row.segment_id,
      );
    },

    async updateEvidence(id, changes) {
      const { data, error } = await supabase
        .from("viva_transcript_evidence")
        .update({
          ...(changes.excerpt === undefined ? {} : { excerpt: changes.excerpt }),
          status: changes.status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select(EVIDENCE_COLUMNS)
        .single();

      if (error || !data) {
        throw new Error("We could not save that review.");
      }

      return mapEvidence(data as EvidenceRow);
    },
  };
}

/** The evidence for a viva's Asked Questions, for display next to the transcript. */
export async function fetchTranscriptEvidence(
  supabase: SupabaseClient,
  askedEntryIds: readonly string[],
): Promise<TranscriptEvidence[]> {
  if (askedEntryIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("viva_transcript_evidence")
    .select(EVIDENCE_COLUMNS)
    .in("asked_entry_id", [...askedEntryIds])
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error("We could not load the transcript evidence.");
  }

  return ((data as EvidenceRow[] | null) ?? []).map(mapEvidence);
}
