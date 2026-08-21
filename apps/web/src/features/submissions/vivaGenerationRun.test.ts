import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  claimVivaGenerationRun,
  describeVivaGenerationFailure,
  GENERATION_STALE_AFTER_MS,
  isVivaGenerationRecordStale,
  readVivaGenerationRecord,
  resetVivaGenerationRuns,
  startVivaGenerationRun,
  writeVivaGenerationRecord,
  type VivaGenerationResult,
} from "./vivaGenerationRun";

const SUBMISSION_ID = "30420000-0000-0000-0000-000000000000";

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, reject, resolve };
}

describe("viva generation run", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    resetVivaGenerationRuns();
  });

  it("marks a run as running while it is in flight", () => {
    const deferred = createDeferred<VivaGenerationResult>();

    startVivaGenerationRun(SUBMISSION_ID, () => deferred.promise);

    expect(readVivaGenerationRecord(SUBMISSION_ID)).toEqual({
      startedAt: expect.any(Number),
      status: "running",
    });
  });

  it("records a completed run so a later page life does not restart it", async () => {
    await startVivaGenerationRun(SUBMISSION_ID, async () => ({
      status: "completed",
      submissionId: SUBMISSION_ID,
    }));

    expect(readVivaGenerationRecord(SUBMISSION_ID)).toEqual({
      status: "completed",
    });
  });

  it("keeps the failure message so a reload can still explain what went wrong", async () => {
    await startVivaGenerationRun(SUBMISSION_ID, async () => ({
      errorMessage: "Expected exactly 3 recommended questions.",
      status: "failed",
      submissionId: SUBMISSION_ID,
    }));

    expect(readVivaGenerationRecord(SUBMISSION_ID)).toEqual({
      errorMessage: "Expected exactly 3 recommended questions.",
      status: "failed",
    });
  });

  it("turns a thrown error into a recorded failure rather than a rejection", async () => {
    const result = await startVivaGenerationRun(SUBMISSION_ID, async () => {
      throw new Error("Network unreachable.");
    });

    expect(result).toEqual({
      errorMessage: "Network unreachable.",
      status: "failed",
      submissionId: SUBMISSION_ID,
    });
    expect(readVivaGenerationRecord(SUBMISSION_ID)).toEqual({
      errorMessage: "Network unreachable.",
      status: "failed",
    });
  });

  it("joins the run already in flight instead of generating twice", async () => {
    const deferred = createDeferred<VivaGenerationResult>();
    const generate = vi.fn(() => deferred.promise);

    const first = startVivaGenerationRun(SUBMISSION_ID, generate);
    const second = startVivaGenerationRun(SUBMISSION_ID, generate);

    expect(generate).toHaveBeenCalledTimes(1);

    deferred.resolve({ status: "completed", submissionId: SUBMISSION_ID });

    await expect(first).resolves.toEqual(await second);
  });

  it("hands the in-flight run to the page that mounts next", async () => {
    const deferred = createDeferred<VivaGenerationResult>();

    startVivaGenerationRun(SUBMISSION_ID, () => deferred.promise);

    expect(claimVivaGenerationRun(SUBMISSION_ID)).not.toBeNull();

    deferred.resolve({ status: "completed", submissionId: SUBMISSION_ID });
    await claimVivaGenerationRun(SUBMISSION_ID);

    // Once settled the record is the durable answer, so the promise is released.
    expect(claimVivaGenerationRun(SUBMISSION_ID)).toBeNull();
  });

  it("has no run to claim for a submission that never started one", () => {
    expect(claimVivaGenerationRun(SUBMISSION_ID)).toBeNull();
  });

  it("treats a run older than the stale cutoff as dead", () => {
    const startedAt = 1_000_000;

    expect(
      isVivaGenerationRecordStale(
        { startedAt, status: "running" },
        startedAt + GENERATION_STALE_AFTER_MS + 1,
      ),
    ).toBe(true);
    expect(
      isVivaGenerationRecordStale(
        { startedAt, status: "running" },
        startedAt + GENERATION_STALE_AFTER_MS,
      ),
    ).toBe(false);
  });

  it("never treats a settled run as stale", () => {
    expect(isVivaGenerationRecordStale({ status: "completed" }, Date.now())).toBe(
      false,
    );
    expect(
      isVivaGenerationRecordStale(
        { errorMessage: null, status: "failed" },
        Date.now(),
      ),
    ).toBe(false);
  });

  it("ignores a record it cannot trust", () => {
    expect(readVivaGenerationRecord(SUBMISSION_ID)).toBeNull();

    window.sessionStorage.setItem(`viva-generation:${SUBMISSION_ID}`, "not json");
    expect(readVivaGenerationRecord(SUBMISSION_ID)).toBeNull();

    window.sessionStorage.setItem(
      `viva-generation:${SUBMISSION_ID}`,
      JSON.stringify({ status: "running" }),
    );
    expect(readVivaGenerationRecord(SUBMISSION_ID)).toBeNull();

    window.sessionStorage.setItem(
      `viva-generation:${SUBMISSION_ID}`,
      JSON.stringify({ status: "elsewhere" }),
    );
    expect(readVivaGenerationRecord(SUBMISSION_ID)).toBeNull();
  });

  it("keeps records for different submissions apart", () => {
    const otherId = "30420000-0000-0000-0000-000000000001";

    writeVivaGenerationRecord(SUBMISSION_ID, { status: "completed" });

    expect(readVivaGenerationRecord(otherId)).toBeNull();
  });

  it("falls back to a plain explanation when the failure carries no message", () => {
    expect(
      describeVivaGenerationFailure({
        status: "failed",
        submissionId: SUBMISSION_ID,
      }),
    ).toBe("We saved the submission, but could not generate viva questions.");
  });

  it("prefers the reported message over the fallback", () => {
    expect(
      describeVivaGenerationFailure({
        errorMessage: "Submission not found.",
        status: "failed",
        submissionId: SUBMISSION_ID,
      }),
    ).toBe("Submission not found.");
  });
});
