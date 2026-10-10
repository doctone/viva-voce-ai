import type { SupabaseClient } from "@supabase/supabase-js";
import { VIVA_RECORDING_BUCKET } from "./vivaRecordingAccess";

export type TranscriptionStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed";

export type TranscriptionJob = {
  attempts: number;
  durationSeconds: number | null;
  errorMessage: string | null;
  id: string;
  status: TranscriptionStatus;
};

export type RecordingTranscriptSegment = {
  /** 0-1 as estimated by the transcription service; null when unreported. */
  confidence: number | null;
  endSeconds: number;
  startSeconds: number;
  text: string;
};

export type TranscribedRecording = {
  durationSeconds: number | null;
  segments: RecordingTranscriptSegment[];
};

export type TranscribeRecording = (input: {
  audio: Blob;
  fileName: string;
}) => Promise<TranscribedRecording>;

export type RecordingRef = { audioPath: string; fileName: string };

export type RecordingTranscriptionRepository = {
  /** Atomically moves a queued/failed job to processing; false if it lost the race. */
  claimJob: (jobId: string) => Promise<boolean>;
  downloadAudio: (audioPath: string) => Promise<Blob | null>;
  /** Creates the job, or returns the existing one for this recording. */
  findOrCreateJob: (submissionVivaId: string) => Promise<TranscriptionJob>;
  findRecording: (submissionVivaId: string) => Promise<RecordingRef | null>;
  markCompleted: (jobId: string, durationSeconds: number | null) => Promise<void>;
  markFailed: (jobId: string, errorMessage: string) => Promise<void>;
  /** Puts a failed job back in the queue. */
  requeue: (job: TranscriptionJob) => Promise<TranscriptionJob>;
  replaceSegments: (
    jobId: string,
    segments: readonly RecordingTranscriptSegment[],
  ) => Promise<void>;
};

export type EnqueueResult =
  | { job: TranscriptionJob; outcome: "queued" | "unchanged" }
  | { outcome: "missing_recording" }
  | { outcome: "unauthorized" };

export type ProcessResult =
  | { outcome: "completed" }
  | { outcome: "not_runnable"; status: TranscriptionStatus }
  | { outcome: "failed"; errorMessage: string }
  | { outcome: "missing_recording" }
  | { outcome: "unauthorized" };

export type Requester = { userId: string | null };

/**
 * Queues transcription for a recording. Safe to call repeatedly: a job that is
 * already queued, running or finished is returned as is, and only a failed job
 * is put back in the queue (the retry path).
 */
export async function enqueueRecordingTranscription(
  submissionVivaId: string,
  requester: Requester,
  repository: RecordingTranscriptionRepository,
): Promise<EnqueueResult> {
  if (!requester.userId) {
    return { outcome: "unauthorized" };
  }

  if (!(await repository.findRecording(submissionVivaId))) {
    return { outcome: "missing_recording" };
  }

  const job = await repository.findOrCreateJob(submissionVivaId);

  if (job.status === "failed") {
    return { job: await repository.requeue(job), outcome: "queued" };
  }

  return { job, outcome: "unchanged" };
}

/**
 * Runs a queued job. Every failure is recorded on the job as a value rather
 * than thrown: a transcript is supporting material, and its failure must never
 * stand between the teacher and the recording they are reviewing.
 */
export async function processRecordingTranscription(
  submissionVivaId: string,
  requester: Requester,
  repository: RecordingTranscriptionRepository,
  transcribe: TranscribeRecording,
): Promise<ProcessResult> {
  if (!requester.userId) {
    return { outcome: "unauthorized" };
  }

  const recording = await repository.findRecording(submissionVivaId);

  if (!recording) {
    return { outcome: "missing_recording" };
  }

  const job = await repository.findOrCreateJob(submissionVivaId);

  if (job.status !== "queued") {
    return { outcome: "not_runnable", status: job.status };
  }

  if (!(await repository.claimJob(job.id))) {
    return { outcome: "not_runnable", status: "processing" };
  }

  try {
    const audio = await repository.downloadAudio(recording.audioPath);

    if (!audio) {
      throw new Error("The recording's audio could not be found.");
    }

    const result = await transcribe({ audio, fileName: recording.fileName });

    await repository.replaceSegments(job.id, result.segments);
    await repository.markCompleted(job.id, result.durationSeconds);

    return { outcome: "completed" };
  } catch (error) {
    const errorMessage =
      error instanceof Error && error.message
        ? error.message
        : "We could not transcribe this recording.";

    await repository.markFailed(job.id, errorMessage);

    return { errorMessage, outcome: "failed" };
  }
}

// --- Reading the transcript -------------------------------------------------

export const UNCERTAIN_CONFIDENCE_THRESHOLD = 0.6;
const MOSTLY_SILENT_COVERAGE = 0.3;
const MANY_UNCERTAIN_SHARE = 0.4;

export function isUncertain(segment: RecordingTranscriptSegment): boolean {
  return (
    segment.confidence !== null &&
    segment.confidence < UNCERTAIN_CONFIDENCE_THRESHOLD
  );
}

export type RecordingQualityWarning =
  | { kind: "no_speech"; message: string }
  | { kind: "mostly_silent"; message: string }
  | { kind: "low_confidence"; message: string };

/** Problems with the audio itself, so a thin transcript is not mistaken for a thin answer. */
export function assessRecordingQuality(
  segments: readonly RecordingTranscriptSegment[],
  durationSeconds: number | null,
): RecordingQualityWarning[] {
  if (segments.length === 0) {
    return [
      {
        kind: "no_speech",
        message: "No speech was detected in this recording.",
      },
    ];
  }

  const warnings: RecordingQualityWarning[] = [];
  const spoken = segments.reduce(
    (total, segment) => total + (segment.endSeconds - segment.startSeconds),
    0,
  );

  if (
    durationSeconds !== null &&
    durationSeconds > 0 &&
    spoken / durationSeconds < MOSTLY_SILENT_COVERAGE
  ) {
    warnings.push({
      kind: "mostly_silent",
      message:
        "Most of this recording is silent or inaudible, so the transcript may be incomplete.",
    });
  }

  if (segments.filter(isUncertain).length / segments.length >= MANY_UNCERTAIN_SHARE) {
    warnings.push({
      kind: "low_confidence",
      message:
        "Much of this recording was hard to transcribe. Check the audio before relying on the text.",
    });
  }

  return warnings;
}

/** Indexes of segments containing the query, case-insensitively. */
export function searchTranscript(
  segments: readonly RecordingTranscriptSegment[],
  query: string,
): number[] {
  const needle = query.trim().toLowerCase();

  if (needle === "") {
    return [];
  }

  return segments.flatMap((segment, index) =>
    segment.text.toLowerCase().includes(needle) ? [index] : [],
  );
}

/** The segment being spoken at `currentSeconds`, or -1 in a gap or before the start. */
export function findActiveSegmentIndex(
  segments: readonly RecordingTranscriptSegment[],
  currentSeconds: number,
): number {
  return segments.findIndex(
    (segment) =>
      currentSeconds >= segment.startSeconds &&
      currentSeconds < segment.endSeconds,
  );
}

export function formatTimestamp(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));

  return `${String(Math.floor(whole / 60)).padStart(2, "0")}:${String(whole % 60).padStart(2, "0")}`;
}

export function describeTranscriptionStatus(status: TranscriptionStatus): string {
  switch (status) {
    case "queued":
      return "Transcript queued";
    case "processing":
      return "Transcribing…";
    case "completed":
      return "Transcript ready";
    case "failed":
      return "Transcription failed";
  }
}

// --- Provider ---------------------------------------------------------------

type VerboseSegment = {
  avg_logprob?: number;
  end: number;
  no_speech_prob?: number;
  start: number;
  text: string;
};

/** Maps the provider's verbose_json response onto our segments. */
export function parseVerboseTranscription(json: {
  duration?: number;
  segments?: VerboseSegment[];
}): TranscribedRecording {
  const segments = (json.segments ?? [])
    .map((segment) => ({
      confidence:
        typeof segment.avg_logprob === "number"
          ? Math.min(1, Math.max(0, Math.exp(segment.avg_logprob)))
          : null,
      endSeconds: segment.end,
      startSeconds: segment.start,
      text: segment.text.trim(),
    }))
    .filter((segment) => segment.text !== "");

  return {
    durationSeconds: typeof json.duration === "number" ? json.duration : null,
    segments,
  };
}

const TRANSCRIPTION_ENDPOINT = "https://api.openai.com/v1/audio/transcriptions";

export function createTimedTranscriber(
  fetchImpl: typeof fetch = fetch,
): TranscribeRecording {
  return async ({ audio, fileName }) => {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not configured.");
    }

    const form = new FormData();
    form.append("file", audio, fileName);
    // Only whisper-1 returns per-segment timestamps and confidence.
    form.append("model", "whisper-1");
    form.append("response_format", "verbose_json");
    form.append("timestamp_granularities[]", "segment");

    const response = await fetchImpl(TRANSCRIPTION_ENDPOINT, {
      body: form,
      headers: { Authorization: `Bearer ${apiKey}` },
      method: "POST",
    });

    if (!response.ok) {
      throw new Error(`Transcription failed with status ${response.status}.`);
    }

    return parseVerboseTranscription(await response.json());
  };
}

// --- Supabase ---------------------------------------------------------------

type JobRow = {
  attempts: number;
  duration_seconds: number | null;
  error_message: string | null;
  id: string;
  status: TranscriptionStatus;
};

const JOB_COLUMNS = "id, status, attempts, error_message, duration_seconds";
const UNIQUE_VIOLATION_CODE = "23505";

function mapJob(row: JobRow): TranscriptionJob {
  return {
    attempts: row.attempts,
    durationSeconds: row.duration_seconds,
    errorMessage: row.error_message,
    id: row.id,
    status: row.status,
  };
}

export function createSupabaseRecordingTranscriptionRepository(
  supabase: SupabaseClient,
): RecordingTranscriptionRepository {
  async function findJob(submissionVivaId: string) {
    const { data } = await supabase
      .from("viva_recording_transcription_jobs")
      .select(JOB_COLUMNS)
      .eq("submission_viva_id", submissionVivaId);

    const row = (data as JobRow[] | null)?.[0];

    return row ? mapJob(row) : null;
  }

  return {
    claimJob: async (jobId) => {
      const { data } = await supabase
        .from("viva_recording_transcription_jobs")
        .update({
          status: "processing",
          updated_at: new Date().toISOString(),
        })
        .eq("id", jobId)
        .eq("status", "queued")
        .select("id");

      return ((data as unknown[] | null) ?? []).length > 0;
    },
    downloadAudio: async (audioPath) => {
      const { data, error } = await supabase.storage
        .from(VIVA_RECORDING_BUCKET)
        .download(audioPath);

      return error || !data ? null : data;
    },
    findOrCreateJob: async (submissionVivaId) => {
      const existing = await findJob(submissionVivaId);

      if (existing) {
        return existing;
      }

      const { data, error } = await supabase
        .from("viva_recording_transcription_jobs")
        .insert({ submission_viva_id: submissionVivaId })
        .select(JOB_COLUMNS);

      const row = (data as JobRow[] | null)?.[0];

      if (error?.code === UNIQUE_VIOLATION_CODE) {
        const raced = await findJob(submissionVivaId);

        if (raced) {
          return raced;
        }
      }

      if (error || !row) {
        throw new Error("We could not queue this transcript.");
      }

      return mapJob(row);
    },
    findRecording: async (submissionVivaId) => {
      const { data } = await supabase
        .from("submission_viva")
        .select("audio_path, file_name")
        .eq("id", submissionVivaId);

      const row = (
        data as Array<{ audio_path: string; file_name: string }> | null
      )?.[0];

      return row ? { audioPath: row.audio_path, fileName: row.file_name } : null;
    },
    markCompleted: async (jobId, durationSeconds) => {
      await supabase
        .from("viva_recording_transcription_jobs")
        .update({
          duration_seconds: durationSeconds,
          error_message: null,
          status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", jobId);
    },
    markFailed: async (jobId, errorMessage) => {
      await supabase
        .from("viva_recording_transcription_jobs")
        .update({
          error_message: errorMessage,
          status: "failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", jobId);
    },
    replaceSegments: async (jobId, segments) => {
      await supabase
        .from("viva_recording_transcript_segments")
        .delete()
        .eq("job_id", jobId);

      if (segments.length === 0) {
        return;
      }

      const { error } = await supabase
        .from("viva_recording_transcript_segments")
        .insert(
          segments.map((segment, position) => ({
            confidence: segment.confidence,
            end_seconds: segment.endSeconds,
            job_id: jobId,
            position,
            start_seconds: segment.startSeconds,
            text: segment.text,
          })),
        );

      if (error) {
        throw new Error("We could not save the transcript.");
      }
    },
    requeue: async (job) => {
      const { data } = await supabase
        .from("viva_recording_transcription_jobs")
        .update({
          attempts: job.attempts + 1,
          error_message: null,
          status: "queued",
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id)
        .eq("status", "failed")
        .select(JOB_COLUMNS);

      const row = (data as JobRow[] | null)?.[0];

      if (!row) {
        throw new Error("We could not retry this transcript.");
      }

      return mapJob(row);
    },
  };
}

// --- Browser reads ----------------------------------------------------------

export async function fetchRecordingTranscript(
  supabase: SupabaseClient,
  submissionVivaId: string,
): Promise<{
  job: TranscriptionJob | null;
  segments: RecordingTranscriptSegment[];
}> {
  const { data: jobData, error } = await supabase
    .from("viva_recording_transcription_jobs")
    .select(JOB_COLUMNS)
    .eq("submission_viva_id", submissionVivaId);

  if (error) {
    throw new Error("We could not load the transcript.");
  }

  const jobRow = (jobData as JobRow[] | null)?.[0];

  if (!jobRow) {
    return { job: null, segments: [] };
  }

  const job = mapJob(jobRow);

  if (job.status !== "completed") {
    return { job, segments: [] };
  }

  const { data, error: segmentsError } = await supabase
    .from("viva_recording_transcript_segments")
    .select("start_seconds, end_seconds, text, confidence")
    .eq("job_id", job.id)
    .order("position", { ascending: true });

  if (segmentsError) {
    throw new Error("We could not load the transcript.");
  }

  return {
    job,
    segments: (
      (data as Array<{
        confidence: number | null;
        end_seconds: number;
        start_seconds: number;
        text: string;
      }> | null) ?? []
    ).map((row) => ({
      confidence: row.confidence,
      endSeconds: row.end_seconds,
      startSeconds: row.start_seconds,
      text: row.text,
    })),
  };
}

/** Completed-transcript segments with their ids, so evidence can cite them. */
export async function fetchRecordingTranscriptSegmentsWithIds(
  supabase: SupabaseClient,
  submissionVivaId: string,
): Promise<
  Array<RecordingTranscriptSegment & { id: string }>
> {
  const { data: job, error } = await supabase
    .from("viva_recording_transcription_jobs")
    .select("id")
    .eq("submission_viva_id", submissionVivaId)
    .eq("status", "completed")
    .maybeSingle();

  if (error) {
    throw new Error("We could not load the transcript.");
  }

  if (!job) {
    return [];
  }

  const { data, error: segmentsError } = await supabase
    .from("viva_recording_transcript_segments")
    .select("id, start_seconds, end_seconds, text, confidence")
    .eq("job_id", job.id)
    .order("position", { ascending: true });

  if (segmentsError) {
    throw new Error("We could not load the transcript.");
  }

  return (
    (data as Array<{
      confidence: number | null;
      end_seconds: number;
      id: string;
      start_seconds: number;
      text: string;
    }> | null) ?? []
  ).map((row) => ({
    confidence: row.confidence,
    endSeconds: row.end_seconds,
    id: row.id,
    startSeconds: row.start_seconds,
    text: row.text,
  }));
}
