/**
 * Tracks a viva generation run across the page lives that can observe it.
 *
 * A run is started on the new-submission page and consumed on the submission
 * detail page, so the awaitable promise and the durable record serve different
 * readers: the promise survives a client-side navigation and carries the real
 * error message, while the record survives a reload, which the promise cannot.
 */

export type VivaGenerationResult = {
  errorMessage?: string;
  status: "completed" | "failed";
  submissionId: string;
};

export type VivaGenerationRecord =
  | { startedAt: number; status: "running" }
  | { status: "completed" }
  | { errorMessage: string | null; status: "failed" };

const RECORD_KEY_PREFIX = "viva-generation:";

/**
 * How long a `running` record stays believable. A reload abandons the promise
 * but the server function keeps writing questions, so a run inside this window
 * is recovered by polling rather than restarted. Past it, assume the run died
 * with the page that started it.
 */
export const GENERATION_STALE_AFTER_MS = 3 * 60 * 1000;

/** Poll cadence while waiting on a run this page life cannot await. */
export const RECOVERED_GENERATION_POLL_MS = 2000;

const GENERIC_FAILURE_MESSAGE =
  "We saved the submission, but could not generate viva questions.";

const inFlightRuns = new Map<string, Promise<VivaGenerationResult>>();

function recordKey(submissionId: string) {
  return `${RECORD_KEY_PREFIX}${submissionId}`;
}

export function writeVivaGenerationRecord(
  submissionId: string,
  record: VivaGenerationRecord,
) {
  try {
    window.sessionStorage.setItem(recordKey(submissionId), JSON.stringify(record));
  } catch {
    // Storage can be unavailable (private mode, blocked cookies). The record is
    // an optimisation against duplicate generation, never a correctness gate.
  }
}

export function readVivaGenerationRecord(
  submissionId: string,
): VivaGenerationRecord | null {
  try {
    const raw = window.sessionStorage.getItem(recordKey(submissionId));

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as VivaGenerationRecord;

    if (parsed.status === "running" && typeof parsed.startedAt !== "number") {
      return null;
    }

    if (
      parsed.status !== "running" &&
      parsed.status !== "completed" &&
      parsed.status !== "failed"
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function isVivaGenerationRecordStale(
  record: VivaGenerationRecord,
  now: number,
) {
  return (
    record.status === "running" &&
    now - record.startedAt > GENERATION_STALE_AFTER_MS
  );
}

export function describeVivaGenerationFailure(result: VivaGenerationResult) {
  return result.errorMessage ?? GENERIC_FAILURE_MESSAGE;
}

/**
 * Starts a run and keeps it awaitable for whichever page mounts next. Calling
 * twice for the same submission joins the run in flight rather than starting a
 * second one, so a fast double navigation cannot duplicate generation.
 */
export function startVivaGenerationRun(
  submissionId: string,
  generate: (submissionId: string) => Promise<VivaGenerationResult>,
): Promise<VivaGenerationResult> {
  const inFlight = inFlightRuns.get(submissionId);

  if (inFlight) {
    return inFlight;
  }

  writeVivaGenerationRecord(submissionId, {
    startedAt: Date.now(),
    status: "running",
  });

  const run = generate(submissionId).then(
    (result) => {
      // The record is written before the run leaves the map so a consumer that
      // just missed the promise always finds a settled record instead of a gap.
      writeVivaGenerationRecord(
        submissionId,
        result.status === "failed"
          ? { errorMessage: describeVivaGenerationFailure(result), status: "failed" }
          : { status: "completed" },
      );
      inFlightRuns.delete(submissionId);

      return result;
    },
    (error: unknown) => {
      const errorMessage =
        error instanceof Error ? error.message : GENERIC_FAILURE_MESSAGE;

      writeVivaGenerationRecord(submissionId, { errorMessage, status: "failed" });
      inFlightRuns.delete(submissionId);

      return { errorMessage, status: "failed", submissionId } satisfies VivaGenerationResult;
    },
  );

  inFlightRuns.set(submissionId, run);

  return run;
}

/** The run in flight for this submission, if one outlived the page that began it. */
export function claimVivaGenerationRun(submissionId: string) {
  return inFlightRuns.get(submissionId) ?? null;
}

/** Test seam — the registry is module state that would otherwise leak between tests. */
export function resetVivaGenerationRuns() {
  inFlightRuns.clear();
}
