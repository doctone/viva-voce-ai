import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  correctUtteranceSpeaker,
  fetchAskedQuestionWindows,
} from "./transcriptUtterances";
import { createSupabaseVivaTranscriptionRepository } from "./vivaTranscription";

function chain(result: unknown) {
  const calls: Record<string, unknown[]> = {};
  const proxy: Record<string, unknown> = {};
  const handler = (name: string) =>
    (...args: unknown[]) => {
      calls[name] = args;
      return name === "eq" || name === "update" || name === "select" || name === "upsert"
        ? Object.assign(Promise.resolve(result), proxy)
        : proxy;
    };
  for (const name of ["select", "eq", "update", "upsert"]) proxy[name] = handler(name);
  return { calls, proxy };
}

describe("correctUtteranceSpeaker", () => {
  it("saves the speaker as a teacher correction", async () => {
    const { calls, proxy } = chain({ error: null });
    const supabase = { from: vi.fn(() => proxy) } as unknown as SupabaseClient;

    await correctUtteranceSpeaker(supabase, "u1", "student");

    expect(supabase.from).toHaveBeenCalledWith("viva_transcript_utterances");
    expect(calls.update).toEqual([{ speaker: "student", speaker_source: "teacher" }]);
    expect(calls.eq).toEqual(["id", "u1"]);
  });

  it("throws a readable error when saving fails", async () => {
    const { proxy } = chain({ error: { message: "nope" } });
    const supabase = { from: () => proxy } as unknown as SupabaseClient;

    await expect(correctUtteranceSpeaker(supabase, "u1", "teacher")).rejects.toThrow(
      "We could not save that correction.",
    );
  });
});

describe("re-transcription", () => {
  it("inserts utterances ignoring existing rows, so corrections survive", async () => {
    const { calls, proxy } = chain({ error: null });
    const repository = createSupabaseVivaTranscriptionRepository({
      from: () => proxy,
    } as unknown as SupabaseClient);

    await repository.saveUtterances?.({
      sequence: 0,
      utterances: [
        { confidence: 0.9, endMs: 1000, speaker: "teacher", speakerSource: "model", startMs: 0, text: "Hi" },
      ],
      vivaSessionId: "s1",
    });

    expect(calls.upsert?.[1]).toMatchObject({ ignoreDuplicates: true });
  });
});

describe("fetchAskedQuestionWindows", () => {
  it("builds windows from ask times, skipping asks with no time", async () => {
    const { proxy } = chain({
      data: [
        { elapsed_seconds: 60, id: "b", viva_questions: { question_text: "Second?" } },
        { elapsed_seconds: 5, id: "a", viva_questions: { question_text: "First?" } },
        { elapsed_seconds: null, id: "c", viva_questions: null },
      ],
      error: null,
    });
    const supabase = { from: () => proxy } as unknown as SupabaseClient;

    expect(await fetchAskedQuestionWindows(supabase, "s1")).toEqual([
      { endMs: 60_000, id: "a", prompt: "First?", startMs: 5_000 },
      { endMs: null, id: "b", prompt: "Second?", startMs: 60_000 },
    ]);
  });
});
