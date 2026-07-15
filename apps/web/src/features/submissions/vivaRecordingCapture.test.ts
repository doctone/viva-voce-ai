import { describe, expect, it } from "vitest";
import {
  INITIAL_CHUNK_UPLOAD_TRACKER_STATE,
  RECORDING_MIME_TYPE_CANDIDATES,
  applyChunkUploadResult,
  buildRecordingChunkStoragePath,
  clampQuestionIndex,
  computeElapsedSeconds,
  formatElapsedDuration,
  formatSessionProgress,
  negotiateRecordingMimeType,
  transitionRecordingStatus,
  uploadRecordingChunk,
  type RecordingChunkRecord,
  type RecordingChunkRepository,
  type RecordingStatus,
  type UploadRecordingChunkResult,
} from "./vivaRecordingCapture";

describe("negotiateRecordingMimeType", () => {
  it("picks the first supported candidate in priority order", () => {
    const supported = new Set(["audio/webm", "audio/mp4"]);

    expect(
      negotiateRecordingMimeType((type) => supported.has(type)),
    ).toBe("audio/webm");
  });

  it("falls back to audio/mp4 when webm is unsupported (iOS Safari)", () => {
    const supported = new Set(["audio/mp4"]);

    expect(
      negotiateRecordingMimeType((type) => supported.has(type)),
    ).toBe("audio/mp4");
  });

  it("returns null when nothing in the candidate list is supported", () => {
    expect(negotiateRecordingMimeType(() => false)).toBeNull();
  });

  it("exposes webm-with-opus as the top priority candidate", () => {
    expect(RECORDING_MIME_TYPE_CANDIDATES[0]).toBe("audio/webm;codecs=opus");
  });
});

describe("buildRecordingChunkStoragePath", () => {
  it("builds a zero-padded, session-scoped path with a webm extension", () => {
    expect(
      buildRecordingChunkStoragePath("session-1", 3, "audio/webm;codecs=opus"),
    ).toBe("session-1/00003.webm");
  });

  it("uses an m4a extension for audio/mp4 (iOS Safari)", () => {
    expect(buildRecordingChunkStoragePath("session-1", 0, "audio/mp4")).toBe(
      "session-1/00000.m4a",
    );
  });

  it("uses an m4a extension for an audio/mp4 mimeType with codec parameters", () => {
    expect(
      buildRecordingChunkStoragePath(
        "session-1",
        0,
        "audio/mp4;codecs=mp4a.40.2",
      ),
    ).toBe("session-1/00000.m4a");
  });
});

describe("transitionRecordingStatus", () => {
  function transition(
    from: RecordingStatus,
    eventType:
      | "pause"
      | "permission_denied"
      | "permission_granted"
      | "resume"
      | "start_requested"
      | "stop",
  ): RecordingStatus {
    return transitionRecordingStatus(from, { type: eventType });
  }

  it("moves from idle to requesting permission on start", () => {
    expect(transition("idle", "start_requested")).toBe(
      "requesting_permission",
    );
  });

  it("moves to recording once permission is granted", () => {
    expect(transition("requesting_permission", "permission_granted")).toBe(
      "recording",
    );
  });

  it("ignores permission_granted unless requesting permission", () => {
    expect(transition("idle", "permission_granted")).toBe("idle");
    expect(transition("paused", "permission_granted")).toBe("paused");
  });

  it("moves to permission_denied when the mic is denied", () => {
    expect(transition("requesting_permission", "permission_denied")).toBe(
      "permission_denied",
    );
  });

  it("ignores permission_denied unless requesting permission", () => {
    expect(transition("idle", "permission_denied")).toBe("idle");
    expect(transition("recording", "permission_denied")).toBe("recording");
  });

  it("allows retrying the microphone prompt after a denial", () => {
    expect(transition("permission_denied", "start_requested")).toBe(
      "requesting_permission",
    );
  });

  it("pauses only while recording", () => {
    expect(transition("recording", "pause")).toBe("paused");
    expect(transition("idle", "pause")).toBe("idle");
  });

  it("resumes only while paused", () => {
    expect(transition("paused", "resume")).toBe("recording");
    expect(transition("idle", "resume")).toBe("idle");
    expect(transition("stopped", "resume")).toBe("stopped");
  });

  it("stops from recording or paused", () => {
    expect(transition("recording", "stop")).toBe("stopped");
    expect(transition("paused", "stop")).toBe("stopped");
    expect(transition("idle", "stop")).toBe("idle");
  });

  it("ignores start_requested once already recording", () => {
    expect(transition("recording", "start_requested")).toBe("recording");
  });
});

function createFakeRepository(): RecordingChunkRepository & {
  chunks: RecordingChunkRecord[];
  insertCallCount: number;
  uploadCallCount: number;
} {
  const chunks: RecordingChunkRecord[] = [];
  let insertCallCount = 0;
  let uploadCallCount = 0;
  let nextUploadShouldFail = false;

  return {
    chunks,
    get insertCallCount() {
      return insertCallCount;
    },
    get uploadCallCount() {
      return uploadCallCount;
    },
    failNextUpload() {
      nextUploadShouldFail = true;
    },
    async uploadBlob() {
      uploadCallCount += 1;

      if (nextUploadShouldFail) {
        nextUploadShouldFail = false;
        return { errorMessage: "Network error" };
      }

      return { errorMessage: null };
    },
    async insertChunkRecord(input) {
      insertCallCount += 1;

      const existing = chunks.find(
        (chunk) =>
          chunk.vivaSessionId === input.vivaSessionId &&
          chunk.sequence === input.sequence,
      );

      if (existing) {
        return existing;
      }

      const chunk: RecordingChunkRecord = {
        createdAt: "2026-07-15T09:00:00.000Z",
        id: `chunk-${chunks.length + 1}`,
        mimeType: input.mimeType,
        sequence: input.sequence,
        storagePath: input.storagePath,
        vivaSessionId: input.vivaSessionId,
      };

      chunks.push(chunk);

      return chunk;
    },
  } as RecordingChunkRepository & {
    chunks: RecordingChunkRecord[];
    failNextUpload: () => void;
    insertCallCount: number;
    uploadCallCount: number;
  };
}

const chunkInput = {
  blob: new Blob(["audio-bytes"]),
  mimeType: "audio/webm;codecs=opus",
  sequence: 0,
  vivaSessionId: "session-1",
};

describe("uploadRecordingChunk", () => {
  it("uploads the blob then records the chunk", async () => {
    const repository = createFakeRepository();

    const result = await uploadRecordingChunk(chunkInput, repository);

    expect(result.outcome).toBe("uploaded");
    expect(repository.uploadCallCount).toBe(1);
    expect(repository.insertCallCount).toBe(1);
    expect(repository.chunks[0].storagePath).toBe(
      "session-1/00000.webm",
    );
  });

  it("fails without inserting a record when the upload itself fails", async () => {
    const repository = createFakeRepository();
    (repository as unknown as { failNextUpload: () => void }).failNextUpload();

    const result = await uploadRecordingChunk(chunkInput, repository);

    expect(result).toEqual({ outcome: "failed", reason: "Network error" });
    expect(repository.insertCallCount).toBe(0);
  });

  it("retrying a failed upload succeeds without duplicating the chunk", async () => {
    const repository = createFakeRepository();
    (repository as unknown as { failNextUpload: () => void }).failNextUpload();

    const first = await uploadRecordingChunk(chunkInput, repository);
    const second = await uploadRecordingChunk(chunkInput, repository);

    expect(first.outcome).toBe("failed");
    expect(second.outcome).toBe("uploaded");
    expect(repository.chunks).toHaveLength(1);
  });

  it("treats a duplicate insert (retry racing a prior success) as uploaded, not failed", async () => {
    const repository = createFakeRepository();

    await uploadRecordingChunk(chunkInput, repository);
    const retry = await uploadRecordingChunk(chunkInput, repository);

    expect(retry.outcome).toBe("uploaded");
    expect(repository.chunks).toHaveLength(1);
  });

  it("fails with a friendly message when the insert throws", async () => {
    const repository: RecordingChunkRepository = {
      async uploadBlob() {
        return { errorMessage: null };
      },
      async insertChunkRecord() {
        throw new Error("boom");
      },
    };

    const result = await uploadRecordingChunk(chunkInput, repository);

    expect(result).toEqual({ outcome: "failed", reason: "boom" });
  });
});

describe("applyChunkUploadResult", () => {
  const uploaded: UploadRecordingChunkResult = {
    chunk: {
      createdAt: "2026-07-15T09:00:00.000Z",
      id: "chunk-1",
      mimeType: "audio/webm",
      sequence: 2,
      storagePath: "session-1/00002.webm",
      vivaSessionId: "session-1",
    },
    outcome: "uploaded",
  };
  const failed: UploadRecordingChunkResult = {
    outcome: "failed",
    reason: "Network error",
  };

  it("starts with no failed or uploaded chunks", () => {
    expect(INITIAL_CHUNK_UPLOAD_TRACKER_STATE).toEqual({
      failedSequences: [],
      uploadedSequences: [],
    });
  });

  it("tracks a failed sequence", () => {
    const state = applyChunkUploadResult(
      INITIAL_CHUNK_UPLOAD_TRACKER_STATE,
      2,
      failed,
    );

    expect(state.failedSequences).toEqual([2]);
    expect(state.uploadedSequences).toEqual([]);
  });

  it("moves a sequence from failed to uploaded on a successful retry", () => {
    const afterFailure = applyChunkUploadResult(
      INITIAL_CHUNK_UPLOAD_TRACKER_STATE,
      2,
      failed,
    );
    const afterRetry = applyChunkUploadResult(afterFailure, 2, uploaded);

    expect(afterRetry.failedSequences).toEqual([]);
    expect(afterRetry.uploadedSequences).toEqual([2]);
  });

  it("does not duplicate a sequence already marked uploaded", () => {
    const once = applyChunkUploadResult(
      INITIAL_CHUNK_UPLOAD_TRACKER_STATE,
      2,
      uploaded,
    );
    const twice = applyChunkUploadResult(once, 2, uploaded);

    expect(twice.uploadedSequences).toEqual([2]);
  });

  it("leaves unrelated sequences untouched when updating one sequence", () => {
    const withTwoFailures = applyChunkUploadResult(
      applyChunkUploadResult(INITIAL_CHUNK_UPLOAD_TRACKER_STATE, 1, failed),
      2,
      failed,
    );

    const afterSecondSucceeds = applyChunkUploadResult(
      withTwoFailures,
      2,
      uploaded,
    );

    expect(afterSecondSucceeds.failedSequences).toEqual([1]);
    expect(afterSecondSucceeds.uploadedSequences).toEqual([2]);
  });

  it("leaves other uploaded sequences untouched when a different sequence fails", () => {
    const withTwoUploaded = applyChunkUploadResult(
      applyChunkUploadResult(INITIAL_CHUNK_UPLOAD_TRACKER_STATE, 1, uploaded),
      2,
      uploaded,
    );

    const afterSecondFails = applyChunkUploadResult(withTwoUploaded, 2, failed);

    expect(afterSecondFails.uploadedSequences).toEqual([1]);
    expect(afterSecondFails.failedSequences).toEqual([2]);
  });
});

describe("formatSessionProgress", () => {
  it("formats the current position out of the total", () => {
    expect(formatSessionProgress(0, 5)).toBe("Question 1 of 5");
    expect(formatSessionProgress(4, 5)).toBe("Question 5 of 5");
  });

  it("describes an empty question set", () => {
    expect(formatSessionProgress(0, 0)).toBe(
      "No planned questions in this Viva Question Set.",
    );
  });
});

describe("clampQuestionIndex", () => {
  it("clamps below zero up to zero", () => {
    expect(clampQuestionIndex(-1, 5)).toBe(0);
  });

  it("clamps above the last index down to the last index", () => {
    expect(clampQuestionIndex(10, 5)).toBe(4);
  });

  it("leaves an in-range index unchanged", () => {
    expect(clampQuestionIndex(2, 5)).toBe(2);
  });

  it("returns zero when there are no questions", () => {
    expect(clampQuestionIndex(3, 0)).toBe(0);
  });
});

describe("computeElapsedSeconds", () => {
  it("computes whole seconds between start and now", () => {
    const startedAt = "2026-07-15T09:00:00.000Z";
    const now = new Date("2026-07-15T09:01:30.000Z");

    expect(computeElapsedSeconds(startedAt, now)).toBe(90);
  });

  it("never returns a negative duration", () => {
    const startedAt = "2026-07-15T09:01:00.000Z";
    const now = new Date("2026-07-15T09:00:00.000Z");

    expect(computeElapsedSeconds(startedAt, now)).toBe(0);
  });
});

describe("formatElapsedDuration", () => {
  it("formats seconds as mm:ss", () => {
    expect(formatElapsedDuration(0)).toBe("00:00");
    expect(formatElapsedDuration(65)).toBe("01:05");
    expect(formatElapsedDuration(3599)).toBe("59:59");
  });
});
