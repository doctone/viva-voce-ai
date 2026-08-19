import type { SupabaseClient } from "@supabase/supabase-js";
import { VIVA_RECORDING_BUCKET } from "./vivaRecordingAccess";

export type TranscribeVivaChunkInput = {
  sequence: number;
  vivaSessionId: string;
};

export type VivaChunkLocation = {
  mimeType: string;
  storagePath: string;
};

export type TranscriptSegment = {
  sequence: number;
  text: string;
};

export type VivaTranscriptionRepository = {
  downloadChunk: (storagePath: string) => Promise<Blob | null>;
  findChunk: (
    input: TranscribeVivaChunkInput,
  ) => Promise<VivaChunkLocation | null>;
  hasSegment: (input: TranscribeVivaChunkInput) => Promise<boolean>;
  saveSegment: (
    input: TranscribeVivaChunkInput & { text: string },
  ) => Promise<void>;
};

export type TranscribeAudio = (input: {
  audio: Blob;
  fileName: string;
}) => Promise<string>;

export type TranscribeVivaChunkResult =
  | { outcome: "transcribed"; text: string }
  | { outcome: "already_transcribed" }
  | { outcome: "silent" }
  | { outcome: "chunk_unavailable" }
  | { outcome: "failed"; errorMessage: string };

export function buildChunkFileName(
  input: TranscribeVivaChunkInput,
  mimeType: string,
): string {
  const extension = mimeType.startsWith("audio/mp4") ? "m4a" : "webm";

  return `${input.vivaSessionId}-${String(input.sequence).padStart(5, "0")}.${extension}`;
}

/**
 * One chunk in, one segment out.
 *
 * Every failure mode is a value rather than a throw: a viva is live while this
 * runs, and a transcription problem must never interrupt the recording that is
 * the actual evidence. A chunk that cannot be transcribed leaves a gap in the
 * text and nothing else.
 */
export async function transcribeVivaChunk(
  input: TranscribeVivaChunkInput,
  repository: VivaTranscriptionRepository,
  transcribeAudio: TranscribeAudio,
): Promise<TranscribeVivaChunkResult> {
  try {
    if (await repository.hasSegment(input)) {
      return { outcome: "already_transcribed" };
    }

    const chunk = await repository.findChunk(input);

    if (!chunk) {
      return { outcome: "chunk_unavailable" };
    }

    const audio = await repository.downloadChunk(chunk.storagePath);

    if (!audio) {
      return { outcome: "chunk_unavailable" };
    }

    const text = (
      await transcribeAudio({
        audio,
        fileName: buildChunkFileName(input, chunk.mimeType),
      })
    ).trim();

    // Silence transcribes to an empty string, or to a hallucinated filler the
    // model emits when there is nothing to hear. An empty segment would only
    // add a gap to the transcript, so it is never stored.
    if (text === "") {
      return { outcome: "silent" };
    }

    await repository.saveSegment({ ...input, text });

    return { outcome: "transcribed", text };
  } catch (error) {
    return {
      errorMessage:
        error instanceof Error
          ? error.message
          : "We could not transcribe this part of the viva.",
      outcome: "failed",
    };
  }
}

/** Joins segments into readable text, in spoken order regardless of arrival order. */
export function assembleTranscript(
  segments: readonly TranscriptSegment[],
): string {
  return [...segments]
    .sort((left, right) => left.sequence - right.sequence)
    .map((segment) => segment.text.trim())
    .filter((text) => text !== "")
    .join(" ");
}

export function createSupabaseVivaTranscriptionRepository(
  supabase: SupabaseClient,
): VivaTranscriptionRepository {
  return {
    downloadChunk: async (storagePath) => {
      const { data, error } = await supabase.storage
        .from(VIVA_RECORDING_BUCKET)
        .download(storagePath);

      if (error || !data) {
        return null;
      }

      return data;
    },
    findChunk: async ({ sequence, vivaSessionId }) => {
      const { data, error } = await supabase
        .from("viva_recording_chunks")
        .select("storage_path, mime_type")
        .eq("viva_session_id", vivaSessionId)
        .eq("sequence", sequence);

      const row = (
        data as Array<{ mime_type: string; storage_path: string }> | null
      )?.[0];

      if (error || !row) {
        return null;
      }

      return { mimeType: row.mime_type, storagePath: row.storage_path };
    },
    hasSegment: async ({ sequence, vivaSessionId }) => {
      const { data } = await supabase
        .from("viva_transcript_segments")
        .select("id")
        .eq("viva_session_id", vivaSessionId)
        .eq("sequence", sequence);

      return ((data as Array<{ id: string }> | null) ?? []).length > 0;
    },
    saveSegment: async ({ sequence, text, vivaSessionId }) => {
      const { error } = await supabase.from("viva_transcript_segments").insert({
        sequence,
        text,
        viva_session_id: vivaSessionId,
      });

      if (error) {
        throw new Error("We could not save this part of the transcript.");
      }
    },
  };
}

const TRANSCRIPTION_ENDPOINT = "https://api.openai.com/v1/audio/transcriptions";

export function createOpenAiTranscriber(
  fetchImpl: typeof fetch = fetch,
): TranscribeAudio {
  return async ({ audio, fileName }) => {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not configured.");
    }

    const form = new FormData();
    form.append("file", audio, fileName);
    // Chunks are complete files, not a stream, so this is the file-transcription
    // model. `gpt-live-transcribe` is the one to reach for if the transcript
    // ever needs to keep up with the conversation rather than trail it.
    form.append(
      "model",
      process.env.AI_TRANSCRIPTION_MODEL ?? "gpt-transcribe",
    );
    form.append("response_format", "text");

    const response = await fetchImpl(TRANSCRIPTION_ENDPOINT, {
      body: form,
      headers: { Authorization: `Bearer ${apiKey}` },
      method: "POST",
    });

    if (!response.ok) {
      throw new Error(
        `Transcription failed with status ${response.status}.`,
      );
    }

    return response.text();
  };
}
