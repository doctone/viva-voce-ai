import { describe, expect, it, vi } from "vitest";
import {
  assessRecordingQuality,
  createTimedTranscriber,
  enqueueRecordingTranscription,
  formatTimestamp,
  isUncertain,
  parseVerboseTranscription,
  processRecordingTranscription,
  type RecordingTranscriptSegment,
  type RecordingTranscriptionRepository,
  type TranscriptionJob,
} from "./recordingTranscript";

const teacher = { userId: "teacher-1" };
const anonymous = { userId: null };

const segment = (
  startSeconds: number,
  endSeconds: number,
  text: string,
  confidence: number | null = 0.9,
): RecordingTranscriptSegment => ({ confidence, endSeconds, startSeconds, text });

function createRepository(
  overrides: Partial<RecordingTranscriptionRepository> & {
    job?: Partial<TranscriptionJob>;
  } = {},
) {
  const { job: jobOverrides, ...rest } = overrides;
  const job: TranscriptionJob = {
    attempts: 0,
    durationSeconds: null,
    errorMessage: null,
    id: "job-1",
    status: "queued",
    ...jobOverrides,
  };
  const calls = {
    completed: [] as Array<number | null>,
    failed: [] as string[],
    segments: [] as RecordingTranscriptSegment[][],
  };
  const repository: RecordingTranscriptionRepository = {
    claimJob: async () => true,
    downloadAudio: async () => new Blob(["audio"]),
    findOrCreateJob: async () => job,
    findRecording: async () => ({ audioPath: "a/b.webm", fileName: "b.webm" }),
    markCompleted: async (_id, duration) => {
      calls.completed.push(duration);
    },
    markFailed: async (_id, message) => {
      calls.failed.push(message);
    },
    replaceSegments: async (_id, segments) => {
      calls.segments.push([...segments]);
    },
    requeue: async (failed) => ({ ...failed, status: "queued" }),
    ...rest,
  };

  return { calls, repository };
}

describe("enqueueRecordingTranscription", () => {
  it("queues a new job for a recording", async () => {
    const { repository } = createRepository();

    const result = await enqueueRecordingTranscription("viva-1", teacher, repository);

    expect(result).toMatchObject({ job: { status: "queued" }, outcome: "unchanged" });
  });

  it("rejects an unauthenticated requester without touching the recording", async () => {
    const findRecording = vi.fn(async () => null);
    const { repository } = createRepository({ findRecording });

    expect(await enqueueRecordingTranscription("viva-1", anonymous, repository)).toEqual({
      outcome: "unauthorized",
    });
    expect(findRecording).not.toHaveBeenCalled();
  });

  it("reports a recording that does not exist", async () => {
    const { repository } = createRepository({ findRecording: async () => null });

    expect(await enqueueRecordingTranscription("viva-1", teacher, repository)).toEqual({
      outcome: "missing_recording",
    });
  });

  it.each(["queued", "processing", "completed"] as const)(
    "is idempotent for a %s job",
    async (status) => {
      const requeue = vi.fn();
      const { repository } = createRepository({ job: { status }, requeue });

      const result = await enqueueRecordingTranscription("viva-1", teacher, repository);

      expect(result).toMatchObject({ job: { status }, outcome: "unchanged" });
      expect(requeue).not.toHaveBeenCalled();
    },
  );

  it("retries a failed job by putting it back in the queue", async () => {
    const { repository } = createRepository({ job: { status: "failed" } });

    const result = await enqueueRecordingTranscription("viva-1", teacher, repository);

    expect(result).toMatchObject({ job: { status: "queued" }, outcome: "queued" });
  });
});

describe("processRecordingTranscription", () => {
  const transcribe = async () => ({
    durationSeconds: 12,
    segments: [segment(0, 4, "Hello")],
  });

  it("stores timed segments and completes the job", async () => {
    const { calls, repository } = createRepository();

    const result = await processRecordingTranscription("viva-1", teacher, repository, transcribe);

    expect(result).toEqual({ outcome: "completed" });
    expect(calls.segments).toEqual([[segment(0, 4, "Hello")]]);
    expect(calls.completed).toEqual([12]);
    expect(calls.failed).toEqual([]);
  });

  it("rejects an unauthenticated requester", async () => {
    const downloadAudio = vi.fn();
    const { repository } = createRepository({ downloadAudio });

    expect(
      await processRecordingTranscription("viva-1", anonymous, repository, transcribe),
    ).toEqual({ outcome: "unauthorized" });
    expect(downloadAudio).not.toHaveBeenCalled();
  });

  it("fails the job when the audio is missing", async () => {
    const { calls, repository } = createRepository({ downloadAudio: async () => null });

    const result = await processRecordingTranscription("viva-1", teacher, repository, transcribe);

    expect(result).toEqual({
      errorMessage: "The recording's audio could not be found.",
      outcome: "failed",
    });
    expect(calls.failed).toEqual(["The recording's audio could not be found."]);
    expect(calls.completed).toEqual([]);
  });

  it("records a provider failure on the job instead of throwing", async () => {
    const { calls, repository } = createRepository();

    const result = await processRecordingTranscription("viva-1", teacher, repository, async () => {
      throw new Error("Transcription failed with status 503.");
    });

    expect(result).toEqual({
      errorMessage: "Transcription failed with status 503.",
      outcome: "failed",
    });
    expect(calls.failed).toEqual(["Transcription failed with status 503."]);
  });

  it("reports a missing recording", async () => {
    const { repository } = createRepository({ findRecording: async () => null });

    expect(
      await processRecordingTranscription("viva-1", teacher, repository, transcribe),
    ).toEqual({ outcome: "missing_recording" });
  });

  it.each(["processing", "completed", "failed"] as const)(
    "does not run a %s job again",
    async (status) => {
      const transcribeSpy = vi.fn(transcribe);
      const { repository } = createRepository({ job: { status } });

      const result = await processRecordingTranscription("viva-1", teacher, repository, transcribeSpy);

      expect(result).toEqual({ outcome: "not_runnable", status });
      expect(transcribeSpy).not.toHaveBeenCalled();
    },
  );

  it("does not run when another worker claimed the job first", async () => {
    const transcribeSpy = vi.fn(transcribe);
    const { repository } = createRepository({ claimJob: async () => false });

    const result = await processRecordingTranscription("viva-1", teacher, repository, transcribeSpy);

    expect(result).toEqual({ outcome: "not_runnable", status: "processing" });
    expect(transcribeSpy).not.toHaveBeenCalled();
  });
});

describe("reading the transcript", () => {
  it("flags only passages below the confidence threshold", () => {
    expect(isUncertain(segment(0, 1, "x", 0.59))).toBe(true);
    expect(isUncertain(segment(0, 1, "x", 0.6))).toBe(false);
    expect(isUncertain(segment(0, 1, "x", null))).toBe(false);
  });

  it("warns when no speech was detected", () => {
    expect(assessRecordingQuality([], 60).map((w) => w.kind)).toEqual(["no_speech"]);
  });

  it("warns when the recording is mostly silent", () => {
    expect(assessRecordingQuality([segment(0, 10, "hi")], 100).map((w) => w.kind)).toEqual([
      "mostly_silent",
    ]);
    expect(assessRecordingQuality([segment(0, 30, "hi")], 100)).toEqual([]);
    expect(assessRecordingQuality([segment(0, 1, "hi")], null)).toEqual([]);
  });

  it("warns when many passages are uncertain", () => {
    const shaky = [segment(0, 5, "a", 0.3), segment(5, 10, "b", 0.3), segment(10, 15, "c")];
    expect(assessRecordingQuality(shaky, 15).map((w) => w.kind)).toEqual(["low_confidence"]);

    const mostlyFine = [segment(0, 5, "a", 0.3), segment(5, 10, "b"), segment(10, 15, "c")];
    expect(assessRecordingQuality(mostlyFine, 15)).toEqual([]);
  });

  it("formats timestamps as mm:ss", () => {
    expect(formatTimestamp(0)).toBe("00:00");
    expect(formatTimestamp(65.9)).toBe("01:05");
    expect(formatTimestamp(-3)).toBe("00:00");
  });
});

describe("parseVerboseTranscription", () => {
  it("maps provider segments, converting log-probability to confidence", () => {
    const parsed = parseVerboseTranscription({
      duration: 30.5,
      segments: [
        { avg_logprob: Math.log(0.8), end: 4, start: 0, text: " Hello there " },
        { end: 9, start: 4, text: "   " },
        { end: 12, start: 9, text: "No score" },
      ],
    });

    expect(parsed.durationSeconds).toBe(30.5);
    expect(parsed.segments).toHaveLength(2);
    expect(parsed.segments[0]).toMatchObject({ endSeconds: 4, startSeconds: 0, text: "Hello there" });
    expect(parsed.segments[0].confidence).toBeCloseTo(0.8);
    expect(parsed.segments[1].confidence).toBeNull();
  });

  it("tolerates a response without segments or duration", () => {
    expect(parseVerboseTranscription({})).toEqual({ durationSeconds: null, segments: [] });
  });
});

describe("createTimedTranscriber", () => {
  it("surfaces a provider error status", async () => {
    vi.stubEnv("OPENAI_API_KEY", "key");
    const transcriber = createTimedTranscriber(
      vi.fn(async () => new Response("no", { status: 503 })),
    );

    await expect(transcriber({ audio: new Blob(["a"]), fileName: "a.webm" })).rejects.toThrow(
      "status 503",
    );
    vi.unstubAllEnvs();
  });

  it("fails clearly when no API key is configured", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const transcriber = createTimedTranscriber(vi.fn());

    await expect(transcriber({ audio: new Blob(["a"]), fileName: "a.webm" })).rejects.toThrow(
      "OPENAI_API_KEY",
    );
    vi.unstubAllEnvs();
  });
});
