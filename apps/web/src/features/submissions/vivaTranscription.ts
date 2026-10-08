import type { SupabaseClient } from "@supabase/supabase-js";
import {
  attributeSpeakers,
  CHUNK_DURATION_MS,
  type AttributedUtterance,
  type RawUtterance,
} from "./speakerAttribution";
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
  /** Milliseconds into the recording at which the teacher pressed Ask. */
  findAskOffsetsMs?: (vivaSessionId: string) => Promise<number[]>;
  hasSegment: (input: TranscribeVivaChunkInput) => Promise<boolean>;
  saveUtterances?: (
    input: TranscribeVivaChunkInput & {
      utterances: readonly AttributedUtterance[];
    },
  ) => Promise<void>;
  saveSegment: (
    input: TranscribeVivaChunkInput & { text: string },
  ) => Promise<void>;
};

export type TranscribeAudio = (input: {
  audio: Blob;
  fileName: string;
}) => Promise<string>;

/** Like TranscribeAudio, but returns who spoke when. May throw; callers fall back. */
export type DiarizeAudio = (input: {
  audio: Blob;
  fileName: string;
}) => Promise<RawUtterance[]>;

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
  diarizeAudio?: DiarizeAudio,
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

    const file = {
      audio,
      fileName: buildChunkFileName(input, chunk.mimeType),
    };
    let rawUtterances: RawUtterance[] = [];

    if (diarizeAudio) {
      try {
        rawUtterances = await diarizeAudio(file);
      } catch {
        // Diarization is an enhancement: fall back to plain text below.
      }
    }

    const text = (
      rawUtterances.length > 0
        ? rawUtterances.map((utterance) => utterance.text.trim()).join(" ")
        : await transcribeAudio(file)
    ).trim();

    // Silence transcribes to an empty string, or to a hallucinated filler the
    // model emits when there is nothing to hear. An empty segment would only
    // add a gap to the transcript, so it is never stored.
    if (text === "") {
      return { outcome: "silent" };
    }

    await repository.saveSegment({ ...input, text });
    await saveAttribution(input, rawUtterances, repository);

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

// Best effort: the plain-text segment is already stored, so a failure here
// leaves the chunk readable, just without speakers.
async function saveAttribution(
  input: TranscribeVivaChunkInput,
  rawUtterances: readonly RawUtterance[],
  repository: VivaTranscriptionRepository,
): Promise<void> {
  if (rawUtterances.length === 0 || !repository.saveUtterances) {
    return;
  }

  try {
    const askOffsetsMs =
      (await repository.findAskOffsetsMs?.(input.vivaSessionId)) ?? [];
    const utterances = attributeSpeakers(
      rawUtterances.filter((utterance) => utterance.text.trim() !== ""),
      input.sequence * CHUNK_DURATION_MS,
      askOffsetsMs,
    );

    await repository.saveUtterances({ ...input, utterances });
  } catch {
    // Intentionally ignored; see above.
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
    findAskOffsetsMs: async (vivaSessionId) => {
      const { data } = await supabase
        .from("thread_entries")
        .select("elapsed_seconds")
        .eq("viva_session_id", vivaSessionId)
        .eq("kind", "asked");

      return (
        (data as Array<{ elapsed_seconds: number | null }> | null) ?? []
      )
        .filter((row) => row.elapsed_seconds !== null)
        .map((row) => (row.elapsed_seconds as number) * 1000);
    },
    saveUtterances: async ({ sequence, utterances, vivaSessionId }) => {
      const { error } = await supabase
        .from("viva_transcript_utterances")
        .upsert(
          utterances.map((utterance, position) => ({
            confidence: utterance.confidence,
            end_ms: Math.round(utterance.endMs),
            position,
            sequence,
            speaker: utterance.speaker,
            speaker_source: utterance.speakerSource,
            start_ms: Math.round(utterance.startMs),
            text: utterance.text,
            viva_session_id: vivaSessionId,
          })),
          {
            ignoreDuplicates: true,
            onConflict: "viva_session_id,sequence,position",
          },
        );

      if (error) {
        throw new Error("We could not save the speakers for this part.");
      }
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

const DIARIZATION_MODEL = "gpt-4o-transcribe-diarize";

export function createOpenAiDiarizer(
  fetchImpl: typeof fetch = fetch,
): DiarizeAudio {
  return async ({ audio, fileName }) => {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not configured.");
    }

    const form = new FormData();
    form.append("file", audio, fileName);
    form.append(
      "model",
      process.env.AI_DIARIZATION_MODEL ?? DIARIZATION_MODEL,
    );
    form.append("response_format", "diarized_json");
    form.append("chunking_strategy", "auto");

    const response = await fetchImpl(TRANSCRIPTION_ENDPOINT, {
      body: form,
      headers: { Authorization: `Bearer ${apiKey}` },
      method: "POST",
    });

    if (!response.ok) {
      throw new Error(`Diarization failed with status ${response.status}.`);
    }

    const body = (await response.json()) as {
      segments?: Array<{
        end: number;
        speaker: string;
        start: number;
        text: string;
      }>;
    };

    return (body.segments ?? []).map((segment) => ({
      endMs: Math.round(segment.end * 1000),
      providerSpeaker: segment.speaker,
      startMs: Math.round(segment.start * 1000),
      text: segment.text,
    }));
  };
}
