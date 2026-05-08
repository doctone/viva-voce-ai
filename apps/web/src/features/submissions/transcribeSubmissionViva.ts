import { openai } from "@ai-sdk/openai";
import { experimental_transcribe as transcribe } from "ai";
import { getSupabaseServerClient } from "../../utils/supabase-server";

export async function transcribeSubmissionViva({
  audioUrl,
  submissionVivaId,
}: {
  audioUrl: string;
  submissionVivaId: string;
}) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const audioResponse = await fetch(audioUrl);

  if (!audioResponse.ok) {
    throw new Error("We could not load the viva audio for transcription.");
  }

  const audioBuffer = await audioResponse.arrayBuffer();

  const modelName = process.env.AI_VIVA_TRANSCRIPTION_MODEL ?? "gpt-4o-mini-transcribe";
  const { text } = await transcribe({
    model: openai.transcription(modelName),
    audio: new Uint8Array(audioBuffer),
  });

  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("submission_viva")
    .update({ transcript: text })
    .eq("id", submissionVivaId);

  if (error) {
    throw new Error("We could not save the viva transcript.");
  }

  return { status: "completed" as const, submissionVivaId };
}
