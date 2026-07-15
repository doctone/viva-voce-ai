import type { SupabaseClient } from "@supabase/supabase-js";
import { VIVA_RECORDING_BUCKET } from "./vivaRecordingAccess";

// MediaRecorder mimeType support varies by browser (iOS Safari only emits
// audio/mp4, not webm) so the caller must feature-detect via
// MediaRecorder.isTypeSupported rather than assuming one is available.
export const RECORDING_MIME_TYPE_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
] as const;

export function negotiateRecordingMimeType(
  isTypeSupported: (mimeType: string) => boolean,
  candidates: readonly string[] = RECORDING_MIME_TYPE_CANDIDATES,
): string | null {
  return candidates.find((candidate) => isTypeSupported(candidate)) ?? null;
}

function extensionForMimeType(mimeType: string): string {
  return mimeType.startsWith("audio/mp4") ? "m4a" : "webm";
}

export function buildRecordingChunkStoragePath(
  vivaSessionId: string,
  sequence: number,
  mimeType: string,
): string {
  const paddedSequence = String(sequence).padStart(5, "0");
  return `${vivaSessionId}/${paddedSequence}.${extensionForMimeType(mimeType)}`;
}

// Recording state machine. "permission_denied" is reachable only from
// "requesting_permission" so a teacher can retry the microphone prompt
// without losing the Viva Session itself (the session and the recording
// lifecycle are deliberately independent).
export type RecordingStatus =
  | "idle"
  | "paused"
  | "permission_denied"
  | "recording"
  | "requesting_permission"
  | "stopped";

export type RecordingEvent =
  | { type: "pause" }
  | { type: "permission_denied" }
  | { type: "permission_granted" }
  | { type: "resume" }
  | { type: "start_requested" }
  | { type: "stop" };

export function transitionRecordingStatus(
  current: RecordingStatus,
  event: RecordingEvent,
): RecordingStatus {
  switch (event.type) {
    case "start_requested":
      return current === "idle" || current === "permission_denied"
        ? "requesting_permission"
        : current;
    case "permission_granted":
      return current === "requesting_permission" ? "recording" : current;
    case "permission_denied":
      return current === "requesting_permission"
        ? "permission_denied"
        : current;
    case "pause":
      return current === "recording" ? "paused" : current;
    case "resume":
      return current === "paused" ? "recording" : current;
    case "stop":
      return current === "recording" || current === "paused"
        ? "stopped"
        : current;
    default:
      return current;
  }
}

export type RecordingChunkRecord = {
  createdAt: string;
  id: string;
  mimeType: string;
  sequence: number;
  storagePath: string;
  vivaSessionId: string;
};

export type UploadRecordingChunkInput = {
  blob: Blob;
  mimeType: string;
  sequence: number;
  vivaSessionId: string;
};

export type RecordingChunkRepository = {
  insertChunkRecord: (input: {
    mimeType: string;
    sequence: number;
    storagePath: string;
    vivaSessionId: string;
  }) => Promise<RecordingChunkRecord>;
  uploadBlob: (
    path: string,
    blob: Blob,
  ) => Promise<{ errorMessage: string | null }>;
};

export type UploadRecordingChunkResult =
  | { chunk: RecordingChunkRecord; outcome: "uploaded" }
  | { outcome: "failed"; reason: string };

// Uploads (or safely retries) a single recorded timeslice. The storage path
// is deterministic from (session, sequence) and the blob upload is an
// upsert, so re-running this after a partial failure is always safe: it
// never re-records audio and never creates a duplicate chunk.
export async function uploadRecordingChunk(
  input: UploadRecordingChunkInput,
  repository: RecordingChunkRepository,
): Promise<UploadRecordingChunkResult> {
  const storagePath = buildRecordingChunkStoragePath(
    input.vivaSessionId,
    input.sequence,
    input.mimeType,
  );

  const uploadOutcome = await repository.uploadBlob(storagePath, input.blob);

  if (uploadOutcome.errorMessage) {
    return { outcome: "failed", reason: uploadOutcome.errorMessage };
  }

  try {
    const chunk = await repository.insertChunkRecord({
      mimeType: input.mimeType,
      sequence: input.sequence,
      storagePath,
      vivaSessionId: input.vivaSessionId,
    });

    return { chunk, outcome: "uploaded" };
  } catch (error) {
    return {
      outcome: "failed",
      reason:
        error instanceof Error
          ? error.message
          : "We could not save that recording chunk.",
    };
  }
}

export type ChunkUploadTrackerState = {
  failedSequences: readonly number[];
  uploadedSequences: readonly number[];
};

export const INITIAL_CHUNK_UPLOAD_TRACKER_STATE: ChunkUploadTrackerState = {
  failedSequences: [],
  uploadedSequences: [],
};

// Tracks which timeslices still need a retry so the UI can surface an
// upload-retry affordance instead of silently dropping audio.
export function applyChunkUploadResult(
  state: ChunkUploadTrackerState,
  sequence: number,
  result: UploadRecordingChunkResult,
): ChunkUploadTrackerState {
  const failedSequences = state.failedSequences.filter(
    (existing) => existing !== sequence,
  );
  const uploadedSequences = state.uploadedSequences.filter(
    (existing) => existing !== sequence,
  );

  if (result.outcome === "failed") {
    return {
      failedSequences: [...failedSequences, sequence],
      uploadedSequences,
    };
  }

  return {
    failedSequences,
    uploadedSequences: [...uploadedSequences, sequence],
  };
}

export function formatSessionProgress(
  currentIndex: number,
  totalQuestions: number,
): string {
  if (totalQuestions === 0) {
    return "No planned questions in this Viva Question Set.";
  }

  return `Question ${currentIndex + 1} of ${totalQuestions}`;
}

export function clampQuestionIndex(
  index: number,
  totalQuestions: number,
): number {
  if (totalQuestions <= 0) {
    return 0;
  }

  return Math.min(Math.max(index, 0), totalQuestions - 1);
}

export function computeElapsedSeconds(startedAt: string, now: Date): number {
  const startedAtMs = new Date(startedAt).getTime();

  return Math.max(0, (now.getTime() - startedAtMs) / 1000);
}

export function formatElapsedDuration(elapsedSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(elapsedSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

type RecordingChunkRow = {
  created_at: string;
  id: string;
  mime_type: string;
  sequence: number;
  storage_path: string;
  viva_session_id: string;
};

function mapRecordingChunkRow(row: RecordingChunkRow): RecordingChunkRecord {
  return {
    createdAt: row.created_at,
    id: row.id,
    mimeType: row.mime_type,
    sequence: row.sequence,
    storagePath: row.storage_path,
    vivaSessionId: row.viva_session_id,
  };
}

const RECORDING_CHUNK_COLUMNS =
  "id, viva_session_id, sequence, storage_path, mime_type, created_at";

const UNIQUE_VIOLATION_CODE = "23505";

export function createSupabaseRecordingChunkRepository(
  supabase: SupabaseClient,
): RecordingChunkRepository {
  return {
    async insertChunkRecord(input) {
      const { data, error } = await supabase
        .from("viva_recording_chunks")
        .insert({
          mime_type: input.mimeType,
          sequence: input.sequence,
          storage_path: input.storagePath,
          viva_session_id: input.vivaSessionId,
        })
        .select(RECORDING_CHUNK_COLUMNS);

      if (error) {
        if (error.code === UNIQUE_VIOLATION_CODE) {
          const { data: existingData, error: existingError } = await supabase
            .from("viva_recording_chunks")
            .select(RECORDING_CHUNK_COLUMNS)
            .eq("viva_session_id", input.vivaSessionId)
            .eq("sequence", input.sequence);

          const existingRow = (existingData as RecordingChunkRow[] | null)?.[0];

          if (!existingError && existingRow) {
            return mapRecordingChunkRow(existingRow);
          }
        }

        throw new Error("We could not save that recording chunk.");
      }

      const row = (data as RecordingChunkRow[] | null)?.[0];

      if (!row) {
        throw new Error("We could not save that recording chunk.");
      }

      return mapRecordingChunkRow(row);
    },
    async uploadBlob(path, blob) {
      const { error } = await supabase.storage
        .from(VIVA_RECORDING_BUCKET)
        .upload(path, blob, { upsert: true });

      return { errorMessage: error?.message ?? null };
    },
  };
}
