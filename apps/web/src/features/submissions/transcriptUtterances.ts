import type { SupabaseClient } from "@supabase/supabase-js";
import type { Speaker } from "./speakerAttribution";
import { buildQuestionWindows, type QuestionWindow } from "./talkTime";

export type StoredUtterance = {
  endMs: number;
  id: string;
  speaker: Speaker;
  speakerSource: "model" | "teacher";
  startMs: number;
  text: string;
};

export type AskedQuestionWindow = QuestionWindow & { prompt: string };

type UtteranceRow = {
  end_ms: number;
  id: string;
  speaker: Speaker;
  speaker_source: "model" | "teacher";
  start_ms: number;
  text: string;
};

export async function fetchStoredUtterances(
  supabase: SupabaseClient,
  vivaSessionId: string,
): Promise<StoredUtterance[]> {
  const { data, error } = await supabase
    .from("viva_transcript_utterances")
    .select("id, speaker, speaker_source, start_ms, end_ms, text")
    .eq("viva_session_id", vivaSessionId)
    .order("start_ms", { ascending: true });

  if (error) {
    throw new Error("We could not load the speakers for this transcript.");
  }

  return ((data as UtteranceRow[] | null) ?? []).map((row) => ({
    endMs: row.end_ms,
    id: row.id,
    speaker: row.speaker,
    speakerSource: row.speaker_source,
    startMs: row.start_ms,
    text: row.text,
  }));
}

type AskedRow = {
  elapsed_seconds: number | null;
  id: string;
  viva_questions:
    | { question_text: string }
    | Array<{ question_text: string }>
    | null;
};

/** Each Asked Question's span in the recording, in the order they were asked. */
export async function fetchAskedQuestionWindows(
  supabase: SupabaseClient,
  vivaSessionId: string,
): Promise<AskedQuestionWindow[]> {
  const { data, error } = await supabase
    .from("thread_entries")
    .select("id, elapsed_seconds, viva_questions(question_text)")
    .eq("viva_session_id", vivaSessionId)
    .eq("kind", "asked");

  if (error) {
    throw new Error("We could not load the Asked Questions.");
  }

  const rows = ((data as unknown as AskedRow[] | null) ?? []).filter(
    (row) => row.elapsed_seconds !== null,
  );
  const prompts = new Map(
    rows.map((row) => {
      const question = [row.viva_questions].flat()[0];

      return [row.id, question?.question_text ?? "Question"];
    }),
  );

  return buildQuestionWindows(
    rows.map((row) => ({
      id: row.id,
      startMs: (row.elapsed_seconds as number) * 1000,
    })),
  ).map((window) => ({ ...window, prompt: prompts.get(window.id) ?? "Question" }));
}

/**
 * The Teacher's correction. Marked `teacher` so it is what the transcript
 * shows from now on; chunk re-transcription only inserts missing rows and
 * ignores existing ones, so it cannot undo this.
 */
export async function correctUtteranceSpeaker(
  supabase: SupabaseClient,
  utteranceId: string,
  speaker: Speaker,
): Promise<void> {
  const { error } = await supabase
    .from("viva_transcript_utterances")
    .update({ speaker, speaker_source: "teacher" })
    .eq("id", utteranceId);

  if (error) {
    throw new Error("We could not save that correction.");
  }
}

